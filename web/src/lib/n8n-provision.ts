import { createHash } from "crypto";
import { queryOne } from "./db";

const FINDER_TEMPLATE =
  process.env.N8N_TEMPLATE_FINDER_WORKFLOW_ID ?? "ROTREzXrgqrC8ffZ";
const ANALYZER_TEMPLATE =
  process.env.N8N_TEMPLATE_ANALYZER_WORKFLOW_ID ?? "inw6qMHWkng6OdKs";

function n8nHeaders(): HeadersInit {
  const key = process.env.N8N_API_KEY;
  if (!key) throw new Error("N8N_API_KEY is not configured");
  return {
    "X-N8N-API-KEY": key,
    "Content-Type": "application/json",
  };
}

function n8nBaseUrl(): string {
  const base = process.env.N8N_API_URL;
  if (!base) throw new Error("N8N_API_URL is not configured");
  return base.replace(/\/$/, "");
}

function patchWorkflowForUser(
  workflow: Record<string, unknown>,
  userId: string,
  label: string,
): Record<string, unknown> {
  const copy = structuredClone(workflow) as {
    id?: string;
    name: string;
    active?: boolean;
    nodes?: Array<Record<string, unknown>>;
  };
  delete copy.id;
  copy.name = `${label} (${userId.slice(0, 8)})`;
  copy.active = false;

  const appBase =
    process.env.N8N_WEB_CONFIG_URL ?? "https://jobs.mubu.dev";
  const internalSecret = process.env.N8N_INTERNAL_SECRET ?? "";

  for (const node of copy.nodes ?? []) {
    const name = String(node.name ?? "");
    const params = (node.parameters ?? {}) as Record<string, unknown>;

    if (name === "Get Search Config") {
      params.query = `SELECT get_search_config('${userId}'::uuid) AS config`;
      node.parameters = params;
    }

    if (name === "Get Match Config") {
      params.query = `SELECT get_search_config('${userId}'::uuid) AS config`;
      node.parameters = params;
    }

    if (name === "Manual Run Webhook") {
      const digest = createHash("sha256")
        .update(`${internalSecret}:${userId}`)
        .digest("hex")
        .slice(0, 24);
      params.path = `job-finder-manual-${digest}`;
      params.httpMethod = "POST";
      node.parameters = params;
    }

    if (name === "Fetch User Config" || name === "Get User Config") {
      params.url = `${appBase}/api/n8n/user-config?user_id=${userId}`;
      if (params.headerParameters && typeof params.headerParameters === "object") {
        const headers = params.headerParameters as {
          parameters?: Array<{ name: string; value: string }>;
        };
        for (const h of headers.parameters ?? []) {
          if (h.name === "X-N8N-Secret") h.value = internalSecret;
        }
      }
      node.parameters = params;
    }
  }

  return copy;
}

async function duplicateWorkflow(
  templateId: string,
  userId: string,
  label: string,
): Promise<string> {
  const base = n8nBaseUrl();
  const getRes = await fetch(`${base}/workflows/${templateId}`, {
    headers: n8nHeaders(),
  });
  if (!getRes.ok) {
    throw new Error(`Failed to load n8n template ${templateId}: ${getRes.status}`);
  }
  const template = (await getRes.json()) as Record<string, unknown>;
  const payload = patchWorkflowForUser(template, userId, label);

  const createRes = await fetch(`${base}/workflows`, {
    method: "POST",
    headers: n8nHeaders(),
    body: JSON.stringify(payload),
  });
  if (!createRes.ok) {
    const text = await createRes.text();
    throw new Error(`Failed to create n8n workflow: ${createRes.status} ${text}`);
  }
  const created = (await createRes.json()) as { id: string };
  return created.id;
}

export async function provisionUserWorkflows(
  userId: string,
  email: string,
): Promise<{ finderId: string | null; analyzerId: string | null }> {
  if (!process.env.N8N_API_KEY || !process.env.N8N_API_URL) {
    console.warn("n8n provisioning skipped: N8N_API_KEY or N8N_API_URL missing");
    return { finderId: null, analyzerId: null };
  }

  const shortEmail = email.split("@")[0] ?? "user";
  const finderId = await duplicateWorkflow(
    FINDER_TEMPLATE,
    userId,
    `Automatic Job Finder Web Config — ${shortEmail}`,
  );
  const analyzerId = await duplicateWorkflow(
    ANALYZER_TEMPLATE,
    userId,
    `Job Analyzer Web Config — ${shortEmail}`,
  );

  await queryOne(
    `UPDATE users SET
       n8n_finder_workflow_id = $2,
       n8n_analyzer_workflow_id = $3,
       updated_at = timezone('utc', now())
     WHERE id = $1`,
    [userId, finderId, analyzerId],
  );

  const base = n8nBaseUrl();
  await fetch(`${base}/workflows/${finderId}`, {
    method: "PATCH",
    headers: n8nHeaders(),
    body: JSON.stringify({ active: true }),
  });

  return { finderId, analyzerId };
}
