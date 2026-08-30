-- Multi-user auth, per-user settings, API keys, scoped data

CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  display_name text,
  n8n_finder_workflow_id text,
  n8n_analyzer_workflow_id text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.search_settings
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS deepseek_api_key_enc text,
  ADD COLUMN IF NOT EXISTS openai_api_key_enc text;

ALTER TABLE public.user_profile
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.email_settings
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.search_runs
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.emails
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.action_items
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.users(id) ON DELETE CASCADE;

-- Backfill legacy single-tenant data under one admin user (password set via app on first login migration)
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users LIMIT 1) THEN
    INSERT INTO public.users (email, password_hash, display_name)
    SELECT
      coalesce(nullif(trim(up.email), ''), 'admin@jobs.local'),
      '$2a$12$LEGACYPLACEHOLDERONLYMIGRATEWITHRESETPASSWORD000000000000000000000',
      coalesce(up.full_name, 'Legacy Admin')
    FROM public.user_profile up
    ORDER BY up.created_at ASC
    LIMIT 1
    RETURNING id INTO v_user_id;

    UPDATE public.search_settings SET user_id = v_user_id WHERE user_id IS NULL;
    UPDATE public.user_profile SET user_id = v_user_id WHERE user_id IS NULL;
    UPDATE public.email_settings SET user_id = v_user_id WHERE user_id IS NULL;
    UPDATE public.jobs SET user_id = v_user_id WHERE user_id IS NULL;
    UPDATE public.search_runs SET user_id = v_user_id WHERE user_id IS NULL;
    UPDATE public.applications SET user_id = v_user_id WHERE user_id IS NULL;
    UPDATE public.companies SET user_id = v_user_id WHERE user_id IS NULL;
    UPDATE public.emails SET user_id = v_user_id WHERE user_id IS NULL;
    UPDATE public.action_items SET user_id = v_user_id WHERE user_id IS NULL;

    UPDATE public.users SET
      n8n_finder_workflow_id = 'ROTREzXrgqrC8ffZ',
      n8n_analyzer_workflow_id = 'inw6qMHWkng6OdKs'
    WHERE id = v_user_id;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS search_settings_user_id_key
  ON public.search_settings (user_id) WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS user_profile_user_id_key
  ON public.user_profile (user_id) WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS email_settings_user_id_key
  ON public.email_settings (user_id) WHERE user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.get_search_config(p_user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'user_id', ss.user_id,
    'search_queries', ss.search_queries,
    'preferred_locations', ss.preferred_locations,
    'match_skills', CASE
      WHEN jsonb_array_length(coalesce(ss.match_skills, '[]'::jsonb)) > 0 THEN ss.match_skills
      ELSE coalesce(up.skills, '[]'::jsonb)
    END,
    'profile_languages', CASE
      WHEN jsonb_array_length(coalesce(ss.profile_languages, '[]'::jsonb)) > 0 THEN ss.profile_languages
      ELSE coalesce(up.languages, '[]'::jsonb)
    END,
    'wants_working_student', ss.wants_working_student,
    'min_match_score', ss.min_match_score,
    'allow_remote_outside_locations', ss.allow_remote_outside_locations,
    'searxng_base_url', ss.searxng_base_url,
    'role_keywords', ss.role_keywords,
    'tech_focus', ss.tech_focus,
    'max_jobs_per_run', ss.max_jobs_per_run,
    'schedule_enabled', ss.schedule_enabled,
    'has_deepseek_key', (ss.deepseek_api_key_enc IS NOT NULL AND ss.deepseek_api_key_enc <> ''),
    'has_openai_key', (ss.openai_api_key_enc IS NOT NULL AND ss.openai_api_key_enc <> '')
  )
  FROM search_settings ss
  LEFT JOIN user_profile up ON up.user_id = ss.user_id
  WHERE ss.user_id = p_user_id
  LIMIT 1;
$$;

-- Update create_application_from_job to copy user_id from job
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

  INSERT INTO public.applications (job_id, company_id, status, user_id)
  VALUES (p_job_id, v_company_id, 'draft', v_job.user_id)
  RETURNING * INTO v_app;

  INSERT INTO public.application_events (application_id, event_type, title, description)
  VALUES (v_app.id, 'application_created', 'Application created', 'Created from job listing');

  UPDATE public.jobs SET status = 'interesting', updated_at = timezone('utc', now())
  WHERE id = p_job_id AND status = 'new';

  RETURN v_app;
END;
$function$;

-- Keep old signature working for legacy workflows (first user)
CREATE OR REPLACE FUNCTION public.get_search_config()
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT public.get_search_config(
    (SELECT id FROM public.users ORDER BY created_at ASC LIMIT 1)
  );
$$;

-- save_job_safe: persist user_id from job payload
CREATE OR REPLACE FUNCTION public.save_job_safe(p_job jsonb)
RETURNS public.jobs
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_existing public.jobs;
  v_fingerprint text;
  v_url text;
  v_status public.job_status;
  v_result public.jobs;
  v_user_id uuid;
BEGIN
  IF p_job IS NULL OR p_job = '{}'::jsonb THEN
    RAISE EXCEPTION 'save_job_safe: empty job payload';
  END IF;

  v_url := NULLIF(trim(p_job->>'url'), '');
  v_fingerprint := public.compute_job_fingerprint(
    COALESCE(p_job->>'company', ''),
    COALESCE(p_job->>'job_title', '')
  );
  v_user_id := NULLIF(p_job->>'user_id', '')::uuid;

  v_existing := public.find_existing_job(v_url, v_fingerprint);

  BEGIN
    v_status := COALESCE(NULLIF(p_job->>'status', ''), 'new')::public.job_status;
  EXCEPTION WHEN OTHERS THEN
    v_status := 'new'::public.job_status;
  END;

  IF v_existing.id IS NOT NULL THEN
    UPDATE public.jobs SET
      job_title = COALESCE(NULLIF(p_job->>'job_title', ''), job_title),
      company = COALESCE(NULLIF(p_job->>'company', ''), company),
      location = COALESCE(p_job->>'location', location),
      url = COALESCE(v_url, url),
      source_url = COALESCE(NULLIF(p_job->>'source_url', ''), source_url),
      remote_option = COALESCE(p_job->>'remote_option', remote_option),
      home_office_available = COALESCE((p_job->>'home_office_available')::boolean, home_office_available),
      employment_type = COALESCE(p_job->>'employment_type', employment_type),
      weekly_hours = COALESCE((p_job->>'weekly_hours')::numeric, weekly_hours),
      start_date = COALESCE(p_job->>'start_date', start_date),
      date_posted = COALESCE((p_job->>'date_posted')::date, date_posted),
      job_description = COALESCE(p_job->>'job_description', job_description),
      required_technologies = COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_job->'required_technologies')), required_technologies),
      preferred_technologies = COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_job->'preferred_technologies')), preferred_technologies),
      required_requirements = COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_job->'required_requirements')), required_requirements),
      preferred_requirements = COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_job->'preferred_requirements')), preferred_requirements),
      tasks = COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_job->'tasks')), tasks),
      degree_fields = COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_job->'degree_fields')), degree_fields),
      required_languages = COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_job->'required_languages')), required_languages),
      preferred_languages = COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_job->'preferred_languages')), preferred_languages),
      minimum_semester = COALESCE((p_job->>'minimum_semester')::smallint, minimum_semester),
      previous_work_experience_required = COALESCE((p_job->>'previous_work_experience_required')::boolean, previous_work_experience_required),
      student_required = COALESCE((p_job->>'student_required')::boolean, student_required),
      required_experience = COALESCE(p_job->>'required_experience', required_experience),
      match_score = COALESCE((p_job->>'match_score')::smallint, match_score),
      match_recommendation = COALESCE(p_job->>'match_recommendation', match_recommendation),
      matched_required_technologies = COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_job->'matched_required_technologies')), matched_required_technologies),
      matched_preferred_technologies = COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_job->'matched_preferred_technologies')), matched_preferred_technologies),
      missing_required_technologies = COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_job->'missing_required_technologies')), missing_required_technologies),
      matched_technical_areas = COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_job->'matched_technical_areas')), matched_technical_areas),
      match_positives = COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_job->'match_positives')), match_positives),
      match_warnings = COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_job->'match_warnings')), match_warnings),
      analysis_status = COALESCE(p_job->>'analysis_status', analysis_status),
      fetch_status_code = COALESCE((p_job->>'fetch_status_code')::integer, fetch_status_code),
      extraction_error = COALESCE(p_job->>'extraction_error', extraction_error),
      job_fingerprint = COALESCE(v_fingerprint, job_fingerprint),
      user_id = COALESCE(v_user_id, user_id),
      status = CASE
        WHEN status IN ('applied', 'interview', 'rejected', 'ignored') THEN status
        WHEN v_status = 'expired'::public.job_status THEN 'expired'::public.job_status
        ELSE status
      END,
      last_seen_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
    WHERE id = v_existing.id
    RETURNING * INTO v_result;

    RETURN v_result;
  END IF;

  INSERT INTO public.jobs (
    job_title, company, location, url, source_url, job_fingerprint,
    remote_option, home_office_available, employment_type, weekly_hours,
    start_date, date_posted, job_description,
    required_technologies, preferred_technologies,
    required_requirements, preferred_requirements,
    tasks, degree_fields, required_languages, preferred_languages,
    minimum_semester, previous_work_experience_required, student_required,
    required_experience, match_score, match_recommendation,
    matched_required_technologies, matched_preferred_technologies,
    missing_required_technologies, matched_technical_areas,
    match_positives, match_warnings,
    analysis_status, fetch_status_code, extraction_error,
    status, user_id
  ) VALUES (
    COALESCE(NULLIF(p_job->>'job_title', ''), 'Unknown'),
    COALESCE(NULLIF(p_job->>'company', ''), 'Unknown'),
    p_job->>'location',
    v_url,
    NULLIF(p_job->>'source_url', ''),
    v_fingerprint,
    p_job->>'remote_option',
    (p_job->>'home_office_available')::boolean,
    p_job->>'employment_type',
    (p_job->>'weekly_hours')::numeric,
    p_job->>'start_date',
    (p_job->>'date_posted')::date,
    p_job->>'job_description',
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_job->'required_technologies')), '{}'::text[]),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_job->'preferred_technologies')), '{}'::text[]),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_job->'required_requirements')), '{}'::text[]),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_job->'preferred_requirements')), '{}'::text[]),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_job->'tasks')), '{}'::text[]),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_job->'degree_fields')), '{}'::text[]),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_job->'required_languages')), '{}'::text[]),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_job->'preferred_languages')), '{}'::text[]),
    (p_job->>'minimum_semester')::smallint,
    COALESCE((p_job->>'previous_work_experience_required')::boolean, false),
    COALESCE((p_job->>'student_required')::boolean, true),
    p_job->>'required_experience',
    (p_job->>'match_score')::smallint,
    p_job->>'match_recommendation',
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_job->'matched_required_technologies')), '{}'::text[]),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_job->'matched_preferred_technologies')), '{}'::text[]),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_job->'missing_required_technologies')), '{}'::text[]),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_job->'matched_technical_areas')), '{}'::text[]),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_job->'match_positives')), '{}'::text[]),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_job->'match_warnings')), '{}'::text[]),
    p_job->>'analysis_status',
    (p_job->>'fetch_status_code')::integer,
    p_job->>'extraction_error',
    v_status,
    v_user_id
  )
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$function$;
