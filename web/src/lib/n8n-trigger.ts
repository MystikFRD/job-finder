import { createHash } from "crypto";
import { requireUserId } from "./auth";
import { query, queryOne } from "./db";
import { defaultFinderWorkflowId } from "./n8n-client";

export interface ManualRunStatus {
  canRunToday: boolean;
  lastManualRunAt: string | null;
  unlimitedManualRuns: boolean;
}

function parseUnlimitedUserIds(): Set<string> {
  const raw = process.env.MANUAL_RUN_UNLIMITED_USER_IDS ?? "";
  return new Set(
    raw
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );
}

async function hasUnlimitedManualRuns(userId: string): Promise<boolean> {
  if (parseUnlimitedUserIds().has(userId)) return true;

  const emails = (process.env.MANUAL_RUN_UNLIMITED_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (!emails.length) return false;

  const row = await queryOne<{ email: string }>(
    `SELECT email FROM users WHERE id = $1`,
    [userId],
  );
  return row ? emails.includes(row.email.toLowerCase()) : false;
}

function isSameUtcDay(a: Date, b: Date): boolean {
  return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);
}

export async function getManualRunStatus(
  userId: string,
): Promise<ManualRunStatus> {
  const unlimitedManualRuns = await hasUnlimitedManualRuns(userId);
  if (unlimitedManualRuns) {
    const row = await queryOne<{ last_manual_run_at: string | null }>(
      `SELECT last_manual_run_at FROM search_settings WHERE user_id = $1`,
      [userId],
    );
    return {
      canRunToday: true,
      lastManualRunAt: row?.last_manual_run_at ?? null,
      unlimitedManualRuns: true,
    };
  }

  const row = await queryOne<{ last_manual_run_at: string | null }>(
    `SELECT last_manual_run_at FROM search_settings WHERE user_id = $1`,
    [userId],
  );
  const last = row?.last_manual_run_at
    ? new Date(row.last_manual_run_at)
    : null;
  const canRunToday = !last || !isSameUtcDay(last, new Date());
  return {
    canRunToday,
    lastManualRunAt: row?.last_manual_run_at ?? null,
    unlimitedManualRuns: false,
  };
}

export async function assertManualRunAllowed(userId: string): Promise<void> {
  if (await hasUnlimitedManualRuns(userId)) return;

  const { canRunToday } = await getManualRunStatus(userId);
  if (!canRunToday) {
    throw new Error(
      "Manual search limit: one run per day. Try again tomorrow, or wait for the scheduled run at 08:00.",
    );
  }
}

async function recordManualRun(userId: string): Promise<void> {
  await query(
    `UPDATE search_settings SET
       last_manual_run_at = timezone('utc', now()),
       updated_at = timezone('utc', now())
     WHERE user_id = $1`,
    [userId],
  );
}

export async function getFinderWorkflowId(userId: string): Promise<string> {
  const row = await queryOne<{ n8n_finder_workflow_id: string | null }>(
    `SELECT n8n_finder_workflow_id FROM users WHERE id = $1`,
    [userId],
  );
  return row?.n8n_finder_workflow_id ?? defaultFinderWorkflowId();
}

async function expireStaleSearchRuns(userId: string): Promise<void> {
  // n8n often finishes in ~15–60s but may skip Complete Search Run; auto-close stale UI state.
  await query(
    `UPDATE search_runs
     SET status = 'completed',
         finished_at = timezone('utc', now()),
         run_details = COALESCE(run_details, '{}'::jsonb) || '{"auto_closed":true}'::jsonb
     WHERE user_id = $1
       AND status = 'running'
       AND started_at <= timezone('utc', now()) - interval '3 minutes'`,
    [userId],
  );

  await query(
    `UPDATE search_runs
     SET status = 'failed',
         finished_at = timezone('utc', now()),
         run_details = COALESCE(run_details, '{}'::jsonb) || '{"error":"Run timed out"}'::jsonb
     WHERE user_id = $1
       AND status = 'running'
       AND started_at <= timezone('utc', now()) - interval '1 hour'`,
    [userId],
  );
}

export async function refreshSearchRunState(userId: string): Promise<void> {
  await expireStaleSearchRuns(userId);
}

export async function assertNoActiveSearchRun(userId: string): Promise<void> {
  await expireStaleSearchRuns(userId);

  const running = await queryOne<{ id: string }>(
    `SELECT id FROM search_runs
     WHERE user_id = $1 AND status = 'running'
       AND started_at > timezone('utc', now()) - interval '1 hour'
     LIMIT 1`,
    [userId],
  );
  if (running) {
    throw new Error(
      "A search is already running. Check Search Runs — it may take several minutes.",
    );
  }
}

export function manualRunWebhookPath(userId: string): string {
  const secret = process.env.N8N_INTERNAL_SECRET ?? "";
  const digest = createHash("sha256")
    .update(`${secret}:${userId}`)
    .digest("hex")
    .slice(0, 24);
  return `job-finder-manual-${digest}`;
}

export function manualRunWebhookUrl(userId: string): string {
  if (process.env.N8N_WEBHOOK_RUN_URL) {
    return process.env.N8N_WEBHOOK_RUN_URL;
  }
  const base = (process.env.N8N_WEBHOOK_BASE ?? "https://orc.momoh.de").replace(
    /\/$/,
    "",
  );
  return `${base}/webhook/${manualRunWebhookPath(userId)}`;
}

async function triggerViaWebhook(
  userId: string,
  workflowId: string,
): Promise<{ executionId: string; workflowId: string }> {
  const secret = process.env.N8N_INTERNAL_SECRET;
  if (!secret) {
    throw new Error(
      "Manual search is not configured (N8N_INTERNAL_SECRET missing).",
    );
  }

  const url = manualRunWebhookUrl(userId);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-N8N-Secret": secret,
    },
    body: JSON.stringify({ user_id: userId, source: "jobs.mubu.dev" }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `n8n webhook trigger failed (${res.status}): ${text || "unknown error"}`,
    );
  }

  await recordManualRun(userId);
  return { executionId: "webhook", workflowId };
}

export async function triggerFinderWorkflow(
  userId: string,
): Promise<{ executionId: string; workflowId: string }> {
  await assertManualRunAllowed(userId);
  await assertNoActiveSearchRun(userId);
  const workflowId = await getFinderWorkflowId(userId);

  // n8n's public API has no workflow execute endpoint (POST returns 405).
  // Manual runs use the per-user production webhook on the finder workflow.
  try {
    return await triggerViaWebhook(userId, workflowId);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown error";
    throw new Error(
      `Could not start n8n workflow via webhook. Ensure the finder workflow is published and has a Manual Run Webhook node. (${detail})`,
    );
  }
}

export async function triggerFinderForCurrentUser() {
  const userId = await requireUserId();
  return triggerFinderWorkflow(userId);
}
