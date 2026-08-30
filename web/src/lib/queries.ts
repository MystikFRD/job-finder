import { query, queryOne } from "./db";
import { requireUserId } from "./auth";
import { refreshSearchRunState } from "./n8n-trigger";
import type {
  Application,
  ApplicationDocument,
  ApplicationEvent,
  Company,
  DashboardStats,
  EmailDetail,
  EmailRow,
  Interview,
  Job,
  JobFilters,
  SearchRun,
  UserProfileFull,
} from "./types";

export async function getDashboardStats(): Promise<DashboardStats> {
  const userId = await requireUserId();
  const row = await queryOne<DashboardStats>(
    `SELECT
      (SELECT COUNT(*)::int FROM jobs WHERE user_id = $1 AND status = 'new') AS new_jobs,
      (SELECT COUNT(*)::int FROM jobs WHERE user_id = $1 AND match_score >= 70 AND status NOT IN ('ignored', 'expired', 'rejected')) AS good_matches,
      (SELECT COUNT(*)::int FROM applications WHERE user_id = $1 AND status IN ('submitted', 'waiting', 'interview', 'technical_interview', 'final_interview', 'offer', 'accepted', 'rejected')) AS applications_sent,
      (SELECT COUNT(*)::int FROM applications WHERE user_id = $1 AND status IN ('submitted', 'waiting')) AS waiting_for_response,
      (SELECT COUNT(*)::int FROM applications WHERE user_id = $1 AND status IN ('interview', 'technical_interview', 'final_interview')) AS interviews,
      (SELECT COUNT(*)::int FROM applications WHERE user_id = $1 AND status = 'rejected') AS rejections,
      (SELECT COUNT(*)::int FROM applications WHERE user_id = $1 AND status IN ('offer', 'accepted')) AS offers`,
    [userId],
  );
  return (
    row ?? {
      new_jobs: 0,
      good_matches: 0,
      applications_sent: 0,
      waiting_for_response: 0,
      interviews: 0,
      rejections: 0,
      offers: 0,
    }
  );
}

export async function getTopJobs(limit = 8): Promise<Job[]> {
  const userId = await requireUserId();
  return query<Job>(
    `SELECT id, job_title, company, location, url, source_url, remote_option,
            employment_type, weekly_hours, date_posted, job_description,
            required_technologies, preferred_technologies, required_requirements,
            preferred_requirements, tasks, match_score, match_recommendation,
            matched_required_technologies, matched_preferred_technologies,
            missing_required_technologies, matched_technical_areas, match_positives,
            match_warnings, status, analysis_status, notes, first_seen_at, last_seen_at,
            applied_at, interview_at, rejected_at
     FROM jobs
     WHERE user_id = $2
       AND match_score IS NOT NULL
       AND status NOT IN ('ignored', 'expired', 'rejected')
     ORDER BY match_score DESC NULLS LAST, first_seen_at DESC
     LIMIT $1`,
    [limit, userId],
  );
}

export async function getLatestSearchRun(): Promise<SearchRun | null> {
  const userId = await requireUserId();
  await refreshSearchRunState(userId);
  return queryOne<SearchRun>(
    `SELECT id, started_at, finished_at, status, results_found, new_jobs_found,
            jobs_analyzed, existing_jobs_seen, error_message, run_details
     FROM search_runs
     WHERE user_id = $1
     ORDER BY started_at DESC
     LIMIT 1`,
    [userId],
  );
}

export async function getJobs(filters: JobFilters = {}): Promise<Job[]> {
  const userId = await requireUserId();
  const conditions: string[] = ["user_id = $1"];
  const params: unknown[] = [userId];
  let paramIndex = 2;

  if (filters.q) {
    conditions.push(
      `(job_title ILIKE $${paramIndex} OR company ILIKE $${paramIndex} OR location ILIKE $${paramIndex})`,
    );
    params.push(`%${filters.q}%`);
    paramIndex++;
  }

  if (filters.status) {
    conditions.push(`status = $${paramIndex}::job_status`);
    params.push(filters.status);
    paramIndex++;
  }

  if (filters.minScore != null) {
    conditions.push(`match_score >= $${paramIndex}`);
    params.push(filters.minScore);
    paramIndex++;
  }

  if (filters.remote) {
    conditions.push(`remote_option ILIKE $${paramIndex}`);
    params.push(`%${filters.remote}%`);
    paramIndex++;
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const sortMap: Record<string, string> = {
    score: "match_score",
    newest: "first_seen_at",
    oldest: "first_seen_at",
    company: "company",
    posted: "date_posted",
  };
  const sortCol = sortMap[filters.sort ?? "score"] ?? "match_score";
  const order = filters.order === "asc" ? "ASC" : "DESC";
  const nulls = sortCol === "match_score" ? " NULLS LAST" : "";

  return query<Job>(
    `SELECT id, job_title, company, location, url, source_url, remote_option,
            employment_type, weekly_hours, date_posted, job_description,
            required_technologies, preferred_technologies, required_requirements,
            preferred_requirements, tasks, match_score, match_recommendation,
            matched_required_technologies, matched_preferred_technologies,
            missing_required_technologies, matched_technical_areas, match_positives,
            match_warnings, status, analysis_status, notes, first_seen_at, last_seen_at,
            applied_at, interview_at, rejected_at
     FROM jobs
     ${where}
     ORDER BY ${sortCol} ${order}${nulls}, first_seen_at DESC
     LIMIT 500`,
    params,
  );
}

export async function getJobById(id: string): Promise<Job | null> {
  const userId = await requireUserId();
  return queryOne<Job>(
    `SELECT id, job_title, company, location, url, source_url, remote_option,
            employment_type, weekly_hours, date_posted, job_description,
            required_technologies, preferred_technologies, required_requirements,
            preferred_requirements, tasks, match_score, match_recommendation,
            matched_required_technologies, matched_preferred_technologies,
            missing_required_technologies, matched_technical_areas, match_positives,
            match_warnings, status, analysis_status, notes, first_seen_at, last_seen_at,
            applied_at, interview_at, rejected_at
     FROM jobs WHERE id = $1 AND user_id = $2`,
    [id, userId],
  );
}

export async function updateJobStatus(id: string, status: string) {
  const userId = await requireUserId();
  return queryOne<Job>(
    `UPDATE jobs SET status = $3::job_status, updated_at = timezone('utc', now())
     WHERE id = $1 AND user_id = $2
     RETURNING id, status`,
    [id, userId, status],
  );
}

export async function getSearchRuns(limit = 50): Promise<SearchRun[]> {
  const userId = await requireUserId();
  await refreshSearchRunState(userId);
  return query<SearchRun>(
    `SELECT id, started_at, finished_at, status, results_found, new_jobs_found,
            jobs_analyzed, existing_jobs_seen, error_message, run_details
     FROM search_runs
     WHERE user_id = $2
     ORDER BY started_at DESC
     LIMIT $1`,
    [limit, userId],
  );
}

export async function getApplications(): Promise<Application[]> {
  const userId = await requireUserId();
  return query<Application>(
    `SELECT a.id, a.job_id, a.company_id, a.status, a.application_method, a.notes,
            a.created_at, a.applied_at, a.last_response_at,
            j.job_title, j.company, j.match_score, j.location
     FROM applications a
     JOIN jobs j ON j.id = a.job_id
     WHERE a.user_id = $1
     ORDER BY a.updated_at DESC`,
    [userId],
  );
}

export async function getApplicationById(id: string) {
  const userId = await requireUserId();
  const application = await queryOne<Application>(
    `SELECT a.id, a.job_id, a.company_id, a.status, a.application_method, a.notes,
            a.created_at, a.applied_at, a.last_response_at,
            j.job_title, j.company, j.match_score, j.location
     FROM applications a
     JOIN jobs j ON j.id = a.job_id
     WHERE a.id = $1 AND a.user_id = $2`,
    [id, userId],
  );
  if (!application) return null;

  const job = await getJobById(application.job_id);
  const events = await query<ApplicationEvent>(
    `SELECT id, event_type, title, description, occurred_at
     FROM application_events
     WHERE application_id = $1
     ORDER BY occurred_at DESC`,
    [id],
  );
  const documents = await query<ApplicationDocument>(
    `SELECT id, document_type, title, content, version, is_current, updated_at
     FROM application_documents
     WHERE application_id = $1
     ORDER BY is_current DESC, version DESC`,
    [id],
  );

  return { application, job, events, documents };
}

export async function createApplicationFromJob(jobId: string) {
  const userId = await requireUserId();
  const job = await queryOne<{ id: string }>(
    `SELECT id FROM jobs WHERE id = $1 AND user_id = $2`,
    [jobId, userId],
  );
  if (!job) throw new Error("Job not found");
  return queryOne<{ id: string }>(
    `SELECT (create_application_from_job($1::uuid)).id AS id`,
    [jobId],
  );
}

export async function updateApplicationStatus(id: string, status: string) {
  const userId = await requireUserId();
  if (status === "submitted") {
    return queryOne(
      `UPDATE applications
       SET status = $3::application_status,
           applied_at = COALESCE(applied_at, timezone('utc', now())),
           updated_at = timezone('utc', now())
       WHERE id = $1 AND user_id = $2 RETURNING id, status`,
      [id, userId, status],
    );
  }
  return queryOne(
    `UPDATE applications
     SET status = $3::application_status, updated_at = timezone('utc', now())
     WHERE id = $1 AND user_id = $2 RETURNING id, status`,
    [id, userId, status],
  );
}

export async function getCompanies(): Promise<Company[]> {
  const userId = await requireUserId();
  return query<Company>(
    `SELECT c.id, c.name, c.website, c.location,
            COUNT(DISTINCT j.id)::int AS job_count,
            COUNT(DISTINCT a.id)::int AS application_count
     FROM companies c
     LEFT JOIN jobs j ON public.normalize_company(j.company) = c.normalized_name AND j.user_id = $1
     LEFT JOIN applications a ON a.company_id = c.id AND a.user_id = $1
     WHERE c.user_id = $1 OR EXISTS (
       SELECT 1 FROM jobs j2
       WHERE j2.user_id = $1 AND public.normalize_company(j2.company) = c.normalized_name
     )
     GROUP BY c.id
     ORDER BY c.name`,
    [userId],
  );
}

export async function getRecentEmails(limit = 20) {
  const userId = await requireUserId();
  return query<EmailRow & { id: string }>(
    `SELECT e.id, e.subject, e.from_address, e.category, e.received_at,
            e.classification_confidence, j.job_title, j.company
     FROM emails e
     LEFT JOIN jobs j ON j.id = e.job_id
     WHERE e.user_id = $1
     ORDER BY e.received_at DESC NULLS LAST
     LIMIT $2`,
    [userId, limit],
  );
}

export async function getUserProfile() {
  const userId = await requireUserId();
  return queryOne<UserProfileFull>(
    `SELECT id, full_name, email, phone, location, summary,
            linkedin_url, github_url, portfolio_url,
            address_street, address_postal_code, address_city, address_country,
            include_address_on_cv,
            (profile_photo IS NOT NULL) AS has_profile_photo,
            education, work_experience, skills, projects, technologies, languages,
            availability, preferred_hours, job_preferences, cv_document_path
     FROM user_profile WHERE user_id = $1`,
    [userId],
  );
}

export async function getProfilePhoto(userId: string) {
  return queryOne<{ profile_photo_mime: string | null; profile_photo: Buffer | null }>(
    `SELECT profile_photo_mime, profile_photo FROM user_profile WHERE user_id = $1`,
    [userId],
  );
}

export async function updateProfilePhoto(userId: string, mime: string | null, data: Buffer | null) {
  await query(
    `UPDATE user_profile SET
       profile_photo_mime = $2,
       profile_photo = $3,
       updated_at = timezone('utc', now())
     WHERE user_id = $1`,
    [userId, mime, data],
  );
}

export async function updateUserProfile(data: Partial<UserProfileFull>) {
  const userId = await requireUserId();
  const profile = await getUserProfile();
  if (!profile) return null;
  return queryOne<UserProfileFull>(
    `UPDATE user_profile SET
       full_name = coalesce($2, full_name),
       email = coalesce($3, email),
       phone = coalesce($4, phone),
       location = coalesce($5, location),
       summary = coalesce($6, summary),
       linkedin_url = coalesce($7, linkedin_url),
       github_url = coalesce($8, github_url),
       portfolio_url = coalesce($9, portfolio_url),
       address_street = coalesce($10, address_street),
       address_postal_code = coalesce($11, address_postal_code),
       address_city = coalesce($12, address_city),
       address_country = coalesce($13, address_country),
       include_address_on_cv = coalesce($14, include_address_on_cv),
       education = coalesce($15::jsonb, education),
       work_experience = coalesce($16::jsonb, work_experience),
       skills = coalesce($17::jsonb, skills),
       projects = coalesce($18::jsonb, projects),
       technologies = coalesce($19::jsonb, technologies),
       languages = coalesce($20::jsonb, languages),
       availability = coalesce($21, availability),
       preferred_hours = coalesce($22, preferred_hours),
       job_preferences = coalesce($23::jsonb, job_preferences),
       updated_at = timezone('utc', now())
     WHERE id = $1 AND user_id = $24
     RETURNING id, full_name, email, phone, location, summary,
               linkedin_url, github_url, portfolio_url,
               address_street, address_postal_code, address_city, address_country,
               include_address_on_cv,
               (profile_photo IS NOT NULL) AS has_profile_photo,
               education, work_experience, skills, projects, technologies, languages,
               availability, preferred_hours, job_preferences, cv_document_path`,
    [
      profile.id,
      data.full_name,
      data.email,
      data.phone,
      data.location,
      data.summary,
      data.linkedin_url,
      data.github_url,
      data.portfolio_url,
      data.address_street,
      data.address_postal_code,
      data.address_city,
      data.address_country,
      data.include_address_on_cv,
      data.education ? JSON.stringify(data.education) : null,
      data.work_experience ? JSON.stringify(data.work_experience) : null,
      data.skills ? JSON.stringify(data.skills) : null,
      data.projects ? JSON.stringify(data.projects) : null,
      data.technologies ? JSON.stringify(data.technologies) : null,
      data.languages ? JSON.stringify(data.languages) : null,
      data.availability,
      data.preferred_hours,
      data.job_preferences ? JSON.stringify(data.job_preferences) : null,
      userId,
    ],
  );
}

export async function saveApplicationDocument(
  applicationId: string,
  documentType: string,
  title: string,
  content: string,
  createVersion = false,
) {
  const userId = await requireUserId();
  const app = await queryOne<{ id: string }>(
    `SELECT id FROM applications WHERE id = $1 AND user_id = $2`,
    [applicationId, userId],
  );
  if (!app) throw new Error("Application not found");
  return queryOne<ApplicationDocument>(
    `SELECT id, document_type, title, content, version, is_current, updated_at
     FROM save_application_document($1::uuid, $2, $3, $4, $5)`,
    [applicationId, documentType, title, content, createVersion],
  );
}

export async function getEmailById(id: string) {
  const userId = await requireUserId();
  return queryOne<EmailDetail>(
    `SELECT e.id, e.subject, e.from_address, e.to_address, e.body_text, e.body_preview,
            e.category, e.received_at, e.classification_confidence,
            e.application_id, e.matched_application_id, e.requires_review, e.auto_status_updated,
            j.job_title, j.company
     FROM emails e
     LEFT JOIN jobs j ON j.id = e.job_id
     WHERE e.id = $1 AND e.user_id = $2`,
    [id, userId],
  );
}

export async function getCompanyById(id: string) {
  const userId = await requireUserId();
  const company = await queryOne<Company & { notes: string | null }>(
    `SELECT c.id, c.name, c.website, c.location, c.notes,
            COUNT(DISTINCT j.id)::int AS job_count,
            COUNT(DISTINCT a.id)::int AS application_count
     FROM companies c
     LEFT JOIN jobs j ON public.normalize_company(j.company) = c.normalized_name AND j.user_id = $2
     LEFT JOIN applications a ON a.company_id = c.id AND a.user_id = $2
     WHERE c.id = $1
     GROUP BY c.id`,
    [id, userId],
  );
  if (!company) return null;

  const jobs = await query<{ id: string; job_title: string; match_score: number | null; status: string }>(
    `SELECT j.id, j.job_title, j.match_score, j.status::text
     FROM jobs j
     JOIN companies c ON public.normalize_company(j.company) = c.normalized_name
     WHERE c.id = $1 AND j.user_id = $2 ORDER BY j.match_score DESC NULLS LAST`,
    [id, userId],
  );

  const applications = await query<Application>(
    `SELECT a.id, a.job_id, a.company_id, a.status, a.application_method, a.notes,
            a.created_at, a.applied_at, a.last_response_at,
            j.job_title, j.company, j.match_score, j.location
     FROM applications a JOIN jobs j ON j.id = a.job_id
     WHERE a.company_id = $1 AND a.user_id = $2`,
    [id, userId],
  );

  return { company, jobs, applications };
}

export async function getInterviews(applicationId: string) {
  const userId = await requireUserId();
  return query<Interview>(
    `SELECT i.id, i.application_id, i.scheduled_at, i.interview_type, i.location, i.notes, i.preparation_notes, i.completed
     FROM interviews i
     JOIN applications a ON a.id = i.application_id
     WHERE i.application_id = $1 AND a.user_id = $2
     ORDER BY i.scheduled_at DESC NULLS LAST`,
    [applicationId, userId],
  );
}

export async function upsertInterview(
  applicationId: string,
  data: Partial<Interview>,
) {
  const userId = await requireUserId();
  const app = await queryOne<{ id: string }>(
    `SELECT id FROM applications WHERE id = $1 AND user_id = $2`,
    [applicationId, userId],
  );
  if (!app) throw new Error("Application not found");
  if (data.id) {
    return queryOne<Interview>(
      `UPDATE interviews SET
         scheduled_at = coalesce($2, scheduled_at),
         interview_type = coalesce($3, interview_type),
         location = coalesce($4, location),
         notes = coalesce($5, notes),
         preparation_notes = coalesce($6, preparation_notes),
         completed = coalesce($7, completed),
         updated_at = timezone('utc', now())
       WHERE id = $1 RETURNING *`,
      [data.id, data.scheduled_at, data.interview_type, data.location, data.notes, data.preparation_notes, data.completed],
    );
  }
  return queryOne<Interview>(
    `INSERT INTO interviews (application_id, scheduled_at, interview_type, location, notes, preparation_notes)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [applicationId, data.scheduled_at, data.interview_type ?? "video", data.location, data.notes, data.preparation_notes],
  );
}
