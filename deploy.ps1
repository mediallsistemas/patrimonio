# =============================================================================
# LinenSistem — Script de Deploy Inicial
# Rodar no servidor como Administrador no PowerShell
# =============================================================================

$ErrorActionPreference = "Stop"

# ── Configurações ─────────────────────────────────────────────────────────────
$DEPLOY_DIR   = "C:\apps\linensistem"
$REPO_URL     = "https://github.com/rafaelmoreira18/linenSistem.git"
$BRANCH       = "main"
$PORT         = 3000
$NODE_VERSION = "20"

# ── Variáveis de ambiente de produção ─────────────────────────────────────────
# IMPORTANTE: JWT_SECRET abaixo já é um secret seguro gerado aleatoriamente.
# Se o FeedbackForms (NestJS) usa JWT_SECRET diferente, atualize aqui para o mesmo valor.
$ENV_CONTENT = @"
DATABASE_URL="postgresql://postgres:MediallMkt2026@dbpgpesquisamkt.ce6ipyxrb0gc.sa-east-1.rds.amazonaws.com:5432/linensistemDB"
JWT_SECRET="rxzV0p+kRNGIJzQfTijzzOBGCqffJtgIK/n4vPu5/taOgy0SVbxZLF4n8yYMiqXld0Fq0FltKnK3tfxzEZCVvg=="
NODE_ENV="production"
PORT=$PORT
NEXT_PUBLIC_APP_URL="http://localhost:$PORT"
CORS_ORIGINS="http://localhost:$PORT"
"@

# =============================================================================

Write-Host ""
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  LinenSistem — Deploy Inicial" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

# ── 1. Verifica Node.js ───────────────────────────────────────────────────────
Write-Host "[1/7] Verificando Node.js..." -ForegroundColor Yellow
try {
    $nodeVer = node --version
    Write-Host "      Node.js encontrado: $nodeVer" -ForegroundColor Green
} catch {
    Write-Host "      Node.js nao encontrado. Instale em https://nodejs.org (LTS)" -ForegroundColor Red
    Write-Host "      Apos instalar, reabra o PowerShell e rode o script novamente."
    exit 1
}

# ── 2. Verifica Git ───────────────────────────────────────────────────────────
Write-Host "[2/7] Verificando Git..." -ForegroundColor Yellow
try {
    $gitVer = git --version
    Write-Host "      Git encontrado: $gitVer" -ForegroundColor Green
} catch {
    Write-Host "      Git nao encontrado. Instale em https://git-scm.com" -ForegroundColor Red
    exit 1
}

# ── 3. Verifica/Instala PM2 ───────────────────────────────────────────────────
Write-Host "[3/7] Verificando PM2..." -ForegroundColor Yellow
try {
    pm2 --version | Out-Null
    Write-Host "      PM2 ja instalado." -ForegroundColor Green
} catch {
    Write-Host "      Instalando PM2 globalmente..." -ForegroundColor Yellow
    npm install -g pm2
    Write-Host "      PM2 instalado." -ForegroundColor Green
}

# ── 4. Clona ou atualiza o repositorio ───────────────────────────────────────
Write-Host "[4/7] Clonando repositorio..." -ForegroundColor Yellow

if (Test-Path $DEPLOY_DIR) {
    Write-Host "      Diretorio ja existe — atualizando..." -ForegroundColor Yellow
    Set-Location $DEPLOY_DIR
    git fetch origin
    git checkout $BRANCH
    git pull origin $BRANCH
} else {
    New-Item -ItemType Directory -Path $DEPLOY_DIR -Force | Out-Null

    # Se o repo for privado, vai pedir usuario/senha ou token aqui
    git clone --branch $BRANCH $REPO_URL $DEPLOY_DIR
    Set-Location $DEPLOY_DIR
}

Write-Host "      Repositorio pronto." -ForegroundColor Green

# ── 5. Cria o .env de producao ────────────────────────────────────────────────
Write-Host "[5/7] Criando .env..." -ForegroundColor Yellow
$ENV_CONTENT | Out-File -FilePath "$DEPLOY_DIR\.env" -Encoding UTF8 -Force
Write-Host "      .env criado em $DEPLOY_DIR\.env" -ForegroundColor Green

# ── 6. Instala dependencias e faz o build ────────────────────────────────────
Write-Host "[6/7] Instalando dependencias e fazendo build..." -ForegroundColor Yellow
Write-Host "      (isso pode levar 2-3 minutos)" -ForegroundColor Gray

Set-Location $DEPLOY_DIR
npm ci --prefer-offline
npm run build

Write-Host "      Build concluido." -ForegroundColor Green

# ── 7. Inicia com PM2 ────────────────────────────────────────────────────────
Write-Host "[7/7] Iniciando com PM2..." -ForegroundColor Yellow

# Para processo anterior se existir
pm2 delete linensistem 2>$null

pm2 start ecosystem.config.js --env production
pm2 save

Write-Host "      PM2 iniciado." -ForegroundColor Green

# ── Resultado ─────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "===================================================" -ForegroundColor Green
Write-Host "  Deploy concluido com sucesso!" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  App rodando em: http://localhost:$PORT" -ForegroundColor Cyan

# Pega o IP publico para facilitar o acesso
try {
    $IP = (Invoke-WebRequest -Uri "https://api.ipify.org" -UseBasicParsing).Content.Trim()
    Write-Host "  IP do servidor:  http://$IP`:$PORT" -ForegroundColor Cyan
} catch {
    Write-Host "  (nao foi possivel detectar o IP publico automaticamente)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "  Comandos uteis:" -ForegroundColor Yellow
Write-Host "    pm2 logs linensistem     -- ver logs em tempo real"
Write-Host "    pm2 status               -- ver status do processo"
Write-Host "    pm2 restart linensistem  -- reiniciar"
Write-Host ""
Write-Host "  Health check:" -ForegroundColor Yellow
Write-Host "    curl http://localhost:$PORT/api/auth/me"
Write-Host "    (deve retornar 401 — significa que o app esta respondendo)"
Write-Host ""

# ── Configura PM2 para iniciar no boot do Windows ────────────────────────────
Write-Host "Configurando PM2 para iniciar com o Windows..." -ForegroundColor Yellow
npm install -g pm2-windows-startup 2>$null
pm2-startup install 2>$null
Write-Host "Pronto. PM2 vai iniciar automaticamente no boot." -ForegroundColor Green
Write-Host ""
