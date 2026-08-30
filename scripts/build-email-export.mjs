#!/usr/bin/env node
/** Build email-scanner export from n8n get_workflow_version payload. */
import fs from "fs";
import { spawnSync } from "child_process";

const versionPath = process.argv[2] ?? "db/n8n-exports/.raw/email-version.json";
const version = JSON.parse(fs.readFileSync(versionPath, "utf8"));

// Fix IMAP sync URL to production pattern (sanitize replaces with YOUR_DOMAIN)
for (const node of version.nodes ?? []) {
  if (node.name === "IMAP sync via web app") {
    node.parameters.url = "https://jobs.mubu.dev/api/email/sync";
  }
}

const raw = {
  workflow: {
    id: version.workflowId ?? "eHyNMKAQcHbGKpM5",
    name: "Email Scanner",
    settings: { executionOrder: "v1", availableInMCP: true },
    description:
      "Scheduled email scanner: fetch IMAP settings, classify emails with OpenAI, store via store_classified_email",
    nodes: version.nodes,
    connections: version.connections,
  },
};

const rawPath = "db/n8n-exports/.raw/email-raw.json";
fs.writeFileSync(rawPath, JSON.stringify(raw, null, 2));

spawnSync(
  "node",
  [
    "scripts/sanitize-n8n-export.mjs",
    rawPath,
    "db/n8n-exports/email-scanner.json",
    JSON.stringify({
      sourceId: "eHyNMKAQcHbGKpM5",
      role: "Global IMAP email scanner (every 15 min)",
    }),
  ],
  { stdio: "inherit" },
);
