export type CoverLetterMeta = {
  applicantName?: string | null;
  applicantLocation?: string | null;
  applicantEmail?: string | null;
  applicantPhone?: string | null;
  company?: string | null;
  jobTitle?: string | null;
};

export type CoverLetterLineStyle = "sender" | "recipient" | "date" | "subject" | "salutation" | "body" | "closing" | "signature" | "spacer";

export type StyledLine = {
  text: string;
  style: CoverLetterLineStyle;
};

const SUBJECT_PREFIX = /^betreff\s*:/i;
const SALUTATION_PREFIX = /^sehr geehrte/i;
const CLOSING_PREFIX = /^(mit freundlichen grüßen|freundliche grüße|viele grüße)/i;

export function normalizeLetterContent(content: string): string {
  return content.replace(/\r\n/g, "\n").trim();
}

export function styleCoverLetterLines(content: string, meta?: CoverLetterMeta): StyledLine[] {
  const lines = normalizeLetterContent(content).split("\n");
  const styled: StyledLine[] = [];
  let phase: "header" | "body" | "closing" = "header";
  let seenSalutation = false;

  for (const raw of lines) {
    const text = raw.trimEnd();
    const trimmed = text.trim();

    if (!trimmed) {
      styled.push({ text: "", style: "spacer" });
      continue;
    }

    if (SUBJECT_PREFIX.test(trimmed)) {
      phase = "body";
      styled.push({ text: trimmed, style: "subject" });
      continue;
    }

    if (SALUTATION_PREFIX.test(trimmed)) {
      phase = "body";
      seenSalutation = true;
      styled.push({ text: trimmed, style: "salutation" });
      continue;
    }

    if (CLOSING_PREFIX.test(trimmed)) {
      phase = "closing";
      styled.push({ text: trimmed, style: "closing" });
      continue;
    }

    if (phase === "closing") {
      styled.push({ text: trimmed, style: "signature" });
      continue;
    }

    if (!seenSalutation && phase === "header") {
      const style: CoverLetterLineStyle =
        styled.filter((l) => l.style !== "spacer").length <= 2 ? "sender" : "recipient";
      styled.push({ text: trimmed, style });
      continue;
    }

    styled.push({ text: trimmed, style: "body" });
  }

  if (styled.length === 0 && meta) {
    return buildFallbackLayout(meta, content);
  }

  return styled;
}

function buildFallbackLayout(meta: CoverLetterMeta, content: string): StyledLine[] {
  const today = new Date().toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const lines: StyledLine[] = [];

  if (meta.applicantName) lines.push({ text: meta.applicantName, style: "sender" });
  if (meta.applicantLocation) lines.push({ text: meta.applicantLocation, style: "sender" });
  if (meta.applicantEmail) lines.push({ text: meta.applicantEmail, style: "sender" });
  if (meta.applicantPhone) lines.push({ text: meta.applicantPhone, style: "sender" });
  lines.push({ text: "", style: "spacer" });

  if (meta.company) lines.push({ text: meta.company, style: "recipient" });
  if (meta.applicantLocation) lines.push({ text: meta.applicantLocation.split(",").pop()?.trim() ?? meta.applicantLocation, style: "recipient" });
  lines.push({ text: "", style: "spacer" });
  lines.push({ text: today, style: "date" });
  lines.push({ text: "", style: "spacer" });

  if (meta.jobTitle) {
    lines.push({
      text: `Betreff: Bewerbung als ${meta.jobTitle}`,
      style: "subject",
    });
    lines.push({ text: "", style: "spacer" });
  }

  for (const paragraph of normalizeLetterContent(content).split(/\n\s*\n/)) {
    const block = paragraph.trim();
    if (!block) continue;
    if (SALUTATION_PREFIX.test(block)) {
      lines.push({ text: block, style: "salutation" });
    } else if (CLOSING_PREFIX.test(block)) {
      lines.push({ text: block, style: "closing" });
    } else {
      lines.push({ text: block, style: "body" });
    }
  }

  if (meta.applicantName) {
    lines.push({ text: "", style: "spacer" });
    lines.push({ text: meta.applicantName, style: "signature" });
  }

  return lines;
}

export function wrapTextLine(
  text: string,
  measure: (value: string) => number,
  maxWidth: number,
): string[] {
  if (!text.trim()) return [""];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (measure(candidate) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = word;
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}
