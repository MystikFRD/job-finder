#!/usr/bin/env bash
set -euo pipefail

# Run ON the server (152.53.157.68) after copying job-finder repo to /opt/job-finder
# Usage: sudo bash deploy/setup-server.sh

APP_DIR="${APP_DIR:-/opt/job-finder}"
DEPLOY_DIR="$APP_DIR/deploy"

if [[ ! -f "$DEPLOY_DIR/.env" ]]; then
  echo "Create $DEPLOY_DIR/.env from .env.example first (DATABASE_URL + OPENAI_API_KEY)"
  exit 1
fi

command -v docker >/dev/null || { echo "Install Docker first"; exit 1; }

cd "$DEPLOY_DIR"
docker compose build --no-cache
docker compose up -d

if [[ -f "$DEPLOY_DIR/nginx-jobs.mubu.dev.conf" ]]; then
  cp "$DEPLOY_DIR/nginx-jobs.mubu.dev.conf" /etc/nginx/sites-available/jobs.mubu.dev
  ln -sf /etc/nginx/sites-available/jobs.mubu.dev /etc/nginx/sites-enabled/jobs.mubu.dev
  nginx -t && systemctl reload nginx
fi

echo "Job Finder CRM:"
echo "  internal (n8n):  http://127.0.0.1:3000"
echo "  production:      https://jobs.mubu.dev  (after DNS + certbot)"
echo "  fallback:        http://100.123.67.63:3001"
echo ""
echo "DNS:  A record  jobs.mubu.dev  →  152.53.157.68"
echo "TLS:  certbot --nginx -d jobs.mubu.dev"
