#!/usr/bin/env bash
# deploy.sh — Deploy device-manager-web static files to VPS.
#
# Usage (from repo root):
#   ./deploy.sh
#
# Prerequisites:
#   - SSH alias 'vps' configured in ~/.ssh/config → 213.199.32.18
#   - Write access to /var/www/portfolio on the VPS
#   - Working tree must be clean (no uncommitted changes)

set -euo pipefail

VPS_TARGET="dev@vps:/var/www/portfolio"
SMOKE_URL="http://213.199.32.18/"

# ── 1. Guard: refuse to deploy uncommitted changes ──────────────────────────
if [ -n "$(git status --porcelain)" ]; then
    echo "ERROR: Working tree is dirty. Commit or stash your changes before deploying."
    echo ""
    git status --short
    exit 1
fi

echo "✓ Working tree is clean"

# ── 2. Push to GitHub (VPS should never run code not in version control) ────
echo "→ Pushing to GitHub..."
git push origin master
echo "✓ Pushed to origin/master"

# ── 3. Deploy files via scp ──────────────────────────────────────────────────
echo "→ Deploying to ${VPS_TARGET}..."

# HTML pages
scp index.html dashboard.html devices.html "${VPS_TARGET}/"

# CSS
ssh vps "mkdir -p /var/www/portfolio/css"
scp css/app.css "${VPS_TARGET}/css/"

# JS modules
ssh vps "mkdir -p /var/www/portfolio/js"
scp js/api.js js/auth.js js/dashboard.js js/devices.js js/utils.js "${VPS_TARGET}/js/"

echo "✓ Files deployed"

# ── 4. Smoke test ────────────────────────────────────────────────────────────
echo "→ Smoke testing ${SMOKE_URL}..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${SMOKE_URL}")

if [ "${HTTP_STATUS}" != "200" ]; then
    echo "WARNING: Smoke test returned HTTP ${HTTP_STATUS} — check nginx logs on VPS"
else
    echo "✓ Smoke test passed (HTTP 200)"
fi

# ── 5. Tag the deploy ────────────────────────────────────────────────────────
DEPLOY_TAG="deploy/web-$(date +%Y%m%d-%H%M)"
echo "→ Tagging deploy as ${DEPLOY_TAG}..."
git tag "${DEPLOY_TAG}"
git push origin --tags
echo "✓ Deploy tag pushed: ${DEPLOY_TAG}"

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "============================================"
echo "  Deploy complete!"
echo "  Live:  ${SMOKE_URL}"
echo "  Tag:   ${DEPLOY_TAG}"
echo "============================================"
