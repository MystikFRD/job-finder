#!/usr/bin/env node
/**
 * Export n8n workflows via REST API (requires N8N_API_KEY).
 * Usage: N8N_API_KEY=... node scripts/export-n8n-workflows.mjs
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const base = (process.env.N8N_API_URL ?? "https://orc.momoh.de/api/v1").replace(/\/$/, "");
const key = process.env.N8N_API_KEY;
if (!key) {
  console.error("Set N8N_API_KEY (and optionally N8N_API_URL)");
  process.exit(1);
}

const workflows = [
  ["finder-web-config.json", "ROTREzXrgqrC8ffZ", "Per-user job search template (Web Config)"],
  ["analyzer-web-config.json", "inw6qMHWkng6OdKs", "Per-user job analyzer template (Web Config)"],
  ["email-scanner.json", "eHyNMKAQcHbGKpM5", "Global IMAP email scanner"],
];

const rawDir = "db/n8n-exports/.raw";
fs.mkdirSync(rawDir, { recursive: true });

for (const [file, id] of workflows) {
  const res = await fetch(`${base}/workflows/${id}`, {
    headers: { "X-N8N-API-KEY": key },
  });
  if (!res.ok) {
    console.error(`Failed ${id}: ${res.status}`);
    process.exit(1);
  }
  const data = await res.json();
  const rawPath = path.join(rawDir, `${id}.json`);
  fs.writeFileSync(rawPath, JSON.stringify(data, null, 2));
  const meta = JSON.stringify({ sourceId: id, role: workflows.find((w) => w[0] === file)[2] });
  const r = spawnSync(
    "node",
    ["scripts/sanitize-n8n-export.mjs", rawPath, path.join("db/n8n-exports", file), meta],
    { stdio: "inherit" },
  );
  if (r.status !== 0) process.exit(r.status);
}

console.log("Done.");
