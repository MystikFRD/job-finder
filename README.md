# Job Finder — Personal Job Search CRM

Full-stack job search CRM: **n8n** automation + **PostgreSQL** + **Next.js** dashboard.

**Production:** [https://jobs.mubu.dev](https://jobs.mubu.dev)

## What it does

- **Automated job search** — SearXNG + DeepSeek filter, dedupe, AI analysis, match scoring
- **Dashboard & pipeline** — jobs list, Kanban applications, companies view
- **AI applications** — cover letter generator, PDF/Word export, version history
- **Canva** — per-user OAuth; open cover letter or CV in Canva for design
- **CV generator** — structured profile, photo upload, PDF/Word export, Canva export
- **Email inbox** — IMAP sync, AI classification, status updates
- **Multi-user** — signup, per-user search settings, per-user n8n workflow clones

AI **never** auto-sends applications or emails. Drafts only — you review and submit.

## Architecture

| Layer | Role |
|-------|------|
| **n8n** (`orc.momoh.de`) | Job finder, analyzer, email scanner |
| **PostgreSQL** (`supabase-db`) | Source of truth |
| **web/** (Next.js) | Dashboard, settings, APIs, Canva OAuth |

```
Settings (web) → get_search_config() / /api/n8n/user-config
       ↓
n8n Finder → SearXNG → DeepSeek → Analyzer → save_job_safe()
       ↓
Dashboard ← PostgreSQL
```

## n8n workflows (production)

| Workflow | ID | Export |
|----------|-----|--------|
| Automatic Job Finder (Web Config) | `ROTREzXrgqrC8ffZ` | `db/n8n-exports/finder-web-config.json` |
| Job Analyzer (Web Config) | `inw6qMHWkng6OdKs` | `db/n8n-exports/analyzer-web-config.json` |
| Email Scanner | `eHyNMKAQcHbGKpM5` | `db/n8n-exports/email-scanner.json` |

Legacy single-user workflows (`uLK7o4ilL7JGl7Pr`, `TyH8REF0knQRYCN0`) are **not** used as templates anymore.

## Quick start (local)

```bash
cd web
cp .env.example .env.local   # if present, else see deploy/.env.example
# DATABASE_URL = same Postgres as n8n
npm install
npm run dev
```

Open `http://localhost:3000`.

## Documentation

| Doc | Contents |
|-----|----------|
| [docs/SETUP.md](docs/SETUP.md) | Local dev, env vars, migrations |
| [docs/DEPLOY.md](docs/DEPLOY.md) | VPS Docker deploy, nginx, TLS |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Data flow, APIs, multi-user |
| [docs/N8N.md](docs/N8N.md) | Workflow import, credentials, provisioning |
| [docs/CANVA.md](docs/CANVA.md) | Canva Connect app setup |
| [docs/GAPS.md](docs/GAPS.md) | Manual steps & known limitations |

## Deploy (summary)

| | |
|---|---|
| **Domain** | `jobs.mubu.dev` |
| **Server** | Tailscale `100.123.67.63`, path `/opt/job-finder` |
| **n8n** | `orc.momoh.de` (separate host) |

```bash
# On server — restart without rebuild (safe on small VPS)
cd /opt/job-finder/deploy && docker compose up -d --no-build job-finder-web
```

See [docs/DEPLOY.md](docs/DEPLOY.md) for full instructions.

## Migrations

SQL files in `db/migrations/` (001–010). Apply manually to Postgres — see [docs/SETUP.md](docs/SETUP.md).

## Safety

- Secrets live in `deploy/.env` on the server — never commit `.env`
- n8n exports in git are **sanitized** (placeholders for secrets/user IDs)
- Canva OAuth is **per user** — admin credentials only enable the integration
