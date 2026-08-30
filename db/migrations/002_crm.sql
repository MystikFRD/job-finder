-- CRM tables: companies, applications, events, documents, emails, user profile

DO $$ BEGIN
  CREATE TYPE public.application_status AS ENUM (
    'draft', 'ready', 'submitted', 'waiting',
    'interview', 'technical_interview', 'final_interview',
    'rejected', 'offer', 'accepted', 'withdrawn'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.email_category AS ENUM (
    'application_received', 'rejection', 'interview_invitation',
    'request_for_information', 'assessment_invitation', 'technical_test',
    'follow_up', 'offer', 'generic_recruiting_email', 'unknown'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  normalized_name text,
  website text,
  location text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX IF NOT EXISTS companies_normalized_name_idx
  ON public.companies (normalized_name)
  WHERE normalized_name IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  status public.application_status NOT NULL DEFAULT 'draft',
  application_method text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  applied_at timestamptz,
  last_response_at timestamptz,
  next_action_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS applications_job_id_idx ON public.applications (job_id);
CREATE INDEX IF NOT EXISTS applications_status_idx ON public.applications (status);
CREATE INDEX IF NOT EXISTS applications_company_id_idx ON public.applications (company_id);

CREATE TABLE IF NOT EXISTS public.application_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  title text NOT NULL,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS application_events_application_id_idx
  ON public.application_events (application_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS public.application_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  document_type text NOT NULL DEFAULT 'cover_letter',
  title text,
  content text NOT NULL DEFAULT '',
  version integer NOT NULL DEFAULT 1,
  is_current boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS application_documents_application_id_idx
  ON public.application_documents (application_id, is_current);

CREATE TABLE IF NOT EXISTS public.emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES public.applications(id) ON DELETE SET NULL,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  message_id text,
  from_address text,
  to_address text,
  subject text,
  body_text text,
  body_html text,
  received_at timestamptz,
  category public.email_category DEFAULT 'unknown',
  classification_confidence numeric(4,3),
  raw_headers jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS emails_application_id_idx ON public.emails (application_id);
CREATE INDEX IF NOT EXISTS emails_received_at_idx ON public.emails (received_at DESC);

CREATE TABLE IF NOT EXISTS public.user_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text,
  email text,
  phone text,
  location text,
  summary text,
  education jsonb NOT NULL DEFAULT '[]'::jsonb,
  work_experience jsonb NOT NULL DEFAULT '[]'::jsonb,
  skills jsonb NOT NULL DEFAULT '[]'::jsonb,
  projects jsonb NOT NULL DEFAULT '[]'::jsonb,
  technologies jsonb NOT NULL DEFAULT '[]'::jsonb,
  languages jsonb NOT NULL DEFAULT '[]'::jsonb,
  availability text,
  preferred_hours text,
  job_preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  cv_document_path text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- Ensure at least one profile row exists for the app
INSERT INTO public.user_profile (full_name)
SELECT 'Job Search Profile'
WHERE NOT EXISTS (SELECT 1 FROM public.user_profile LIMIT 1);

CREATE OR REPLACE FUNCTION public.get_or_create_company(p_name text)
RETURNS uuid
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
  v_normalized text;
BEGIN
  v_normalized := public.normalize_company(COALESCE(p_name, ''));
  SELECT id INTO v_id FROM public.companies WHERE normalized_name = v_normalized LIMIT 1;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  INSERT INTO public.companies (name, normalized_name)
  VALUES (p_name, v_normalized)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_application_from_job(p_job_id uuid)
RETURNS public.applications
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_job public.jobs;
  v_company_id uuid;
  v_app public.applications;
BEGIN
  SELECT * INTO v_job FROM public.jobs WHERE id = p_job_id;
  IF v_job.id IS NULL THEN
    RAISE EXCEPTION 'Job not found: %', p_job_id;
  END IF;

  SELECT * INTO v_app FROM public.applications WHERE job_id = p_job_id LIMIT 1;
  IF v_app.id IS NOT NULL THEN RETURN v_app; END IF;

  v_company_id := public.get_or_create_company(v_job.company);

  INSERT INTO public.applications (job_id, company_id, status)
  VALUES (p_job_id, v_company_id, 'draft')
  RETURNING * INTO v_app;

  INSERT INTO public.application_events (application_id, event_type, title, description)
  VALUES (v_app.id, 'application_created', 'Application created', 'Created from job listing');

  UPDATE public.jobs SET status = 'interesting', updated_at = timezone('utc', now())
  WHERE id = p_job_id AND status = 'new';

  RETURN v_app;
END;
$function$;
