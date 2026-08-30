-- Search settings: configurable job finder parameters (used by n8n Web Config workflows)

CREATE TABLE IF NOT EXISTS public.search_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  search_queries jsonb NOT NULL DEFAULT '[]'::jsonb,
  preferred_locations jsonb NOT NULL DEFAULT '["köln","koeln","cologne"]'::jsonb,
  match_skills jsonb NOT NULL DEFAULT '[]'::jsonb,
  profile_languages jsonb NOT NULL DEFAULT '["german","deutsch","english","englisch"]'::jsonb,
  wants_working_student boolean NOT NULL DEFAULT true,
  min_match_score integer NOT NULL DEFAULT 40,
  allow_remote_outside_locations boolean NOT NULL DEFAULT true,
  searxng_base_url text NOT NULL DEFAULT 'http://152.53.157.68:8080/search',
  role_keywords text NOT NULL DEFAULT 'Werkstudent / Working Student',
  tech_focus text NOT NULL DEFAULT 'AI, machine learning, software development, Python, React, frontend, automation, QA/testing, data science',
  max_jobs_per_run integer NOT NULL DEFAULT 20,
  schedule_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

INSERT INTO public.search_settings (
  search_queries,
  match_skills
)
SELECT
  '[
    "Werkstudent Informatik Köln",
    "Werkstudent Softwareentwicklung Köln",
    "Werkstudent Python Köln",
    "Werkstudent React Frontend Köln",
    "Working Student AI Machine Learning Cologne",
    "Werkstudent Data Science Köln",
    "Werkstudent QA Testautomatisierung Köln",
    "Werkstudent remote Deutschland Informatik"
  ]'::jsonb,
  '["Python","PyTorch","Git","React","JavaScript"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.search_settings LIMIT 1);

CREATE OR REPLACE FUNCTION public.get_search_config()
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
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
    'max_jobs_per_run', ss.max_jobs_per_run
  )
  FROM search_settings ss
  CROSS JOIN LATERAL (
    SELECT skills, languages FROM user_profile ORDER BY created_at ASC LIMIT 1
  ) up
  ORDER BY ss.created_at ASC
  LIMIT 1;
$$;
