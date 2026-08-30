import { NextResponse } from "next/server";
import {
  draftEmailReply,
  generateFollowUpSuggestion,
  generateInterviewPrep,
  researchCompany,
} from "@/lib/assistant";
import {
  getApplicationById,
  getEmailById,
  getJobById,
  getUserProfile,
  upsertInterview,
} from "@/lib/queries";
import { queryOne } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, applicationId, emailId, jobId, companyName, instruction } = body as {
      action: string;
      applicationId?: string;
      emailId?: string;
      jobId?: string;
      companyName?: string;
      instruction?: string;
    };

    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json({ error: "Profile required" }, { status: 400 });
    }

    if (action === "reply_draft" && emailId) {
      const email = await getEmailById(emailId);
      if (!email) return NextResponse.json({ error: "Email not found" }, { status: 404 });
      const appData = email.application_id
        ? await getApplicationById(email.application_id)
        : null;
      const draft = await draftEmailReply(
        email,
        { job_title: appData?.application.job_title, company: appData?.application.company },
        profile,
        instruction,
      );
      const saved = await queryOne(
        `INSERT INTO email_drafts (email_id, application_id, draft_type, subject, content)
         VALUES ($1, $2, 'reply', $3, $4) RETURNING id, content`,
        [emailId, email.application_id, `Re: ${email.subject ?? ""}`, draft],
      );
      return NextResponse.json(saved);
    }

    if (action === "interview_prep" && applicationId) {
      const data = await getApplicationById(applicationId);
      if (!data?.job) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const prep = await generateInterviewPrep(data.job, profile);
      await upsertInterview(applicationId, {
        preparation_notes: prep.preparation_notes,
      });
      return NextResponse.json(prep);
    }

    if (action === "follow_up" && applicationId) {
      const data = await getApplicationById(applicationId);
      if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const suggestion = await generateFollowUpSuggestion(data.application);
      return NextResponse.json(suggestion);
    }

    if (action === "company_research" && companyName) {
      const data = await getApplicationById(applicationId ?? "");
      const jobs = data?.job
        ? [{ job_title: data.job.job_title, match_score: data.job.match_score }]
        : [];
      const research = await researchCompany(companyName, jobs);
      return NextResponse.json(research);
    }

    if (action === "company_research" && jobId) {
      const job = await getJobById(jobId);
      if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
      const research = await researchCompany(job.company, [
        { job_title: job.job_title, match_score: job.match_score },
      ]);
      return NextResponse.json(research);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Assistant error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
