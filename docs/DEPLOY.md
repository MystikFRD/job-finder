# Deployment

Production runs on a VPS with Docker. n8n runs on a **separate** host (`orc.momoh.de`).

## Production topology

| Component | Location |
|-----------|----------|
| Next.js app | `/opt/job-finder` on VPS, Docker port `127.0.0.1:3000` |
| Postgres | `supabase-db` container (shared with other services) |
| n8n | `https://orc.momoh.de` |
| Public URL | `https://jobs.mubu.dev` (nginx reverse proxy) |
| Tailscale | `100.123.67.63` (admin SSH) |

## Initial server setup

```bash
sudo mkdir -p /opt/job-finder
git clone https://github.com/MystikFRD/job-finder.git /opt/job-finder
cd /opt/job-finder/deploy
cp .env.example .env
# Edit .env — DATABASE_URL, secrets, Canva, n8n IDs
```

Build and start:

```bash
docker compose build job-finder-web
docker compose up -d job-finder-web
```

### nginx + TLS

Config template: `deploy/nginx-jobs.mubu.dev.conf`

```bash
# DNS: A record jobs → server IP (grey cloud for Let's Encrypt)
certbot --nginx -d jobs.mubu.dev
```

## Environment (`deploy/.env`)

Copy from `deploy/.env.example`. Critical values:

- `DATABASE_URL` — must reach `supabase-db` via Docker network `supabase_default`
- `N8N_INTERNAL_SECRET` — must match header in n8n **Fetch User Config** nodes
- `N8N_TEMPLATE_FINDER_WORKFLOW_ID` / `N8N_TEMPLATE_ANALYZER_WORKFLOW_ID` — Web Config template IDs
- `CANVA_CLIENT_ID` / `CANVA_CLIENT_SECRET` — from Canva Developer Portal
- `APP_URL=https://jobs.mubu.dev`

## Migrations on server

```bash
cd /opt/job-finder
docker exec -i supabase-db psql -U postgres -d postgres < db/migrations/009_canva_connection.sql
docker exec -i supabase-db psql -U postgres -d postgres < db/migrations/010_cv_generator.sql
```

## Updates

### Code-only changes (recommended)

If the Docker image already exists and only env/runtime changed:

```bash
cd /opt/job-finder/deploy
git pull
docker compose up -d --no-build job-finder-web
```

Or use `deploy/restart-web.sh`.

**Important:** Full `docker compose build` on a 3.8 GB RAM VPS takes ~10–15 minutes and can OOM-kill the site. Prefer `--no-build` unless dependencies or Dockerfile changed.

### Rebuild when needed

```bash
cd /opt/job-finder/deploy
git pull
docker compose build job-finder-web
docker compose up -d --no-build job-finder-web
```

## Health check

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://jobs.mubu.dev/login
# expect 200
```

## Rollback

```bash
cd /opt/job-finder
git checkout <previous-commit>
cd deploy && docker compose up -d --no-build job-finder-web
```

Database migrations are **not** auto-reverted — plan accordingly.
