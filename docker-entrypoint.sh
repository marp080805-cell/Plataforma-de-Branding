#!/bin/sh
set -e

echo "==> Iniciando BrandForge..."

# Para migrations, usa DIRECT_URL (Session Pooler, porta 5432) se disponível.
# O Transaction Pooler (DATABASE_URL com ?pgbouncer=true) não suporta advisory
# locks e SET statements que o Prisma precisa para rodar migrations.
# Se DIRECT_URL não estiver definido, remove o parâmetro ?pgbouncer=true da URL.
get_migrate_url() {
  if [ -n "$DIRECT_URL" ]; then
    echo "$DIRECT_URL"
  else
    # Strips ?pgbouncer=true e qualquer outro query param
    echo "${DATABASE_URL%%\?*}"
  fi
}

run_migrations() {
  MIGRATE_URL="$(get_migrate_url)"
  ATTEMPTS=0
  MAX=3
  until DATABASE_URL="$MIGRATE_URL" node ./node_modules/prisma/build/index.js migrate deploy; do
    ATTEMPTS=$((ATTEMPTS + 1))
    if [ "$ATTEMPTS" -ge "$MAX" ]; then
      echo "WARN: Migrations falharam após $MAX tentativas. Continuando sem migrations..."
      return 0
    fi
    echo "WARN: Migration falhou (tentativa $ATTEMPTS/$MAX). Aguardando 10s..."
    sleep 10
  done
  echo "==> Migrations concluídas."
}

run_seed() {
  node prisma/seed.js || echo "WARN: Seed falhou ou já executado. Continuando..."
}

run_migrations
run_seed

echo "==> Iniciando servidor Next.js..."
exec node server.js
