# n8n workflow exports

Sanitized JSON exports for import into n8n. **Secrets and credential IDs are replaced with placeholders.**

| File | n8n ID | Role |
|------|--------|------|
| `finder-web-config.json` | `ROTREzXrgqrC8ffZ` | Template: daily job search + DeepSeek filter |
| `analyzer-web-config.json` | `inw6qMHWkng6OdKs` | Template: fetch job page, extract + match score |
| `email-scanner.json` | `eHyNMKAQcHbGKpM5` | Global: IMAP sync every 15 min + OpenAI classify |

## Import

1. n8n → **Workflows** → **Import from file**
2. Re-map credentials: **Postgres account**, **OpenAI account** (email scanner), DeepSeek uses API key from web config
3. Update **Fetch User Config** URL and `X-N8N-Secret` (finder/analyzer templates)
4. **Publish** the workflow

## Re-export from production

```bash
N8N_API_KEY=... node scripts/export-n8n-workflows.mjs
```

Or sanitize a manual export:

```bash
node scripts/sanitize-n8n-export.mjs raw.json db/n8n-exports/out.json '{"sourceId":"..."}'
```

See [docs/N8N.md](../docs/N8N.md) for full setup.
