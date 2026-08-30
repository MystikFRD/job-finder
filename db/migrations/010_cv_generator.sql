-- CV generator: structured address + optional profile photo

ALTER TABLE public.user_profile
  ADD COLUMN IF NOT EXISTS address_street text,
  ADD COLUMN IF NOT EXISTS address_postal_code text,
  ADD COLUMN IF NOT EXISTS address_city text,
  ADD COLUMN IF NOT EXISTS address_country text DEFAULT 'Deutschland',
  ADD COLUMN IF NOT EXISTS include_address_on_cv boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS profile_photo_mime text,
  ADD COLUMN IF NOT EXISTS profile_photo bytea;
