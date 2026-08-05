#!/bin/sh
set -e

if [ "${RUN_DB_PUSH:-true}" = "true" ] && [ -n "${DATABASE_URL:-}" ]; then
  echo "Applying database schema (prisma db push)..."
  prisma db push --skip-generate
fi

exec "$@"
