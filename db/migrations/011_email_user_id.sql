-- Assign scanned emails to the mailbox owner so Inbox (filtered by user_id) can show them.

DROP FUNCTION IF EXISTS public.store_classified_email(text, text, text, text, text, timestamptz, text, numeric, uuid);

CREATE OR REPLACE FUNCTION public.match_email_to_application(
  p_from text,
  p_subject text,
  p_body text,
  p_user_id uuid DEFAULT NULL
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
    AND (p_user_id IS NULL OR a.user_id = p_user_id)
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
  p_application_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
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
  v_user_id uuid;
BEGIN
  v_user_id := p_user_id;

  IF p_message_id IS NOT NULL AND EXISTS (SELECT 1 FROM emails WHERE message_id = p_message_id) THEN
    UPDATE emails
    SET user_id = COALESCE(user_id, v_user_id)
    WHERE message_id = p_message_id AND user_id IS NULL;
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
    FROM match_email_to_application(p_from, p_subject, p_body, v_user_id) m
    LIMIT 1;
  END IF;

  IF v_user_id IS NULL AND v_app_id IS NOT NULL THEN
    SELECT user_id INTO v_user_id FROM applications WHERE id = v_app_id;
  END IF;

  IF v_user_id IS NULL AND p_to IS NOT NULL THEN
    SELECT user_id INTO v_user_id
    FROM email_settings
    WHERE imap_user IS NOT NULL
      AND imap_user <> ''
      AND lower(p_to) LIKE '%' || lower(imap_user) || '%'
    LIMIT 1;
  END IF;

  INSERT INTO emails (
    message_id, from_address, to_address, subject, body_text, body_preview,
    received_at, category, classification_confidence,
    application_id, matched_application_id, job_id, company_id, requires_review,
    user_id
  )
  SELECT
    p_message_id, p_from, p_to, p_subject, p_body, left(p_body, 500),
    coalesce(p_received_at, timezone('utc', now())), v_cat, v_conf,
    v_app_id, v_app_id,
    a.job_id, a.company_id,
    v_conf < 0.85,
    COALESCE(v_user_id, a.user_id)
  FROM (SELECT 1) _
  LEFT JOIN applications a ON a.id = v_app_id
  RETURNING * INTO v_email;

  IF v_app_id IS NOT NULL THEN
    SELECT auto_update_min_confidence INTO v_min_conf
    FROM email_settings
    WHERE (v_email.user_id IS NOT NULL AND user_id = v_email.user_id)
       OR v_email.user_id IS NULL
    ORDER BY CASE WHEN user_id = v_email.user_id THEN 0 ELSE 1 END, created_at
    LIMIT 1;
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
        WHERE id = v_app_id
          AND (v_email.user_id IS NULL OR user_id = v_email.user_id);

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
      INSERT INTO action_items (item_type, title, description, application_id, email_id, priority, user_id)
      VALUES (
        'email_review',
        'Review email classification',
        coalesce(p_subject, 'Uncertain email match'),
        v_app_id, v_email.id, 'high', v_email.user_id
      );
    END IF;
  END IF;

  RETURN v_email;
END;
$function$;

UPDATE emails e
SET user_id = s.user_id
FROM email_settings s
WHERE e.user_id IS NULL
  AND s.imap_user IS NOT NULL
  AND s.imap_user <> ''
  AND (
    e.to_address ILIKE '%' || s.imap_user || '%'
    OR (
      SELECT count(*) FROM email_settings
      WHERE imap_host IS NOT NULL AND imap_host <> ''
        AND imap_user IS NOT NULL AND imap_user <> ''
    ) = 1
  );
