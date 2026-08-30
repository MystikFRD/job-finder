import { chatJson } from "./ai";
import type { UserProfileFull } from "./types";

const MAX_CV_CHARS = 20_000;

export type ParsedResume = Pick<
  UserProfileFull,
  | "full_name"
  | "email"
  | "phone"
  | "location"
  | "summary"
  | "linkedin_url"
  | "github_url"
  | "portfolio_url"
  | "availability"
  | "preferred_hours"
  | "education"
  | "work_experience"
  | "skills"
  | "projects"
  | "technologies"
  | "languages"
>;

const RESUME_SCHEMA = `{
  "full_name": string | null,
  "email": string | null,
  "phone": string | null,
  "location": string | null,
  "summary": string | null,
  "linkedin_url": string | null,
  "github_url": string | null,
  "portfolio_url": string | null,
  "availability": string | null,
  "preferred_hours": string | null,
  "education": [{ "degree": string, "institution": string, "field": string, "start": string, "end": string, "notes": string }],
  "work_experience": [{ "title": string, "company": string, "location": string, "start": string, "end": string, "description": string }],
  "skills": string[],
  "projects": [{ "name": string, "description": string, "technologies": string[], "url": string }],
  "technologies": string[],
  "languages": string[]
}`;

export function normalizeCvText(text: string): string {
  const trimmed = text.replace(/\r\n/g, "\n").trim();
  if (!trimmed) throw new Error("Lebenslauf ist leer.");
  if (trimmed.length > MAX_CV_CHARS) {
    return trimmed.slice(0, MAX_CV_CHARS);
  }
  return trimmed;
}

export async function extractTextFromCvFile(
  buffer: Buffer,
  fileName: string,
  mimeType?: string,
): Promise<string> {
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".pdf") || mimeType === "application/pdf") {
    const pdfParse = (await import("pdf-parse")).default as (
      buffer: Buffer,
    ) => Promise<{ text: string }>;
    const result = await pdfParse(buffer);
    return normalizeCvText(result.text ?? "");
  }

  if (
    lower.endsWith(".txt") ||
    lower.endsWith(".md") ||
    mimeType?.startsWith("text/")
  ) {
    return normalizeCvText(buffer.toString("utf-8"));
  }

  throw new Error("Unsupported file type. Use PDF or TXT, or paste the CV text.");
}

export async function parseResumeText(cvText: string): Promise<ParsedResume> {
  const text = normalizeCvText(cvText);

  return chatJson<ParsedResume>(
    `You extract structured profile data from CVs/resumes (German or English).
Only include information explicitly present in the CV. Do not invent credentials.
Return JSON matching this schema exactly:
${RESUME_SCHEMA}

Rules:
- skills: soft and hard skills as short strings
- technologies: programming languages, frameworks, tools
- languages: spoken languages (e.g. "German (native)", "English (fluent)")
- education/work dates as written in the CV (e.g. "2022", "2020-2024", "present")
- summary: 2-4 sentence professional summary if present, otherwise null
- Use null for missing scalar fields, [] for empty arrays`,
    `CV / RESUME:\n\n${text}`,
  );
}

export function sanitizeParsedResume(data: ParsedResume): Partial<UserProfileFull> {
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

  return {
    full_name: str(data.full_name),
    email: str(data.email),
    phone: str(data.phone),
    location: str(data.location),
    summary: str(data.summary),
    linkedin_url: str(data.linkedin_url),
    github_url: str(data.github_url),
    portfolio_url: str(data.portfolio_url),
    availability: str(data.availability),
    preferred_hours: str(data.preferred_hours),
    education: Array.isArray(data.education) ? data.education : [],
    work_experience: Array.isArray(data.work_experience) ? data.work_experience : [],
    skills: Array.isArray(data.skills)
      ? data.skills.filter((s): s is string => typeof s === "string" && !!s.trim())
      : [],
    projects: Array.isArray(data.projects) ? data.projects : [],
    technologies: Array.isArray(data.technologies)
      ? data.technologies.filter((s): s is string => typeof s === "string" && !!s.trim())
      : [],
    languages: Array.isArray(data.languages)
      ? data.languages.filter((s): s is string => typeof s === "string" && !!s.trim())
      : [],
  };
}
