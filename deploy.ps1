# ScanCodeZW — One-Click Deploy Script
# Run this from the project root after configuring .env.local with real credentials.
#
# Prerequisites:
#   1. .env.local created with real Supabase + Stripe + Paynow keys
#   2. Supabase migrations run (001–004) in Supabase SQL Editor
#   3. Admin account created: node scripts/setup-admin.js

param(
  [switch]$SkipBuild,
  [switch]$Preview       # Deploy to preview URL instead of production
)

$ErrorActionPreference = "Stop"
$git    = "C:\Program Files\Git\bin\git.exe"
$vercel = "npx vercel"

Write-Host ""
Write-Host "=== ScanCodeZW Deployment ===" -ForegroundColor Cyan
Write-Host ""

# ── Step 1: Verify .env.local ────────────────────────────────────────────────
if (-not (Test-Path ".env.local")) {
  Write-Host "ERROR: .env.local not found." -ForegroundColor Red
  Write-Host "Copy .env.example to .env.local and fill in your real credentials." -ForegroundColor Yellow
  exit 1
}

# ── Step 2: Build ────────────────────────────────────────────────────────────
if (-not $SkipBuild) {
  Write-Host "[1/4] Building production bundle..." -ForegroundColor Green
  npm run build
  if ($LASTEXITCODE -ne 0) { Write-Host "Build failed." -ForegroundColor Red; exit 1 }
  Write-Host "      Build complete." -ForegroundColor Green
} else {
  Write-Host "[1/4] Skipping build (--SkipBuild)" -ForegroundColor Yellow
}

# ── Step 3: Git commit ───────────────────────────────────────────────────────
Write-Host "[2/4] Committing changes..." -ForegroundColor Green
& $git add . 2>&1 | Out-Null
$status = & $git status --short
if ($status) {
  $msg = "Deploy $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
  & $git commit -m $msg
  Write-Host "      Committed: $msg" -ForegroundColor Green
} else {
  Write-Host "      Nothing to commit." -ForegroundColor Yellow
}

# ── Step 4: Vercel login (if needed) ─────────────────────────────────────────
Write-Host "[3/4] Checking Vercel authentication..." -ForegroundColor Green
$whoami = npx vercel whoami 2>&1
if ($LASTEXITCODE -ne 0 -or $whoami -match "No existing credentials") {
  Write-Host "      Not logged in. Starting Vercel login..." -ForegroundColor Yellow
  npx vercel login
}

# ── Step 5: Deploy ───────────────────────────────────────────────────────────
Write-Host "[4/4] Deploying to Vercel..." -ForegroundColor Green
if ($Preview) {
  npx vercel --yes
} else {
  npx vercel --prod --yes
}

if ($LASTEXITCODE -eq 0) {
  Write-Host ""
  Write-Host "=== DEPLOYMENT SUCCESSFUL ===" -ForegroundColor Green
  Write-Host ""
  Write-Host "Next steps:" -ForegroundColor Cyan
  Write-Host "  1. Set environment variables in Vercel Dashboard (if not already done)"
  Write-Host "     vercel.com → Project → Settings → Environment Variables"
  Write-Host ""
  Write-Host "  2. Register Stripe webhook:"
  Write-Host "     dashboard.stripe.com → Developers → Webhooks → Add endpoint"
  Write-Host "     Events: checkout.session.completed, checkout.session.expired"
  Write-Host ""
  Write-Host "  3. Set PAYNOW_RESULT_URL to your Vercel domain/api/paynow/callback"
  Write-Host ""
  Write-Host "  4. Run admin setup: node scripts/setup-admin.js"
  Write-Host ""
} else {
  Write-Host "Deployment failed. Check the output above." -ForegroundColor Red
  exit 1
}
