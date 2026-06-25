# Redbelly Network: Live Ledger

A public dashboard showing real-time Redbelly Network metrics, read directly
from the chain: network activity, tokenised real-world-asset value,
accredited issuers, and ecosystem partnerships.

Built for the Redbelly Network Public Dashboard bounty. On-chain data comes
straight from Redbelly's mainnet RPC and its public Routescan API; no
third-party aggregator sits between the chain and what you see on screen.

## What it shows

- **Network**: latest block, live throughput (TPS), gas price, total RBNT
  supply
- **Activity**: active addresses and transaction count over a real,
  fully-scanned 100-block window; verified wallet count
- **Tokenised value**: live TVL from two distinct sources, shown separately:
  a verified native-RBNT lock-staking vault (Reddex), and 10 real-world-asset
  tokens on Redbelly mainnet (AUD stablecoins, tokenised real estate,
  commodities, trade finance)
- **Ecosystem**: accredited issuers (read from on-chain event logs; see
  `ARCHITECTURE.md` for an important caveat on this number) and 21
  partnership entries (all independently verified against primary sources)

See `ARCHITECTURE.md` for exactly where each number comes from, including
an honest list of what's been independently verified, what's still an
assumption, and what couldn't be sourced on-chain at all.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Requires Node.js 20.9 or later.** This is Next.js 16's minimum; Node 18
is no longer supported and will fail during install.

## Deploy

One script, two targets:

```bash
./deploy.sh vercel        # Deploy to Vercel (prompts for login on first run)
./deploy.sh self-hosted   # Build and run via Docker on this machine
./deploy.sh build         # Production build only, no deploy
```

Self-hosted deployment requires Docker (docs.docker.com/get-docker).
Vercel deployment requires the `vercel` CLI, which the script installs
automatically if missing.

## Project structure

```
app/
  page.tsx              Dashboard (live metrics, partner logo strip)
  analytics/page.tsx    RWA analytics (token inventory, TVL breakdown)
  ecosystem/page.tsx    Partner ecosystem (cards, modals, category filter)
  layout.tsx            Root layout, fonts, metadata
  globals.css           Design tokens and base styles
  api/metrics/route.ts  Server-side data aggregation endpoint
lib/
  rpc.ts                All RPC + Routescan + CoinGecko calls, token/partnership data
  useMetrics.ts         Client-side polling hook (30s interval, stale-data handling)
components/
  NavBar.tsx            Responsive sidebar nav with hamburger on mobile
  PulseBar.tsx          30-second refresh indicator
  StaleBanner.tsx       RPC-down warning banner
  LedgerRow.tsx         Reusable metric display row
deploy.sh               One-command deployment
Dockerfile              Self-hosted container build
vercel.json             Vercel configuration
ARCHITECTURE.md         Full data-source documentation
```

## Resilience

If the RPC or any data source is temporarily unreachable, the dashboard
keeps showing the last known good values and displays a stale-data banner;
it never blanks out or shows a broken page. This is implemented per-metric,
so a single failed call doesn't take down the rest of the dashboard.
