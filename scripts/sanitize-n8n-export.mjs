#!/usr/bin/env node
/**
 * Sanitize n8n workflow JSON for git export.
 * Usage: node scripts/sanitize-n8n-export.mjs <input.json> <output.json> [meta-json]
 */
import fs from "fs";

const [inputPath, outputPath, metaJson = "{}"] = process.argv.slice(2);
if (!inputPath || !outputPath) {
  console.error("Usage: node sanitize-n8n-export.mjs <input> <output> [meta]");
  process.exit(1);
}

const REPLACEMENTS = [
  [/ylq3oCbaR8v1MZrrzqe53j6wgLcQv44C/g, "YOUR_N8N_INTERNAL_SECRET"],
  [/21a2cba1-6ba6-4aab-a44b-6e533f32503f/g, "YOUR_USER_UUID"],
  [/https:\/\/jobs\.mubu\.dev/g, "https://YOUR_DOMAIN"],
  [/http:\/\/localhost:3000/g, "https://YOUR_DOMAIN"],
  [/job-finder-manual-[a-f0-9]{24}/g, "job-finder-manual-YOUR_WEBHOOK_SUFFIX"],
];

function sanitize(obj) {
  let s = JSON.stringify(obj, null, 2);
  for (const [re, rep] of REPLACEMENTS) s = s.replace(re, rep);
  return JSON.parse(s);
}

function stripCredentialIds(nodes) {
  return nodes.map((n) => {
    const copy = { ...n };
    if (copy.credentials) {
      const creds = {};
      for (const [type, c] of Object.entries(copy.credentials)) {
        creds[type] = { name: c.name || type };
      }
      copy.credentials = creds;
    }
    return copy;
  });
}

const raw = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const wf = raw.workflow ?? raw;
const meta = JSON.parse(metaJson);

const doc = sanitize({
  name: wf.name,
  nodes: stripCredentialIds(wf.nodes),
  connections: wf.connections,
  settings: wf.settings ?? { executionOrder: "v1" },
  meta: {
    ...meta,
    exportedAt: new Date().toISOString(),
    importNote:
      "After import: re-map Postgres/OpenAI/DeepSeek credentials, set Fetch User Config URL + user_id, publish workflow.",
  },
});

fs.writeFileSync(outputPath, JSON.stringify(doc, null, 2));
console.log(`Wrote ${outputPath} (${doc.nodes.length} nodes)`);
