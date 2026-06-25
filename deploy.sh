#!/usr/bin/env bash
# deploy.sh: one-command deployment for the Redbelly Network Dashboard
#
# Usage:
#   ./deploy.sh vercel       Deploy to Vercel (requires `vercel` CLI login)
#   ./deploy.sh self-hosted  Build and run via Docker on this machine
#   ./deploy.sh build        Just build, don't deploy (useful for CI checks)

set -euo pipefail

MODE="${1:-}"

if [[ -z "$MODE" ]]; then
  echo "Usage: ./deploy.sh [vercel|self-hosted|build]"
  exit 1
fi

# Next.js 16 requires Node 20.9+. Node 18 will fail confusingly mid-build,
# so we check up front and fail fast with a clear message instead.
NODE_VERSION=$(node -v | sed 's/v//')
NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
NODE_MINOR=$(echo "$NODE_VERSION" | cut -d. -f2)
if [[ "$NODE_MAJOR" -lt 20 ]] || { [[ "$NODE_MAJOR" -eq 20 ]] && [[ "$NODE_MINOR" -lt 9 ]]; }; then
  echo "Error: Node.js $NODE_VERSION detected. This project requires Node 20.9 or later (Next.js 16's minimum)."
  echo "Upgrade with: nvm install 20 && nvm use 20"
  exit 1
fi

case "$MODE" in
  vercel)
    echo "→ Deploying to Vercel..."
    if ! command -v vercel &> /dev/null; then
      echo "Installing Vercel CLI..."
      npm install -g vercel
    fi
    vercel --prod
    ;;

  self-hosted)
    echo "→ Building and running self-hosted via Docker..."
    if ! command -v docker &> /dev/null; then
      echo "Error: Docker is required for self-hosted deployment. Install it from https://docs.docker.com/get-docker/"
      exit 1
    fi
    docker build -t redbelly-dashboard .
    echo "→ Starting container on port 3000..."
    docker stop redbelly-dashboard 2>/dev/null || true
    docker rm redbelly-dashboard 2>/dev/null || true
    docker run -d --name redbelly-dashboard -p 3000:3000 --restart unless-stopped redbelly-dashboard
    echo "✓ Dashboard running at http://localhost:3000"
    echo "  View logs:  docker logs -f redbelly-dashboard"
    echo "  Stop:       docker stop redbelly-dashboard"
    ;;

  build)
    echo "→ Running production build only..."
    npm ci
    npm run build
    echo "✓ Build complete. Run 'npm start' to serve locally."
    ;;

  *)
    echo "Unknown mode: $MODE"
    echo "Usage: ./deploy.sh [vercel|self-hosted|build]"
    exit 1
    ;;
esac
