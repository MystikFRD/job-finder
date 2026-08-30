# Canva integration

Canva Connect lets users open cover letters and CVs in Canva for visual editing. Each user connects **their own** Canva account — the admin app credentials do not own user designs.

## Admin setup (once per deployment)

### 1. Create Canva Developer integration

1. Go to [Canva Developers](https://www.canva.com/developers/)
2. Create a **Public integration** (Connect API)
3. Add redirect URL: `{APP_URL}/api/canva/callback`
   - Production: `https://jobs.mubu.dev/api/canva/callback`
4. Copy **Client ID** and **Client secret**

### 2. Server environment

In `deploy/.env`:

```env
CANVA_CLIENT_ID=OC-...
CANVA_CLIENT_SECRET=...
APP_URL=https://jobs.mubu.dev
```

Restart web container after change:

```bash
cd /opt/job-finder/deploy && docker compose up -d --no-build job-finder-web
```

### 3. Database

Migration `009_canva_connection.sql` creates `canva_connections` (per-user tokens).

## User flow

1. Admin sets `CANVA_CLIENT_ID` + secret → **Settings** shows "Mit Canva verbinden"
2. User clicks connect → OAuth PKCE → tokens stored in `canva_connections`
3. **Cover letter:** Draft editor → "In Canva öffnen"
4. **CV:** Settings → CV generator → "In Canva öffnen"

## Code map

| File | Role |
|------|------|
| `web/src/lib/canva.ts` | Canva API client |
| `web/src/lib/canva-connection.ts` | DB read/write tokens |
| `web/src/lib/canva-oauth-cookies.ts` | PKCE state cookies |
| `web/src/app/api/canva/*` | connect, callback, disconnect, status |
| `web/src/app/api/applications/[id]/canva` | Export application to Canva |
| `web/src/app/api/profile/canva` | Export CV to Canva |

## Multi-user model

| Layer | Account |
|-------|---------|
| Developer app | Your Canva developer registration (Client ID/secret in `.env`) |
| Connected user | Each user's Canva account via OAuth |

The admin's Canva login is **not** used for user exports. Users who never connect see a prompt in Settings.

## Disconnect

Settings → disconnect, or `POST /api/canva/disconnect` — removes row from `canva_connections`.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Connect button missing | `CANVA_CLIENT_ID` not set in server env |
| Redirect error | Redirect URI must exactly match Canva app settings |
| "Not connected" on export | User must complete OAuth in Settings first |
| Token expired | Re-connect; refresh handled in `canva-connection.ts` |

See [GAPS.md](GAPS.md) for what is **not** automated.
