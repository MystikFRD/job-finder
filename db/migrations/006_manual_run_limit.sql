-- Track manual job search triggers (max 1 per user per UTC day)

ALTER TABLE public.search_settings
  ADD COLUMN IF NOT EXISTS last_manual_run_at timestamptz;
