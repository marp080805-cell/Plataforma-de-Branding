#!/bin/bash
set -e

# ============================================================
# BrandForge — Script de Instalação Automática
# ============================================================

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║     BrandForge — Instalação           ║${NC}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════╝${NC}"
echo ""

# --- Verificar dependências ---
echo -e "${BOLD}[1/5] Verificando dependências...${NC}"

if ! command -v docker &> /dev/null; then
  echo -e "${RED}✗ Docker não encontrado. Instale em: https://docs.docker.com/engine/install/${NC}"
  exit 1
fi

if ! docker compose version &> /dev/null; then
  echo -e "${RED}✗ Docker Compose não encontrado. Atualize o Docker.${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Docker $(docker --version | cut -d' ' -f3 | tr -d ',')${NC}"
echo -e "${GREEN}✓ Docker Compose $(docker compose version --short)${NC}"

# --- Configurar .env ---
echo ""
echo -e "${BOLD}[2/5] Configurando variáveis de ambiente...${NC}"

if [ -f .env ]; then
  echo -e "${YELLOW}⚠ Arquivo .env já existe. Pulando configuração (delete-o para reconfigurar).${NC}"
else
  echo ""
  echo -e "${CYAN}Você precisará das informações do Supabase.${NC}"
  echo -e "${CYAN}Acesse: supabase.com → seu projeto → Settings → Database → Connection string${NC}"
  echo ""

  # DATABASE_URL (pooler)
  echo -e "${BOLD}Cole a DATABASE_URL (Transaction Pooler, porta 6543):${NC}"
  echo -e "${YELLOW}Exemplo: postgresql://postgres.abcdef:suasenha@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true${NC}"
  read -rp "→ " DATABASE_URL

  # DIRECT_URL
  echo ""
  echo -e "${BOLD}Cole a DIRECT_URL (Session Mode / Direct, porta 5432):${NC}"
  echo -e "${YELLOW}Exemplo: postgresql://postgres.abcdef:suasenha@aws-0-sa-east-1.supabase.com:5432/postgres${NC}"
  read -rp "→ " DIRECT_URL

  # URL pública
  echo ""
  echo -e "${BOLD}Qual é o domínio ou IP da sua VPS?${NC}"
  echo -e "${YELLOW}Exemplo: meusite.com.br  ou  123.45.67.89${NC}"
  read -rp "→ " PUBLIC_HOST

  if [[ "$PUBLIC_HOST" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    PUBLIC_URL="http://${PUBLIC_HOST}"
  else
    PUBLIC_URL="https://${PUBLIC_HOST}"
  fi

  # Gerar secrets
  NEXTAUTH_SECRET=$(openssl rand -base64 32)
  ENCRYPTION_KEY=$(openssl rand -hex 32)

  cat > .env <<EOF
# ============================================================
# BrandForge — Gerado automaticamente em $(date)
# ============================================================

# Banco de dados (Supabase)
DATABASE_URL=${DATABASE_URL}
DIRECT_URL=${DIRECT_URL}

# NextAuth
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
NEXTAUTH_URL=${PUBLIC_URL}

# Encriptação das API Keys
ENCRYPTION_KEY=${ENCRYPTION_KEY}

# Ambiente
NODE_ENV=production
EOF

  echo ""
  echo -e "${GREEN}✓ Arquivo .env criado${NC}"
  echo ""
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}  IMPORTANTE: Salve o ENCRYPTION_KEY em lugar seguro!${NC}"
  echo -e "${BOLD}  Se perder, as API keys salvas no banco ficam inacessíveis.${NC}"
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo -e "  ENCRYPTION_KEY=${BOLD}${ENCRYPTION_KEY}${NC}"
  echo ""
fi

# --- Build e subir container ---
echo -e "${BOLD}[3/5] Construindo e subindo a aplicação...${NC}"
echo -e "${YELLOW}(Pode levar 3-5 minutos no primeiro build)${NC}"
echo ""

docker compose up -d --build

echo ""
echo -e "${GREEN}✓ Container iniciado${NC}"

# --- Aguardar app ficar pronto ---
echo ""
echo -e "${BOLD}[4/5] Aguardando a aplicação iniciar...${NC}"

MAX_WAIT=120
WAITED=0
printf "Aguardando"
while [ $WAITED -lt $MAX_WAIT ]; do
  if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
    break
  fi
  printf "."
  sleep 5
  WAITED=$((WAITED + 5))
done
echo ""

if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Aplicação respondendo${NC}"
else
  echo -e "${YELLOW}⚠ Aplicação demorando mais que o esperado.${NC}"
  echo -e "${YELLOW}  Verifique com: docker compose logs -f app${NC}"
  echo -e "${YELLOW}  (As migrations do banco podem demorar alguns segundos a mais)${NC}"
fi

# --- Seed inicial ---
echo ""
echo -e "${BOLD}[5/5] Populando banco com dados iniciais...${NC}"

SEED_CHECK=$(docker compose exec -T app node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.count().then(c => { console.log(c); p.\$disconnect(); }).catch(() => { console.log('0'); });
" 2>/dev/null || echo "0")

SEED_CHECK=$(echo "$SEED_CHECK" | tr -d '[:space:]')

if [ "$SEED_CHECK" = "0" ] || [ -z "$SEED_CHECK" ]; then
  docker compose exec -T app npx tsx prisma/seed.ts
  echo -e "${GREEN}✓ Banco populado com sucesso${NC}"
else
  echo -e "${YELLOW}⚠ Banco já possui dados. Seed pulado.${NC}"
fi

# --- Resumo final ---
NEXTAUTH_URL_DISPLAY=$(grep NEXTAUTH_URL .env | cut -d'=' -f2)

echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${GREEN}║       BrandForge instalado com sucesso!           ║${NC}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BOLD}URL:${NC}   ${NEXTAUTH_URL_DISPLAY}"
echo -e "  ${BOLD}Login:${NC} admin@brandforge.com"
echo -e "  ${BOLD}Senha:${NC} admin123"
echo ""
echo -e "${YELLOW}  ⚠ Troque a senha do admin após o primeiro login!${NC}"
echo ""
echo -e "  Após logar acesse ${BOLD}Admin → Configurações${NC} para adicionar"
echo -e "  suas chaves de API da Anthropic e/ou OpenAI."
echo ""
echo -e "  ${CYAN}Comandos úteis:${NC}"
echo -e "  docker compose logs -f app     # ver logs em tempo real"
echo -e "  docker compose restart app     # reiniciar a aplicação"
echo -e "  docker compose down            # parar tudo"
echo ""
