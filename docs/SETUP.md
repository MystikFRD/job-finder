# Local setup

## Prerequisites

- Node.js 20+
- PostgreSQL (same instance as n8n, or local Docker Postgres)
- n8n instance with workflows imported (see [N8N.md](N8N.md))

## Web app

```bash
cd web
npm install
```

Create `web/.env.local` (or use variables from `deploy/.env.example`):

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres connection string |
| `AUTH_SECRET` | Session signing (min 32 chars) |
| `APP_ENCRYPTION_KEY` | Encrypts user API keys in DB |
| `OPENAI_API_KEY` | Fallback for generator / assistant |
| `N8N_API_URL` | e.g. `https://orc.momoh.de/api/v1` |
| `N8N_API_KEY` | For workflow provisioning on signup |
| `N8N_INTERNAL_SECRET` | Shared secret for `/api/n8n/user-config` |
| `N8N_WEB_CONFIG_URL` | Public app URL (e.g. `http://localhost:3000`) |
| `CANVA_CLIENT_ID` / `CANVA_CLIENT_SECRET` | Optional Canva Connect |
| `APP_URL` | OAuth redirect base |

```bash
npm run dev
```

## Database migrations

Apply in order on your Postgres database:

```bash
for f in db/migrations/*.sql; do
  psql "$DATABASE_URL" -f "$f"
done
```

On production (Supabase container):

```bash
docker exec -i supabase-db psql -U postgres -d postgres < db/migrations/010_cv_generator.sql
```

### Migration overview

| File | Adds |
|------|------|
| `001_core.sql` | Jobs, search runs, core functions |
| `002_crm.sql` | Applications, companies, events |
| `003_phases_456.sql` | Generator, email, assistant tables |
| `004_search_settings.sql` | Per-user search config |
| `005_multi_user_auth.sql` | Users, sessions, RLS patterns |
| `006_manual_run_limit.sql` | Daily manual search limit |
| `007_n8n_api_key.sql` | User DeepSeek keys in settings |
| `008_fix_save_application_document.sql` | Document save fix |
| `009_canva_connection.sql` | Per-user Canva OAuth tokens |
| `010_cv_generator.sql` | Address, photo, CV fields |

## First admin user

After migrations, sign up via `/signup` or insert a user directly. Set `MANUAL_RUN_UNLIMITED_EMAILS=admin@jobs.local` in env for unlimited manual searches during testing.

## n8n (minimal local test)

1. Import workflows from `db/n8n-exports/`
2. Configure Postgres credential pointing at your DB
3. Set **Fetch User Config** to `http://localhost:3000/api/n8n/user-config?user_id=YOUR_USER_UUID`
4. Header `X-N8N-Secret` = same as `N8N_INTERNAL_SECRET`
5. Publish finder + analyzer; activate email scanner if testing IMAP

See [N8N.md](N8N.md) for details.
