-- Per-user Canva Connect OAuth tokens (encrypted at rest)

CREATE TABLE IF NOT EXISTS public.canva_connections (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  access_token_enc text NOT NULL,
  refresh_token_enc text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS canva_connections_expires_at_idx
  ON public.canva_connections (expires_at);
