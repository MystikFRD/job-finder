-- Fix: SELECT id, version INTO composite row assigned version into application_id (uuid)
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
    SELECT * INTO v_doc
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
