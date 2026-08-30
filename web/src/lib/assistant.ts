import { chatComplete, chatJson } from "./ai";
import type { Job, UserProfileFull } from "./types";

export async function generateCoverLetter(
  job: Job,
  profile: UserProfileFull,
  options?: { tone?: string; length?: "short" | "standard" },
) {
  const system = `You write tailored German job application cover letters (Anschreiben) for Werkstudent / Working Student roles in computer science.
Use professional but authentic tone. Never invent credentials not in the profile.
Do NOT include placeholder brackets. Output the final letter text only.

Format as a proper German business letter (DIN 5008 style), plain text with blank lines between blocks:
1) Sender block (name, location, email/phone if available)
2) Blank line
3) Recipient block (company, city)
4) Blank line
5) Date (e.g. "29. August 2026")
6) Blank line
7) Subject line starting with "Betreff: Bewerbung als ..."
8) Blank line
9) Salutation ("Sehr geehrte Damen und Herren," or named if known)
10) 2-3 short body paragraphs with concrete skills and motivation
11) Closing ("Mit freundlichen Grüßen")
12) Full name on last line

Keep it concise, professional, and visually structured with line breaks.`;

  const user = `Write a ${options?.length === "short" ? "concise" : "complete"} cover letter.

APPLICANT:
Name: ${profile.full_name ?? ""}
Summary: ${profile.summary ?? ""}
Education: ${JSON.stringify(profile.education)}
Experience: ${JSON.stringify(profile.work_experience)}
Skills: ${JSON.stringify(profile.skills)}
Projects: ${JSON.stringify(profile.projects)}
Technologies: ${JSON.stringify(profile.technologies)}
Languages: ${JSON.stringify(profile.languages)}

JOB:
Title: ${job.job_title}
Company: ${job.company}
Location: ${job.location ?? ""}
Description: ${job.job_description ?? ""}
Required: ${job.required_technologies?.join(", ")}
Match score: ${job.match_score}
Strengths: ${job.match_positives?.join("; ")}
Gaps: ${job.match_warnings?.join("; ")}

Tone: ${options?.tone ?? "professional and enthusiastic"}
Language: German`;

  return chatComplete(system, user);
}

export async function classifyEmail(
  from: string,
  subject: string,
  body: string,
) {
  return chatJson<{
    category: string;
    confidence: number;
    summary: string;
    suggested_action: string;
  }>(
    `Classify recruiting/application emails. Categories: application_received, rejection, interview_invitation, request_for_information, assessment_invitation, technical_test, follow_up, offer, generic_recruiting_email, unknown.`,
    `From: ${from}\nSubject: ${subject}\n\n${body.slice(0, 4000)}`,
  );
}

export async function draftEmailReply(
  email: { from_address: string | null; subject: string | null; body_text: string | null },
  application: { job_title?: string; company?: string },
  profile: UserProfileFull,
  instruction?: string,
) {
  const system = `Draft a professional email reply for a job application. German unless the original email is English.
Output ONLY the email body text. Do not send — draft only.`;

  const user = `Original from: ${email.from_address}
Subject: ${email.subject}
Body: ${email.body_text?.slice(0, 3000)}

Application: ${application.job_title} at ${application.company}
Applicant: ${profile.full_name}
Instruction: ${instruction ?? "Reply appropriately and professionally"}

Draft the reply:`;

  return chatComplete(system, user);
}

export async function generateInterviewPrep(
  job: Job,
  profile: UserProfileFull,
) {
  return chatJson<{
    likely_questions: string[];
    technical_topics: string[];
    questions_to_ask: string[];
    preparation_notes: string;
    company_talking_points: string[];
  }>(
    `You help prepare for job interviews. Return structured JSON.`,
    `Job: ${job.job_title} at ${job.company}
Description: ${job.job_description?.slice(0, 3000)}
Required tech: ${job.required_technologies?.join(", ")}
Applicant skills: ${JSON.stringify(profile.skills)}
Applicant projects: ${JSON.stringify(profile.projects)}`,
  );
}

export async function generateFollowUpSuggestion(
  application: { job_title?: string; company?: string; applied_at?: string | null; status: string },
) {
  return chatJson<{ subject: string; body: string; timing_advice: string }>(
    `Suggest a polite follow-up email for a job application. German. JSON with subject, body, timing_advice.`,
    `Company: ${application.company}
Role: ${application.job_title}
Status: ${application.status}
Applied: ${application.applied_at ?? "unknown"}`,
  );
}

export async function researchCompany(
  companyName: string,
  jobs: { job_title: string; match_score: number | null }[],
) {
  return chatJson<{
    overview: string;
    culture_signals: string[];
    interview_tips: string[];
    talking_points: string[];
    red_flags: string[];
  }>(
    `Provide company research for interview prep based on public knowledge. Be honest about uncertainty. JSON only.`,
    `Company: ${companyName}
Known roles in pipeline: ${JSON.stringify(jobs)}`,
  );
}

export async function regenerateDocument(
  content: string,
  instruction: string,
) {
  return chatComplete(
    "Edit the application document according to the instruction. Return the full revised text only.",
    `Document:\n${content}\n\nInstruction: ${instruction}`,
  );
}
