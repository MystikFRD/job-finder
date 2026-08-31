import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { requireUserId } from "./auth";
import { queryOne } from "./db";
import { classifyEmail } from "./assistant";

const RECRUITING_KEYWORDS =
  /bewerbung|application|interview|stelle|position|recruiting|karriere|vielen dank|einladung|angebot|absage|reject|eingangsbestätigung|eingangsbestaetigung|empfangsbestätigung|empfangsbestaetigung|zustellbestätigung|lesebestätigung|eingegangen|we have received|confirmation of receipt|acknowledg(e|ement)|auto[- ]?reply|automatische (antwort|bestätigung)/i;

const RECEIPT_CONFIRMATION =
  /eingangsbestätigung|eingangsbestaetigung|empfangsbestätigung|empfangsbestaetigung|zustellbestätigung|lesebestätigung|application received|confirmation of (receipt|your application)|receipt of your application|confirm(ing|s)? (the )?receipt|we (have )?received your (application|cv|resume|documents|email|message)|wir haben ihre (bewerbung|unterlagen|e-?mail|nachricht) erhalten|wir bestätigen den eingang|ihre (bewerbung|unterlagen|e-?mail|nachricht) (ist|sind) (erfolgreich )?bei uns eingegangen|dies ist eine automatische (bestätigung|antwort|eingangsbestätigung)|automatische eingangsbestätigung/i;

const HIRING_DECISION =
  /\b(absage|leider|abgelehnt|reject(?:ed|ion)?|unsuccessful|we will not (be )?(proceed|move forward)|not (be )?successful|einladung zum (gespräch|interview|vorstellungsgespräch)|interview invitation|jobangebot|offer of employment|assessment|einstellungstest)\b/i;

const CATEGORY_ALIASES: Record<string, string> = {
  eingangsbestaetigung: "application_received",
  empfangsbestaetigung: "application_received",
  zustellbestaetigung: "application_received",
  lesebestaetigung: "application_received",
  receipt_confirmation: "application_received",
  receipt: "application_received",
  acknowledgement: "application_received",
  acknowledgment: "application_received",
  auto_reply: "application_received",
};

export function normalizeEmailCategory(category: string): string {
  const key = category
    .toLowerCase()
    .trim()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[\s-]+/g, "_");
  return CATEGORY_ALIASES[key] ?? category;
}

export function detectApplicationReceipt(
  from: string,
  subject: string,
  body: string,
): {
  category: "application_received";
  confidence: number;
  summary: string;
  suggested_action: string;
} | null {
  const text = `${from}\n${subject}\n${body}`;
  if (!RECEIPT_CONFIRMATION.test(text) || HIRING_DECISION.test(text)) return null;
  return {
    category: "application_received",
    confidence: 0.92,
    summary: "Eingangsbestätigung — Bewerbung oder Nachricht wurde bestätigt, ohne Entscheidung.",
    suggested_action: "Status auf waiting setzen und auf weitere Rückmeldung warten.",
  };
}

export interface EmailSettings {
  id: string;
  imap_host: string | null;
  imap_port: number;
  imap_user: string | null;
  imap_password: string | null;
  imap_secure: boolean;
  scan_enabled: boolean;
  auto_update_min_confidence: number;
}

export async function getEmailSettings(): Promise<EmailSettings | null> {
  const userId = await requireUserId();
  return queryOne<EmailSettings>(
    `SELECT id, imap_host, imap_port, imap_user, imap_password, imap_secure,
            scan_enabled, auto_update_min_confidence
     FROM email_settings WHERE user_id = $1`,
    [userId],
  );
}

export async function updateEmailSettings(data: Partial<EmailSettings>) {
  const userId = await requireUserId();
  const existing = await getEmailSettings();
  if (!existing) return null;

  if (data.imap_password === "" || data.imap_password === undefined) {
    return queryOne(
      `UPDATE email_settings SET
         imap_host = coalesce($2, imap_host),
         imap_port = coalesce($3, imap_port),
         imap_user = coalesce($4, imap_user),
         imap_secure = coalesce($5, imap_secure),
         scan_enabled = coalesce($6, scan_enabled),
         auto_update_min_confidence = coalesce($7, auto_update_min_confidence),
         updated_at = timezone('utc', now())
       WHERE id = $1 AND user_id = $8 RETURNING id`,
      [
        existing.id,
        data.imap_host,
        data.imap_port,
        data.imap_user,
        data.imap_secure,
        data.scan_enabled,
        data.auto_update_min_confidence,
        userId,
      ],
    );
  }

  return queryOne(
    `UPDATE email_settings SET
       imap_host = coalesce($2, imap_host),
       imap_port = coalesce($3, imap_port),
       imap_user = coalesce($4, imap_user),
       imap_password = $5,
       imap_secure = coalesce($6, imap_secure),
       scan_enabled = coalesce($7, scan_enabled),
       auto_update_min_confidence = coalesce($8, auto_update_min_confidence),
       updated_at = timezone('utc', now())
     WHERE id = $1 AND user_id = $9 RETURNING id`,
    [
      existing.id,
      data.imap_host,
      data.imap_port,
      data.imap_user,
      data.imap_password,
      data.imap_secure,
      data.scan_enabled,
      data.auto_update_min_confidence,
      userId,
    ],
  );
}

export async function syncEmails(maxMessages = 30) {
  const settings = await getEmailSettings();
  if (!settings?.imap_host || !settings.imap_user || !settings.imap_password) {
    throw new Error("IMAP not configured. Set email settings in Settings.");
  }

  const client = new ImapFlow({
    host: settings.imap_host,
    port: settings.imap_port ?? 993,
    secure: settings.imap_secure ?? true,
    auth: {
      user: settings.imap_user,
      pass: settings.imap_password,
    },
    logger: false,
  });

  const results: { stored: number; skipped: number; errors: string[] } = {
    stored: 0,
    skipped: 0,
    errors: [],
  };

  await client.connect();
  try {
    const lock = await client.getMailboxLock("INBOX");
    try {
      const since = new Date();
      since.setDate(since.getDate() - 14);

      const uids = await client.search({ seen: false, since }, { uid: true });
      const uidList = Array.isArray(uids) ? uids : [];

      for (const uid of uidList) {
        if (results.stored + results.skipped >= maxMessages) break;
        const msg = await client.fetchOne(uid, { source: true }, { uid: true });
        if (!msg || !msg.source) continue;
        try {
          const parsed = await simpleParser(msg.source);
          const from = parsed.from?.text ?? "";
          const subject = parsed.subject ?? "";
          const body = parsed.text ?? parsed.html?.toString() ?? "";
          const messageId = parsed.messageId ?? `uid-${uid}`;
          const receivedAt = parsed.date ?? new Date();

          if (!RECRUITING_KEYWORDS.test(`${subject} ${body}`)) {
            results.skipped++;
            continue;
          }

          const classified =
            detectApplicationReceipt(from, subject, body) ??
            (await classifyEmail(from, subject, body));
          const classification = {
            ...classified,
            category: normalizeEmailCategory(classified.category),
          };

          await queryOne(
            `SELECT id FROM store_classified_email(
              $1, $2, $3, $4, $5, $6, $7, $8, NULL
            )`,
            [
              messageId,
              from,
              settings.imap_user,
              subject,
              body.slice(0, 50000),
              receivedAt.toISOString(),
              classification.category,
              classification.confidence,
            ],
          );
          results.stored++;
        } catch (err) {
          results.errors.push(err instanceof Error ? err.message : "parse error");
        }
      }
    } finally {
      lock.release();
    }

    await queryOne(
      `UPDATE email_settings SET last_scan_at = timezone('utc', now()), last_scan_status = 'success', last_scan_error = NULL WHERE id = $1`,
      [settings.id],
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "IMAP error";
    await queryOne(
      `UPDATE email_settings SET last_scan_at = timezone('utc', now()), last_scan_status = 'failed', last_scan_error = $2 WHERE id = $1`,
      [settings.id, message],
    );
    throw err;
  } finally {
    await client.logout();
  }

  return results;
}
