-- Phase 4-6: email settings, action items, drafts, interviews, assistant cache

ALTER TABLE public.user_profile
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS github_url text,
  ADD COLUMN IF NOT EXISTS portfolio_url text;

CREATE TABLE IF NOT EXISTS public.email_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  imap_host text,
  imap_port integer DEFAULT 993,
  imap_user text,
  imap_password text,
  imap_secure boolean NOT NULL DEFAULT true,
  scan_enabled boolean NOT NULL DEFAULT false,
  last_scan_at timestamptz,
  last_scan_status text,
  last_scan_error text,
  auto_update_min_confidence numeric(3,2) NOT NULL DEFAULT 0.85,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

INSERT INTO public.email_settings (imap_host)
SELECT NULL
WHERE NOT EXISTS (SELECT 1 FROM public.email_settings LIMIT 1);

CREATE TABLE IF NOT EXISTS public.action_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type text NOT NULL,
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'normal',
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  application_id uuid REFERENCES public.applications(id) ON DELETE SET NULL,
  email_id uuid REFERENCES public.emails(id) ON DELETE SET NULL,
  due_at timestamptz,
  dismissed_at timestamptz,
  completed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS action_items_open_idx
  ON public.action_items (created_at DESC)
  WHERE dismissed_at IS NULL AND completed_at IS NULL;

CREATE TABLE IF NOT EXISTS public.email_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id uuid REFERENCES public.emails(id) ON DELETE CASCADE,
  application_id uuid REFERENCES public.applications(id) ON DELETE SET NULL,
  draft_type text NOT NULL DEFAULT 'reply',
  subject text,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  scheduled_at timestamptz,
  interview_type text NOT NULL DEFAULT 'video',
  location text,
  notes text,
  preparation_notes text,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS interviews_application_id_idx ON public.interviews (application_id);

ALTER TABLE public.emails
  ADD COLUMN IF NOT EXISTS body_preview text,
  ADD COLUMN IF NOT EXISTS matched_application_id uuid REFERENCES public.applications(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS auto_status_updated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_review boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.match_email_to_application(
  p_from text,
  p_subject text,
  p_body text
)
RETURNS TABLE(application_id uuid, confidence numeric, match_reason text)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  v_from_domain text;
  v_search text;
BEGIN
  v_from_domain := lower(split_part(split_part(coalesce(p_from, ''), '@', 2), '>', 1));
  v_search := lower(coalesce(p_subject, '') || ' ' || coalesce(p_body, ''));

  RETURN QUERY
  SELECT a.id,
         CASE
           WHEN v_search ILIKE '%' || j.job_title || '%' AND v_search ILIKE '%' || j.company || '%' THEN 0.95
           WHEN v_search ILIKE '%' || j.company || '%' THEN 0.80
           WHEN c.name IS NOT NULL AND v_search ILIKE '%' || c.name || '%' THEN 0.75
           WHEN v_from_domain <> '' AND v_from_domain ILIKE '%' || split_part(replace(lower(c.name), ' ', ''), '.', 1) || '%' THEN 0.70
           ELSE 0.40
         END::numeric AS confidence,
         CASE
           WHEN v_search ILIKE '%' || j.job_title || '%' THEN 'job_title_in_content'
           WHEN v_search ILIKE '%' || j.company || '%' THEN 'company_in_content'
           ELSE 'weak_match'
         END AS match_reason
  FROM applications a
  JOIN jobs j ON j.id = a.job_id
  LEFT JOIN companies c ON c.id = a.company_id
  WHERE a.status NOT IN ('withdrawn', 'rejected', 'accepted')
  ORDER BY 2 DESC
  LIMIT 1;
END;
$function$;

CREATE OR REPLACE FUNCTION public.store_classified_email(
  p_message_id text,
  p_from text,
  p_to text,
  p_subject text,
  p_body text,
  p_received_at timestamptz,
  p_category text,
  p_confidence numeric,
  p_application_id uuid DEFAULT NULL
)
RETURNS public.emails
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_email public.emails;
  v_app_id uuid;
  v_conf numeric;
  v_min_conf numeric;
  v_cat public.email_category;
  v_status public.application_status;
BEGIN
  IF p_message_id IS NOT NULL AND EXISTS (SELECT 1 FROM emails WHERE message_id = p_message_id) THEN
    SELECT * INTO v_email FROM emails WHERE message_id = p_message_id LIMIT 1;
    RETURN v_email;
  END IF;

  BEGIN
    v_cat := p_category::public.email_category;
  EXCEPTION WHEN OTHERS THEN
    v_cat := 'unknown'::public.email_category;
  END;

  v_app_id := p_application_id;
  v_conf := coalesce(p_confidence, 0);

  IF v_app_id IS NULL THEN
    SELECT m.application_id, m.confidence INTO v_app_id, v_conf
    FROM match_email_to_application(p_from, p_subject, p_body) m
    LIMIT 1;
  END IF;

  INSERT INTO emails (
    message_id, from_address, to_address, subject, body_text, body_preview,
    received_at, category, classification_confidence,
    application_id, matched_application_id, job_id, company_id, requires_review
  )
  SELECT
    p_message_id, p_from, p_to, p_subject, p_body, left(p_body, 500),
    coalesce(p_received_at, timezone('utc', now())), v_cat, v_conf,
    v_app_id, v_app_id,
    a.job_id, a.company_id,
    v_conf < 0.85
  FROM (SELECT 1) _
  LEFT JOIN applications a ON a.id = v_app_id
  RETURNING * INTO v_email;

  IF v_app_id IS NOT NULL THEN
    SELECT auto_update_min_confidence INTO v_min_conf FROM email_settings ORDER BY created_at LIMIT 1;
    v_min_conf := coalesce(v_min_conf, 0.85);

    IF v_conf >= v_min_conf THEN
      v_status := CASE v_cat
        WHEN 'application_received' THEN 'waiting'::public.application_status
        WHEN 'rejection' THEN 'rejected'::public.application_status
        WHEN 'interview_invitation' THEN 'interview'::public.application_status
        WHEN 'offer' THEN 'offer'::public.application_status
        WHEN 'request_for_information' THEN 'waiting'::public.application_status
        WHEN 'assessment_invitation' THEN 'waiting'::public.application_status
        WHEN 'technical_test' THEN 'waiting'::public.application_status
        ELSE NULL
      END;

      IF v_status IS NOT NULL THEN
        UPDATE applications
        SET status = v_status,
            last_response_at = timezone('utc', now()),
            updated_at = timezone('utc', now())
        WHERE id = v_app_id;

        UPDATE emails SET auto_status_updated = true WHERE id = v_email.id;

        INSERT INTO application_events (application_id, event_type, title, description, metadata)
        VALUES (
          v_app_id,
          'email_' || v_cat::text,
          'Email classified: ' || replace(v_cat::text, '_', ' '),
          coalesce(p_subject, 'No subject'),
          jsonb_build_object('email_id', v_email.id, 'confidence', v_conf, 'auto_updated', true)
        );
      END IF;
    ELSE
      INSERT INTO action_items (item_type, title, description, application_id, email_id, priority)
      VALUES (
        'email_review',
        'Review email classification',
        coalesce(p_subject, 'Uncertain email match'),
        v_app_id, v_email.id, 'high'
      );
    END IF;
  END IF;

  RETURN v_email;
END;
$function$;

CREATE OR REPLACE FUNCTION public.save_application_document(
  p_application_id uuid,
  p_document_type text,
  p_title text,
  p_content text,
  p_create_version boolean DEFAULT false
)
RETURNS public.application_documents
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_doc public.application_documents;
  v_version integer;
BEGIN
  IF p_create_version THEN
    UPDATE application_documents SET is_current = false
    WHERE application_id = p_application_id AND document_type = p_document_type AND is_current = true;

    SELECT coalesce(max(version), 0) + 1 INTO v_version
    FROM application_documents
    WHERE application_id = p_application_id AND document_type = p_document_type;
  ELSE
    SELECT id, version INTO v_doc
    FROM application_documents
    WHERE application_id = p_application_id AND document_type = p_document_type AND is_current = true
    LIMIT 1;

    IF v_doc.id IS NOT NULL THEN
      UPDATE application_documents
      SET content = p_content, title = coalesce(p_title, title), updated_at = timezone('utc', now())
      WHERE id = v_doc.id
      RETURNING * INTO v_doc;
      RETURN v_doc;
    END IF;
    v_version := 1;
  END IF;

  INSERT INTO application_documents (application_id, document_type, title, content, version, is_current)
  VALUES (p_application_id, p_document_type, p_title, p_content, v_version, true)
  RETURNING * INTO v_doc;

  INSERT INTO application_events (application_id, event_type, title, description)
  VALUES (p_application_id, 'document_saved', 'Document saved', coalesce(p_title, p_document_type));

  RETURN v_doc;
END;
$function$;
