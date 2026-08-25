#!/usr/bin/env bash
# Prepares the repo so tests, typecheck and the dev server work in a fresh
# session: install dependencies, create the local database, seed it.
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env ] || cp .env.example .env

if [ ! -d node_modules ]; then
  npm ci --no-audit --no-fund 2>&1 | tail -2
fi

npx prisma generate > /dev/null 2>&1
npx prisma migrate deploy > /dev/null 2>&1
npx tsx prisma/seed.ts > /dev/null 2>&1 || true

echo "IronPath ready: npm run dev"
