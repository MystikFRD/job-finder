# n8n workflows

## Workflow inventory

| Name | ID | Trigger | Template? |
|------|-----|---------|-----------|
| Automatic Job Finder (Web Config) | `ROTREzXrgqrC8ffZ` | Daily 08:00 + manual webhook | Yes — cloned per user |
| Job Analyzer (Web Config) | `inw6qMHWkng6OdKs` | Called by finder | Yes — cloned per user |
| Email Scanner | `eHyNMKAQcHbGKpM5` | Every 15 min | No — shared |

JSON exports (sanitized): `db/n8n-exports/`.

## Import fresh instance

1. **Import** each JSON file in n8n (Workflows → Import from file)
2. **Credentials** — create and assign:
   - **Postgres account** — same DB as web app
   - **OpenAI account** — email scanner classification only
   - DeepSeek — no n8n credential; uses user's key from web config HTTP node
3. **Patch template nodes** (for admin template only):
   - **Fetch User Config**: URL + `X-N8N-Secret`
   - **Create Search Run**: `user_id` in INSERT
   - **Manual Run Webhook**: unique path (auto-patched on clone)
4. **Publish** workflows (required for webhooks + sub-workflow calls)
5. Set env on web app:
   ```
   N8N_TEMPLATE_FINDER_WORKFLOW_ID=ROTREzXrgqrC8ffZ
   N8N_TEMPLATE_ANALYZER_WORKFLOW_ID=inw6qMHWkng6OdKs
   N8N_INTERNAL_SECRET=<same as n8n header>
   N8N_WEB_CONFIG_URL=https://jobs.mubu.dev
   ```

## Finder flow (Web Config)

1. **Fetch User Config** — HTTP to web app
2. **Create Search Run** — insert into `search_runs`
3. **Build Search Queries** — from user's `search_queries` setting
4. **SearXNG Search** — meta-search per query
5. **Merge** → **DeepSeek Filter** — extract job list (structured JSON)
6. **Parse Jobs** → location filter → semantic dedupe
7. **Check Job Database** — skip known URLs/fingerprints
8. **Call Job Analyzer** — sub-workflow per new job
9. **Save Job to Database** — `save_job_safe()`
10. **Complete Search Run** — stats back to dashboard

Manual run: POST to user's webhook URL (shown in Settings after provisioning).

## Analyzer flow

1. Receive job URL + metadata from finder
2. Fetch job page (HTTP)
3. OpenAI/DeepSeek extraction of structured fields
4. Match scoring against user profile
5. Return enriched job to finder for DB save

## Email scanner flow

1. Read first enabled row from `email_settings`
2. POST `https://YOUR_DOMAIN/api/email/sync` — web app fetches IMAP
3. For each email: OpenAI classify → `store_classified_email()`

**Note:** Email scanner uses `LIMIT 1` — multi-user email requires a future change (see [GAPS.md](GAPS.md)).

## Re-export workflows

With n8n API key:

```bash
export N8N_API_KEY=...
export N8N_API_URL=https://orc.momoh.de/api/v1
node scripts/export-n8n-workflows.mjs
```

Exports are sanitized: secrets → `YOUR_N8N_INTERNAL_SECRET`, user IDs → `YOUR_USER_UUID`, domains → `YOUR_DOMAIN`.

## Legacy workflows

These exist in n8n but are **not** templates for new users:

- `uLK7o4ilL7JGl7Pr` — Automatic Job Finder (Postgres config)
- `TyH8REF0knQRYCN0` — Job Analyzer (legacy)

Safe to archive after confirming all users use Web Config clones.

## Troubleshooting

| Symptom | Check |
|---------|-------|
| Empty dashboard after search | Finder published? Fetch User Config URL/secret correct? |
| 401 on user-config | `N8N_INTERNAL_SECRET` mismatch |
| Analyzer sub-workflow fails | Analyzer published? ID in Execute Workflow node |
| Email not syncing | IMAP in Settings; Email Scanner URL = production domain |
| Manual run 404 | User's webhook path — re-provision or check `n8n_workflow_ids` |
