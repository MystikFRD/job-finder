const FINDER_TEMPLATE =
  process.env.N8N_TEMPLATE_FINDER_WORKFLOW_ID ?? "ROTREzXrgqrC8ffZ";

export function n8nHeaders(apiKey?: string | null): HeadersInit {
  const key = apiKey ?? process.env.N8N_API_KEY;
  if (!key) {
    throw new Error("N8N API key is not configured");
  }
  return {
    "X-N8N-API-KEY": key,
    "Content-Type": "application/json",
  };
}

export function n8nBaseUrl(): string {
  const base = process.env.N8N_API_URL ?? "https://orc.momoh.de/api/v1";
  return base.replace(/\/$/, "");
}

export function defaultFinderWorkflowId(): string {
  return FINDER_TEMPLATE;
}

export function n8nSettingsUrl(): string {
  return process.env.N8N_WEBHOOK_BASE ?? "https://orc.momoh.de";
}
