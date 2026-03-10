#!/bin/sh
set -e

echo "==> Iniciando BrandForge..."

# Executa migrations com retry limitado (máx 3 tentativas)
run_migrations() {
  ATTEMPTS=0
  MAX=3
  until node ./node_modules/prisma/build/index.js migrate deploy; do
    ATTEMPTS=$((ATTEMPTS + 1))
    if [ "$ATTEMPTS" -ge "$MAX" ]; then
      echo "WARN: Migrations falharam após $MAX tentativas. Continuando sem migrations..."
      return 0
    fi
    echo "WARN: Migration falhou (tentativa $ATTEMPTS/$MAX). Aguardando 5s..."
    sleep 5
  done
  echo "==> Migrations concluídas."
}

# Executa seed com proteção de erro (não deve parar o servidor)
run_seed() {
  node prisma/seed.js || echo "WARN: Seed falhou ou já executado. Continuando..."
}

run_migrations
run_seed

echo "==> Iniciando servidor Next.js..."
exec node server.js
