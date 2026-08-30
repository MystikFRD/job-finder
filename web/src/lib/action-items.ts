import { query } from "./db";
import { requireUserId } from "./auth";
import type { ActionItem } from "./types";

export async function getActionItems(): Promise<ActionItem[]> {
  const userId = await requireUserId();
  const dynamic = await query<ActionItem>(
    `SELECT * FROM (
      SELECT
        ('draft-' || a.id::text) AS id,
        'draft_ready' AS item_type,
        'Review application draft' AS title,
        j.company || ' — ' || j.job_title AS description,
        'high' AS priority,
        a.job_id,
        a.id AS application_id,
        NULL::uuid AS email_id,
        NULL::timestamptz AS due_at,
        NULL::timestamptz AS dismissed_at,
        NULL::timestamptz AS completed_at,
        '{}'::jsonb AS metadata,
        a.updated_at AS created_at
      FROM applications a
      JOIN jobs j ON j.id = a.job_id
      WHERE a.user_id = $1 AND a.status IN ('draft', 'ready')
        AND EXISTS (
          SELECT 1 FROM application_documents d
          WHERE d.application_id = a.id AND d.is_current = true AND length(d.content) > 100
        )

      UNION ALL

      SELECT
        ('highmatch-' || j.id::text),
        'high_match_job',
        'New high-match job',
        j.company || ' — ' || j.job_title || ' (' || j.match_score || ')',
        'high',
        j.id,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        '{}'::jsonb,
        j.first_seen_at
      FROM jobs j
      WHERE j.user_id = $1 AND j.match_score >= 80 AND j.status = 'new'
        AND j.first_seen_at > timezone('utc', now()) - interval '7 days'

      UNION ALL

      SELECT
        ('waiting-' || a.id::text),
        'no_response',
        'No response for 14+ days',
        j.company || ' — ' || j.job_title,
        'normal',
        a.job_id,
        a.id,
        NULL,
        NULL,
        NULL,
        NULL,
        '{}'::jsonb,
        a.applied_at
      FROM applications a
      JOIN jobs j ON j.id = a.job_id
      WHERE a.user_id = $1 AND a.status IN ('submitted', 'waiting')
        AND a.applied_at IS NOT NULL
        AND a.applied_at < timezone('utc', now()) - interval '14 days'

      UNION ALL

      SELECT
        ('interview-' || i.id::text),
        'interview_soon',
        'Interview coming up',
        coalesce(i.interview_type, 'Interview') || ' — ' || j.company,
        'high',
        a.job_id,
        a.id,
        NULL,
        i.scheduled_at,
        NULL,
        NULL,
        jsonb_build_object('interview_id', i.id),
        i.created_at
      FROM interviews i
      JOIN applications a ON a.id = i.application_id
      JOIN jobs j ON j.id = a.job_id
      WHERE a.user_id = $1 AND NOT i.completed
        AND i.scheduled_at IS NOT NULL
        AND i.scheduled_at > timezone('utc', now())
        AND i.scheduled_at < timezone('utc', now()) + interval '3 days'

      UNION ALL

      SELECT
        id::text,
        item_type,
        title,
        description,
        priority,
        job_id,
        application_id,
        email_id,
        due_at,
        dismissed_at,
        completed_at,
        metadata,
        created_at
      FROM action_items
      WHERE user_id = $1 AND dismissed_at IS NULL AND completed_at IS NULL
    ) items
    ORDER BY
      CASE priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END,
      created_at DESC
    LIMIT 30`,
    [userId],
  );

  return dynamic;
}

export async function dismissActionItem(id: string) {
  if (id.startsWith("draft-") || id.startsWith("highmatch-") || id.startsWith("waiting-") || id.startsWith("interview-")) {
    return { ok: true };
  }
  await query(
    `UPDATE action_items SET dismissed_at = timezone('utc', now()) WHERE id = $1::uuid`,
    [id],
  );
  return { ok: true };
}
