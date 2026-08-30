-- Per-user n8n API key (encrypted) for manual workflow triggers

ALTER TABLE public.search_settings
  ADD COLUMN IF NOT EXISTS n8n_api_key_enc text;
