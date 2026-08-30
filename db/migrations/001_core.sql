-- Job Finder core migrations: save_job_safe, missing columns, search_runs extensions

ALTER TABLE public.search_runs
  ADD COLUMN IF NOT EXISTS existing_jobs_seen integer,
  ADD COLUMN IF NOT EXISTS run_details jsonb;

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS analysis_status text,
  ADD COLUMN IF NOT EXISTS fetch_status_code integer,
  ADD COLUMN IF NOT EXISTS extraction_error text;

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
BEGIN
  IF p_job IS NULL OR p_job = '{}'::jsonb THEN
    RAISE EXCEPTION 'save_job_safe: empty job payload';
  END IF;

  v_url := NULLIF(trim(p_job->>'url'), '');
  v_fingerprint := public.compute_job_fingerprint(
    COALESCE(p_job->>'company', ''),
    COALESCE(p_job->>'job_title', '')
  );

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
    status
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
    v_status
  )
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$function$;
