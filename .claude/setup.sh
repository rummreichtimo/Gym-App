#!/usr/bin/env bash
# Prepares the repo so tests, typecheck and the dev server work in a fresh
# session: install dependencies, apply migrations, seed the shared libraries.
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env ] || cp .env.example .env

if [ ! -d node_modules ]; then
  npm ci --no-audit --no-fund 2>&1 | tail -2
fi

npx prisma generate > /dev/null 2>&1

# The database may not be reachable in every environment; that must not fail
# the session, so migration and seeding are best-effort.
if npx prisma migrate deploy > /dev/null 2>&1; then
  npx tsx prisma/seed.ts > /dev/null 2>&1 || true
  echo "IronPath ready: npm run dev"
else
  echo "IronPath ready. Datenbank starten mit: docker compose up -d && npx prisma migrate deploy"
fi
