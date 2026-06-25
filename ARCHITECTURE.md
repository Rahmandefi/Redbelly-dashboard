# Architecture & Maintenance

This document covers how the Redbelly Network Dashboard is built, where its
data comes from, and how to keep it running.

## Overview

The dashboard is a Next.js 16 (App Router) application. All on-chain reads
happen server-side in a single API route, `app/api/metrics/route.ts`, which
the browser polls every 30 seconds. Nothing touches the Redbelly RPC directly
from the client: this avoids CORS issues and keeps the data-fetching logic
in one place.

```
Browser (every 30s)
   │
   ▼
GET /api/metrics  ──────────────►  Redbelly Mainnet RPC
   │                                (governors.mainnet.redbelly.network)
   │
   ├────────────────────────────►  Routescan Etherscan-compatible API
   │                                (token info, gas oracle, event logs)
   │
   └────────────────────────────►  CoinGecko (RBNT/USD price only)
```

## Data sources, by metric

| Metric | Source | File |
|---|---|---|
| Latest block, gas used/limit, tx count | Direct RPC (`eth_getBlockByNumber`) | `lib/rpc.ts` → `getLatestBlock` |
| Throughput (TPS) | Computed from two real blocks 10 apart | `lib/rpc.ts` → `getTPS` |
| Gas price | `baseFeePerGas` from the latest RPC block, divided by 1e9 (wei → gwei) | `lib/rpc.ts` → `getLatestBlock`, computed in `app/api/metrics/route.ts` |
| Total supply | Routescan `stats` module (`ethsupply`) | `lib/rpc.ts` → `getTotalSupply` |
| Active addresses & recent tx count | Scans last 100 blocks via RPC, deduplicates `from`/`to` | `lib/rpc.ts` → `getRecentActivity` |
| Verified wallets | Static figure (740,000+, Redbelly's Aug 2025 report; not derivable from RPC) | `app/api/metrics/route.ts` |
| Accredited issuers | Counts `IssuerAdded` event logs on the Accredited Issuers Registry contract | `lib/rpc.ts` → `getAccreditedIssuerCount` |
| RWA token TVL | `totalSupply × tokenPriceUSD` for 10 known RWA contracts, via Routescan token API (**prices not yet independently spot-checked, see caveat below**) | `lib/rpc.ts` → `getRWATokenData` |
| Reddex lock-staking TVL | `totalStake()` on verified `ReddexRBNTLockStaker` contract, a third-party native-RBNT yield vault, manually cross-checked against `eth_getBalance` | `lib/rpc.ts` → `getReddexStakingData` |
| RBNT/USD price | CoinGecko (the on-chain price oracle's function signature could not be confirmed during research, see below) | `lib/rpc.ts` → `getRBNTPrice` |
| Partnerships | Hardcoded list, manually maintained | `lib/rpc.ts` → `PARTNERSHIPS` |

### Known limitation: RBNT price isn't on-chain

I located what appears to be Redbelly's live price oracle contract
(`0x3c2269811836af69497e5f486a85d7316753cf62`, fed every block by
`0x339d413ccefd986b1b3647a9cfa9cbbe70a30749`), but could not determine its
read function signature: `latestAnswer()` and `getLatestPrice()` both
reverted. I use CoinGecko's public API instead and label it clearly in the
UI. If you obtain the oracle's ABI later, swap `getRBNTPrice` in `lib/rpc.ts`
for a direct `eth_call`.

### Known limitation: validator/protocol staking TVL is not shown

The staking escrow address commonly cited in early Redbelly docs
(`0x818c3c113Ce240Ac92508f52F3DdDA675E6b6B9A`) returned a zero balance when
queried directly via `eth_getBalance`; it does not hold any value and is
not included in this dashboard. I have not located the real validator/node
staking contract, if a separate one exists.

What I *do* show under "Reddex lock staking" is a different thing: a
verified, third-party native-RBNT lock-staking vault
(`ReddexRBNTLockStaker`, `0x5E8040e85D0E6363D798a43BEa939C026449946d`). This
is a DeFi yield product (365-day lock, 15% APY at time of writing, 0% fees),
not the network's validator security deposits. Confirmed by manual
cross-check on 2026-06-17: `eth_getBalance` returned 262,947,686.42 RBNT,
and `totalStake()` returned 259,811,060.35 RBNT: the ~3.1M RBNT gap is the
contract's unclaimed reward reserve, which is the expected relationship
between those two numbers. This is reported as its own line item, separate
from tokenised RWA value, since the two represent fundamentally different
kinds of "locked value" and should never be silently summed without
labels.

### Known limitation: "total transactions since genesis" is not shown

A trustworthy lifetime transaction count requires either an indexer or
summing every block, not viable from a browser at a 60-second refresh
interval. I deliberately avoided extrapolating from a sample, since that
produces a number that looks precise but isn't statistically sound. Instead
I show transaction count over a real, fully-scanned 100-block window, which
is honest and verifiable.

## Graceful degradation

Every metric is fetched independently via a `safe()` wrapper in
`app/api/metrics/route.ts`. If any individual call fails, that metric falls
back to its last-known value (or a sane default on first load) and the
response sets `isStale: true`. The frontend (`lib/useMetrics.ts`) holds onto
the last successful payload in a ref, so a failed poll never blanks the UI;
it just shows the stale-data banner and keeps the numbers on screen.

## Auto-refresh

`lib/useMetrics.ts` polls `/api/metrics` every 30 seconds via `setInterval`.
The visual pulse bar at the top of the page (`components/PulseBar.tsx`)
fills over that same 30-second window and resets on every successful poll,
giving a continuous visual signal that the page is alive even between
refreshes.

## Adding a new RWA token to the TVL calculation

Edit `RWA_TOKENS` in `lib/rpc.ts`: add an object with `address`, `symbol`,
`name`, `decimals`, and `category`. The dashboard will pick it up
automatically on the next deploy; no other changes needed. Decimals must
match the token contract exactly or the displayed supply will be off by
orders of magnitude.

## Adding or updating a partnership

Edit the `PARTNERSHIPS` array in `lib/rpc.ts`. This is intentionally a static
list: there is no on-chain partnerships registry on Redbelly, so this data
must be maintained by hand as new integrations are announced.

## Local development

```bash
npm install
npm run dev
```

Requires Node.js 20.9 or later (Next.js 16's minimum; Node 18 is no longer
supported and will fail during install or build).

## Deployment

See `README.md` for the one-command deploy script (`./deploy.sh`), which
supports Vercel and self-hosted Docker.

## Rate limits to be aware of

- **Routescan free tier**: 2 requests/second, 10,000 calls/day. Each
  `/api/metrics` poll makes **12 Routescan calls** (10 RWA token lookups +
  `stats/ethsupply` + `logs/getLogs`). Scaling math:

  | Scenario | Routescan calls/day | Hits 10K limit? |
  |---|---|---|
  | 1 visitor, tab open all day (30s poll) | 2,880 polls × 12 = **34,560** | After ~7 hours |
  | 41 typical 10-min sessions | 41 × 20 × 12 = **9,840** | At the limit |
  | 4 simultaneous sustained visitors | 4 × 34,560 = **138,240** | Far exceeds |

  **The free tier breaks with a single sustained visitor before the day
  ends.** This is a real production scaling risk. Mitigations, in order of
  effort:
  1. **Server-side cache**: cache the Routescan results for 25-29s in
     `app/api/metrics/route.ts` (Next.js `unstable_cache` or a module-level
     `Map` with a timestamp). All visitors share one Routescan fetch per
     30s cycle instead of one each. This reduces 12 × N calls/minute to 12
     calls/minute regardless of N.
  2. **Routescan API key upgrade**: contact Routescan for a higher quota,
     necessary if the dashboard sees sustained real traffic even with caching.
  3. **Reduce token lookups**: tokens with `priceSource !== "routescan"` do
     not use Routescan's price field; their `tokeninfo` call is only needed
     for `totalSupply`. Consider batching or using RPC `eth_call` for supply
     instead, cutting calls from 12 to 3 (supply + getLogs per non-routescan
     token still needs the call unless you switch to direct RPC `totalSupply()`).

  When Routescan is rate-limited it drops TCP connections rather than
  returning an HTTP 429, so the `safe()` wrappers correctly catch the error
  and set `isStale: true`, but the response takes ~27s to return (the
  kernel's TCP timeout). Adding an `AbortController` with a 5s deadline to
  `routescanCall` in `lib/rpc.ts` would cap the stale-data response time.

- **CoinGecko free tier**: roughly 10-30 calls/minute depending on current
  policy. A single price call per refresh cycle is well within this.

## RWA token pricing methodology (updated 2026-06-19)

Of the 10 RWA tokens tracked, **only 3 have reliable, citable market
prices.** Each token now carries an explicit `priceSource` flag in
`RWA_TOKENS` (`lib/rpc.ts`) documenting exactly how its price is
determined, after manual research turned up a real problem: Routescan's
`tokeninfo` API returns `null`/0 for 7 of the 10 tokens, and naively
treating that as "$0 value" would understate real, legitimate RWA value
on the dashboard.

| Token | Treatment | Why |
|---|---|---|
| AUDM, AUDD, LQDX | `routescan`: trust the live API | Consistent pricing, no contradicting signal found |
| AUDF | `manual`, hardcoded ~$0.70 | Routescan returns null, but Coinbase, MEXC, CoinDesk, and RWA.xyz independently agree within a few cents, and RWA.xyz reports monthly third-party audits (tech: Source Hat; reserves: MVA Bennett, Melbourne) |
| AUDX | `unreliable`: shown as a range, excluded from TVL sum | Real trading exists, but CoinMarketCap ($0.0998), MEXC/Bitget (~$0.67-0.71), and Kraken ($1.00 flat) disagree by 5-10x, almost certainly due to thin volume. Citing any single number would be false precision |
| sHUT, WBIOME, FeTi70, DONO, BFT-TARAM | `no-market`: shown as "no public price", excluded from TVL sum | These are permissioned, KYC-gated instruments sold directly by the issuer to accredited investors (e.g. FeTi70's $100 minimum entry via Raze/Ferrox). No DEX pool or exchange lists any of them. I searched specifically for per-token prices for each and found only program-level deal-size figures (e.g. Hutly's $210M total tokenised assets); using those to back into a fabricated per-token price was deliberately avoided, since there's no source confirming how that total maps onto a specific token's supply |

**The TVL total shown on the dashboard only sums tokens with
`includedInTVL: true`** (the routescan + manual categories). The other 7
are displayed individually with honest "no public price" / range labeling
rather than silently folded into a `$0`, and a note on the dashboard itself
explains this. This means the displayed TVL figure is a **floor, not a
complete count**: real value exists in the excluded tokens, it's just not
price-discoverable on an open market. This is the more defensible position
for "data must match manually verified on-chain values": every number
shown is either a real on-chain quantity, a manually cross-checked price,
or an explicit "I don't have this", never an invented figure.

If this needs revisiting: re-run the same manual cross-check (Coinbase,
MEXC, CoinDesk, RWA.xyz, CoinGecko, CoinMarketCap: check at least 2-3
independent sources, not just one) before changing any `priceSource` flag,
and update the research date comment in `lib/rpc.ts` accordingly.

## Accredited Issuers Registry: verification notes

The Accredited Issuers Registry contract (`0x2d68f1C50a057a310EeF28DF3199F95A65cE4ac5`)
is not verified on the block explorer (no source or ABI), so it cannot be
called by function name. `getAccreditedIssuerCount` counts `getLogs` hits
against the `IssuerAdded` event topic
(`0x3727281905b135f0bb52f73f71460e5e2a3e14dd01879a3a478fa81870131a76`).

**This topic hash was manually verified on 2026-06-22** by fetching all
16 logs ever emitted by the contract with no topic filter, then inspecting
each unique topic. The one log matching our hash contains ABI-encoded
issuer data: name ("Averer"), a DID identifier, an identity provider URL
(`https://idp.averer.co`), and a cryptographic signature, exactly the
structure expected of an issuer registration event. All other topics on
the contract resolved to OpenZeppelin administrative events (RoleGranted,
RoleRevoked, Upgraded, Initialized, AdminChanged) or compact housekeeping
events with no structured identity data. The current count of **1
accredited issuer is correct**.
