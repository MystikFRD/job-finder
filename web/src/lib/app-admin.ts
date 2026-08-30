import { queryOne } from "./db";

function parseUnlimitedUserIds(): Set<string> {
  const raw = process.env.MANUAL_RUN_UNLIMITED_USER_IDS ?? "";
  return new Set(
    raw
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );
}

/** Server admins who can see infra setup hints (same list as unlimited manual runs). */
export async function isAppAdmin(userId: string): Promise<boolean> {
  if (parseUnlimitedUserIds().has(userId)) return true;

  const emails = (process.env.MANUAL_RUN_UNLIMITED_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (!emails.length) return false;

  const row = await queryOne<{ email: string }>(
    `SELECT email FROM users WHERE id = $1`,
    [userId],
  );
  return row ? emails.includes(row.email.toLowerCase()) : false;
}
