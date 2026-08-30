# Known gaps & manual steps

This document lists what is **not** fully automated and requires manual setup or future work.

## Infrastructure & deploy

| Gap | Detail |
|-----|--------|
| **No CI/CD** | Deploy is manual: `git pull` + `docker compose` on VPS |
| **Migrations manual** | SQL files must be applied via `psql` / `docker exec` — no migration runner in app |
| **Docker rebuild risk** | Full rebuild on ~3.8 GB RAM VPS can OOM; use `--no-build` for restarts |
| **N8N_API_KEY optional on server** | Server `.env` may lack API key; workflow re-export needs key or n8n UI export |

## n8n

| Gap | Detail |
|-----|--------|
| **Credentials in n8n UI** | Postgres, OpenAI credentials are configured in n8n, not in repo |
| **Template hardcoded user ID** | Template `Create Search Run` / `Fetch User Config` may still reference admin UUID until clone patches run |
| **Legacy workflows** | Old finder/analyzer still exist alongside Web Config — safe to archive manually |
| **Email scanner single-user** | Query uses `LIMIT 1` on `email_settings` — first enabled row only; not per-user yet |
| **Email draft vs published URL** | Unpublished n8n draft may show `localhost:3000`; published version must use production URL |
| **SearXNG instance** | Default SearXNG URL in config is external; not deployed by this repo |
| **DeepSeek in n8n** | Uses per-user API key from web config — user must add key in Settings |
| **Workflow publish** | Imported/cloned workflows must be **published** before webhooks and sub-workflows work |

## Canva

| Gap | Detail |
|-----|--------|
| **Developer app manual** | Public integration must be created at canva.com/developers |
| **Per-user OAuth manual** | Each user connects their own Canva account in Settings |
| **Redirect URI** | Must be registered exactly for each environment (prod/staging) |

## Web app

| Gap | Detail |
|-----|--------|
| **No automated tests** | No test suite in CI |
| **OpenAI fallback** | Server `OPENAI_API_KEY` used when user has no personal key |
| **IMAP passwords in DB** | Stored for email sync — consider app-level encryption hardening |
| **Profile photo in Postgres** | Stored as bytea — large photos increase DB size |
| **Manual run limits** | Default daily limit; bypass via `MANUAL_RUN_UNLIMITED_EMAILS` env |

## Multi-user signup

| Gap | Detail |
|-----|--------|
| **n8n provisioning needs API key** | `N8N_API_KEY` on web app required to clone workflows on signup |
| **Provisioning failures silent?** | If clone fails, user may lack personal webhook — check logs / re-run provision |
| **Analyzer executeWorkflow ID** | Cloned finder must point to cloned analyzer, not template ID |

## Security & ops

| Gap | Detail |
|-----|--------|
| **Secrets in git** | Exports sanitized; never commit `deploy/.env` |
| **No backup automation** | Postgres backups not defined in this repo |
| **No monitoring/alerting** | No health checks beyond manual curl |

## Recommended follow-ups

1. Add `N8N_API_KEY` to server `.env` for automated workflow export/deploy
2. Email scanner: loop all users' `email_settings` where `scan_enabled`
3. CI: lint + build on push; optional deploy workflow
4. Migration tool or numbered apply script with tracking table
5. Archive legacy n8n workflows after verifying all users on Web Config clones
