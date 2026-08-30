export type JobStatus =
  | "new"
  | "reviewed"
  | "interesting"
  | "applied"
  | "interview"
  | "rejected"
  | "ignored"
  | "expired";

export type ApplicationStatus =
  | "draft"
  | "ready"
  | "submitted"
  | "waiting"
  | "interview"
  | "technical_interview"
  | "final_interview"
  | "rejected"
  | "offer"
  | "accepted"
  | "withdrawn";

export type SearchRunStatus = "running" | "completed" | "failed";

export interface Job {
  id: string;
  job_title: string;
  company: string;
  location: string | null;
  url: string | null;
  source_url: string | null;
  remote_option: string | null;
  employment_type: string | null;
  weekly_hours: number | null;
  date_posted: string | null;
  job_description: string | null;
  required_technologies: string[];
  preferred_technologies: string[];
  required_requirements: string[];
  preferred_requirements: string[];
  tasks: string[];
  match_score: number | null;
  match_recommendation: string | null;
  matched_required_technologies: string[];
  matched_preferred_technologies: string[];
  missing_required_technologies: string[];
  matched_technical_areas: string[];
  match_positives: string[];
  match_warnings: string[];
  status: JobStatus;
  analysis_status: string | null;
  notes: string | null;
  first_seen_at: string;
  last_seen_at: string;
  applied_at: string | null;
  interview_at: string | null;
  rejected_at: string | null;
}

export interface SearchRun {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: SearchRunStatus;
  results_found: number;
  new_jobs_found: number;
  jobs_analyzed: number;
  existing_jobs_seen: number | null;
  error_message: string | null;
  run_details: Record<string, unknown> | null;
}

export interface Application {
  id: string;
  job_id: string;
  company_id: string | null;
  status: ApplicationStatus;
  application_method: string | null;
  notes: string | null;
  created_at: string;
  applied_at: string | null;
  last_response_at: string | null;
  job_title?: string;
  company?: string;
  match_score?: number | null;
  location?: string | null;
}

export interface Company {
  id: string;
  name: string;
  website: string | null;
  location: string | null;
  job_count: number;
  application_count: number;
}

export interface DashboardStats {
  new_jobs: number;
  good_matches: number;
  applications_sent: number;
  waiting_for_response: number;
  interviews: number;
  rejections: number;
  offers: number;
}

export interface JobFilters {
  q?: string;
  status?: string;
  minScore?: number;
  remote?: string;
  sort?: string;
  order?: "asc" | "desc";
}

export interface ApplicationEvent {
  id: string;
  event_type: string;
  title: string;
  description: string | null;
  occurred_at: string;
}

export interface ApplicationDocument {
  id: string;
  document_type: string;
  title: string | null;
  content: string;
  version: number;
  is_current: boolean;
  updated_at: string;
}

export interface EmailRow {
  id: string;
  subject: string | null;
  from_address: string | null;
  category: string | null;
  received_at: string | null;
  company: string | null;
  job_title: string | null;
}

export interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  summary: string | null;
}

export interface UserProfileFull extends UserProfile {
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  address_street: string | null;
  address_postal_code: string | null;
  address_city: string | null;
  address_country: string | null;
  include_address_on_cv: boolean;
  has_profile_photo?: boolean;
  education: unknown[];
  work_experience: unknown[];
  skills: unknown[];
  projects: unknown[];
  technologies: unknown[];
  languages: unknown[];
  availability: string | null;
  preferred_hours: string | null;
  job_preferences: Record<string, unknown>;
  cv_document_path: string | null;
}

export interface SearchSettings {
  id: string;
  search_queries: string[];
  preferred_locations: string[];
  match_skills: string[];
  profile_languages: string[];
  wants_working_student: boolean;
  min_match_score: number;
  allow_remote_outside_locations: boolean;
  searxng_base_url: string;
  role_keywords: string;
  tech_focus: string;
  max_jobs_per_run: number;
  schedule_enabled: boolean;
  has_deepseek_key?: boolean;
  has_openai_key?: boolean;
  has_n8n_key?: boolean;
  updated_at: string;
}

export interface ActionItem {
  id: string;
  item_type: string;
  title: string;
  description: string | null;
  priority: string;
  job_id: string | null;
  application_id: string | null;
  email_id: string | null;
  due_at: string | null;
  dismissed_at: string | null;
  completed_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface EmailDetail extends EmailRow {
  body_text: string | null;
  body_preview: string | null;
  to_address: string | null;
  classification_confidence: number | null;
  application_id: string | null;
  matched_application_id: string | null;
  requires_review: boolean;
  auto_status_updated: boolean;
}

export interface Interview {
  id: string;
  application_id: string;
  scheduled_at: string | null;
  interview_type: string;
  location: string | null;
  notes: string | null;
  preparation_notes: string | null;
  completed: boolean;
}

export interface EmailSettingsRow {
  id: string;
  imap_host: string | null;
  imap_port: number;
  imap_user: string | null;
  imap_secure: boolean;
  scan_enabled: boolean;
  last_scan_at: string | null;
  last_scan_status: string | null;
  last_scan_error: string | null;
  auto_update_min_confidence: number;
}
