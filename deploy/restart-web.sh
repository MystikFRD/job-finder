#!/bin/bash
# Start without rebuilding — use when the image already exists.
set -e
cd "$(dirname "$0")"
docker compose up -d --no-build job-finder-web
docker compose ps job-finder-web
curl -s -o /dev/null -w "login: %{http_code}\n" http://127.0.0.1:3000/login
