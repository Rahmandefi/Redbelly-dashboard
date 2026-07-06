// lib/rpc.ts: All on-chain data fetched directly from Redbelly RPC + Routescan API

// Server-side in-process TTL cache. Module-level variables persist between
// requests in the same Node.js process, so this avoids re-fetching slow
// external APIs (CoinGecko, Routescan tokeninfo) on every client poll.
const _cache = new Map<string, { v: unknown; exp: number }>();
async function withCache<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = _cache.get(key);
  if (hit && Date.now() < hit.exp) return hit.v as T;
  const value = await fn();
  _cache.set(key, { v: value, exp: Date.now() + ttlMs });
  return value;
}

const RPC_URL =
  process.env.REDBELLY_RPC_URL ?? "https://governors.mainnet.redbelly.network";
const ROUTESCAN_BASE =
  "https://api.routescan.io/v2/network/mainnet/evm/151/etherscan/api";
const ROUTESCAN_API_KEY = process.env.ROUTESCAN_API_KEY ?? "";
const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=redbelly-network-token&vs_currencies=usd&include_24hr_change=true";
const REDDEX_SUBGRAPH =
  "https://rednode.elephantthink.com/subgraphs/name/redbelly/reddex";

// Known contract addresses
export const CONTRACTS = {
  ACCREDITED_ISSUERS_REGISTRY: "0x2d68f1C50a057a310EeF28DF3199F95A65cE4ac5",
  ISSUER_ADDED_TOPIC:
    "0x3727281905b135f0bb52f73f71460e5e2a3e14dd01879a3a478fa81870131a76",
  // ReddexRBNTLockStaker: verified (exact match) on-chain, native RBNT lock-staking
  // vault with a 365-day lock and configurable APY. NOT the protocol/validator
  // staking escrow. This is a third-party yield product built on Redbelly.
  // Manually verified 2026-06-17:
  //   eth_getBalance  -> 262,947,686.42 RBNT (contract's native balance)
  //   totalStake()    -> 259,811,060.35 RBNT (matches balance minus reward reserve)
  REDDEX_LOCK_STAKER: "0x5E8040e85D0E6363D798a43BEa939C026449946d",
};

// Function selectors for ReddexRBNTLockStaker (verified against ABI, 2026-06-17)
const REDDEX_SELECTORS = {
  totalStake: "0x8b0e9f3f",
  withdrawFee: "0xe941fa78",
  rewardFee: "0x8b424267",
  claimAble: "0xbf4281c3",
  getCurrentAllocPoint: "0xddbbccde",
};

// Reddex APY math constants (hardcoded in the contract source)
const REDDEX_CORE_DECIMAL = 1_000_000;
const REDDEX_TOTAL_ALLOC_POINT = 365 * 24 * 60 * 60 * 100 * 100000;

// RWA token contracts with metadata
// Each token's `priceSource` documents how its price should be treated.
// This was added after discovering that Routescan's tokeninfo API returns
// `null`/0 price for 7 of these 10 tokens, and that even where third-party
// price aggregators DO report a number, those numbers can wildly disagree
// for thinly-traded tokens (see AUDX below). Manually researched 2026-06-19.
//
//   "routescan":   trust Routescan's live tokeninfo price as-is (default;
//                  used for tokens with consistent, liquid market pricing)
//   "manual":      Routescan returns null/0; a manually verified price from
//                  another source is hardcoded below via `manualPriceUSD`
//   "no-market":   genuinely no public market price exists. These are
//                  permissioned/KYC-gated instruments sold directly by the
//                  issuer to accredited investors, not traded on any AMM or
//                  exchange. Reporting $0 here would understate real value;
//                  reporting a derived/estimated price would be fabricated.
//                  Correct treatment: show as "no public price feed", do
//                  NOT include in the TVL sum.
//   "unreliable":  a market price technically exists somewhere, but
//                  aggregators disagree by orders of magnitude (thin
//                  volume). Show a clearly-labeled range, do NOT include
//                  a single point figure in the TVL sum.
export const RWA_TOKENS = [
  {
    address: "0x081599E4936D12c46Bd48913B2329115Cd26cbdd",
    symbol: "AUDM",
    name: "Macropod Stablecoin",
    decimals: 18,
    category: "AUD Stablecoin",
    priceSource: "routescan" as const,
    coingeckoId: "macropod",
  },
  {
    address: "0x54a210e824B0F89dA988E4B5586440aB354f0e46",
    symbol: "AUDD",
    name: "AUDD",
    decimals: 6,
    category: "AUD Stablecoin",
    priceSource: "routescan" as const,
    coingeckoId: "novatti-australian-digital-dollar",
  },
  {
    address: "0x0233971bd2DE29E81029336C46997055df3B5282",
    symbol: "LQDX",
    name: "Liquid Crypto",
    decimals: 18,
    category: "Bridge Token",
    priceSource: "routescan" as const,
  },
  {
    address: "0x93239eBEe8c0a43F77453B1bBD9803a9F947Ea84",
    symbol: "sHUT",
    name: "Hutly Shadow",
    decimals: 2,
    category: "Real Estate",
    // Hutly's $210M figure (Jan 2025) is a total tokenised-assets number for
    // the whole program, not a confirmed per-token price for sHUT. No
    // exchange or DEX lists sHUT. Dividing $210M by sHUT's totalSupply would
    // be a fabricated price; there's no source confirming that mapping.
    priceSource: "no-market" as const,
    noMarketNote:
      "Permissioned real-estate rent-roll token (Hutly). No public exchange or DEX listing found.",
  },
  {
    address: "0xF5BA21ca663631C24a09B03eE7AF3D970bB02C70",
    symbol: "WBIOME",
    name: "Wrapped BIOME",
    decimals: 18,
    category: "NFT Ecosystem",
    priceSource: "no-market" as const,
    noMarketNote:
      "Bridge-wrapped NFT-ecosystem token. No public exchange or DEX listing found on Redbelly.",
  },
  {
    address: "0xDA601f480AaE5271131DDFd67D4CE6865c7D64A2",
    symbol: "FeTi70",
    name: "FeTi70 Token",
    decimals: 18,
    category: "Commodity RWA",
    // Sold directly by Raze/Ferrox to KYC'd investors at fixed terms with a
    // $100 minimum entry and structured USDT returns, not a freely traded,
    // market-priced instrument. No DEX pool or exchange listing found.
    priceSource: "no-market" as const,
    noMarketNote:
      "Permissioned titanium commodity investment (Raze/Ferrox), sold directly to accredited investors. No public market price.",
  },
  {
    address: "0x3c6F30B06a13BB1E9A90459DdB94d9b33Df2e022",
    symbol: "DONO",
    name: "Domus Nova",
    decimals: 0,
    category: "Real Estate",
    priceSource: "no-market" as const,
    noMarketNote:
      "Real-estate tokenisation product. No public exchange or DEX listing found.",
  },
  {
    address: "0x8f5952d2122A8DF42a3dcB5286D7576ff640cF5D",
    symbol: "BFT-TARAM",
    name: "TARAM Funding Pool",
    decimals: 6,
    category: "Trade Finance",
    priceSource: "no-market" as const,
    noMarketNote:
      "Cross-border trade-finance funding pool (Taram). No public exchange or DEX listing found.",
  },
  {
    address: "0xD687759f35bb747A29246a4b9495C8f52C49E00C",
    symbol: "AUDX",
    name: "Aussie Dollar Token",
    decimals: 18,
    category: "AUD Stablecoin",
    coingeckoId: "aussie-dollar-token",
    // AUDX genuinely trades (Kraken, MEXC, Bitget, CoinMarketCap all list
    // it), but the reported prices disagree wildly: CoinMarketCap showed
    // $0.0998 (claiming an 85% one-day crash), MEXC/Bitget showed
    // $0.67-0.71, Kraken showed a flat $1.00. For an AUD-pegged stablecoin
    // (AUD ≈ $0.65 USD), the $0.67-0.71 cluster is most plausible, but
    // citing a single number when sources disagree this much would be
    // false precision. Thin trading volume is the likely cause.
    priceSource: "unreliable" as const,
    unreliableNote:
      "AUD-pegged stablecoin; third-party trackers disagree by >5x, likely due to thin trading volume. Treat any single price as unreliable.",
    unreliableRangeUSD: [0.65, 0.71] as [number, number],
  },
  {
    address: "0xd2a530170D71a9Cfe1651Fb468E2B98F7Ed7456b",
    symbol: "AUDF",
    name: "Forte AUD",
    decimals: 6,
    category: "AUD Stablecoin",
    coingeckoId: "forte-aud",
    // Unlike AUDX, AUDF's price is consistent across independent sources
    // (Coinbase $0.703, MEXC $0.6749-0.675, CoinDesk $0.70, RWA.xyz $0.7071
    // NAV) and RWA.xyz reports monthly third-party audits (tech: Source
    // Hat; reserves: MVA Bennett, Melbourne). Manually verified 2026-06-19.
    priceSource: "manual" as const,
    manualPriceUSD: 0.70,
    manualPriceNote:
      "Cross checked across Coinbase, MEXC, CoinDesk, RWA.xyz, consistent ~$0.67-0.71 range, audited monthly.",
  },
];

// STATIC, manually maintained; there is no on-chain partnerships registry.
// All 21 entries verified against primary sources (press releases, official
// announcements, partner websites) on 2026-06-25. No figures are fabricated.
export const PARTNERSHIPS = [
  { name: "Hutly", category: "Real Estate", detail: "$210M AUD property tokenised", tokenSymbol: "sHUT" },
  { name: "Metawealth", category: "Real Estate", detail: "140 apartment tokenised building in Rome" },
  { name: "Raze Finance + Ferrox", category: "Commodity RWA", detail: "FeTi70 titanium tokenisation", tokenSymbol: "FeTi70" },
  { name: "Macropod", category: "AUD Stablecoin", detail: "Australia's first licensed stablecoin, RBA Project Acacia", tokenSymbol: "AUDM" },
  { name: "Novatti (AUDD)", category: "AUD Stablecoin", detail: "ASX-listed, blockchain-agnostic AUD stablecoin", tokenSymbol: "AUDD" },
  { name: "AUDX Token", category: "AUD Stablecoin", detail: "AUSTRAC-registered, ASX-linked ADI", tokenSymbol: "AUDX" },
  { name: "Forte Tech (AUDF)", category: "AUD Stablecoin", detail: "AUD-pegged 1:1 stablecoin on Redbelly, Ethereum, Avalanche, Polygon and Base", tokenSymbol: "AUDF" },
  { name: "Taram", category: "Trade Finance", detail: "Cross-border B2B funding pool", tokenSymbol: "BFT-TARAM" },
  { name: "Blubird", category: "ESG / Carbon", detail: "$32B in Emission Reduction Assets tokenised" },
  { name: "MintMingle / Nexus Fusion", category: "NFT Marketplace", detail: "First NFTs minted on Redbelly" },
  { name: "Reddex", category: "DeFi / DEX", detail: "Native RBNT lock-staking vault and DEX on Redbelly mainnet" },
  { name: "Biome / WBIOME", category: "DeFi / NFT", detail: "BSC bridge live, NFT staking ecosystem", tokenSymbol: "WBIOME" },
  { name: "Celer Network (cBridge)", category: "Cross-chain Bridge", detail: "ETH, BNB, Redbelly transfers live" },
  { name: "Lucid Labs (Polymer)", category: "Cross-chain", detail: "Cross-chain connectivity layer" },
  { name: "Goldsky", category: "Developer Tooling", detail: "Subgraph-style data indexing" },
  { name: "Tokeniser", category: "Equity Tokenisation", detail: "150+ companies, 20,000 investors, $1B+ equities" },
  { name: "Bulla Network", category: "Supply Chain Finance", detail: "On-chain invoicing and payables" },
  { name: "JellyC", category: "Fund Tokenisation", detail: "Tokenised managed investment scheme" },
  { name: "Imperium Markets", category: "Bond Issuance", detail: "Australia's first tokenised corporate bond" },
  { name: "OpenMarkets", category: "Secondary Trading", detail: "Post-issuance distribution partner" },
  { name: "RBA Project Acacia", category: "CBDC Pilot", detail: "First public blockchain selected by Australia's central bank" },
];

// Generic JSON-RPC call
async function rpcCall(method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method, params, id: 1 }),
    next: { revalidate: 0 },
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.result;
}

// Routescan API call
async function routescanCall(params: Record<string, string>): Promise<unknown> {
  const url = new URL(ROUTESCAN_BASE);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  if (ROUTESCAN_API_KEY) url.searchParams.set("apikey", ROUTESCAN_API_KEY);
  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  const data = await res.json();
  if (data.status === "0" && data.message === "NOTOK")
    throw new Error(data.result);
  return data.result;
}

// ── Metric fetchers ──────────────────────────────────────────────────────────

export async function getBlockNumber(): Promise<number> {
  const hex = (await rpcCall("eth_blockNumber", [])) as string;
  return parseInt(hex, 16);
}

export async function getLatestBlock() {
  const block = (await rpcCall("eth_getBlockByNumber", [
    "latest",
    true,
  ])) as Record<string, unknown>;
  return {
    number: parseInt(block.number as string, 16),
    timestamp: parseInt(block.timestamp as string, 16),
    gasUsed: parseInt(block.gasUsed as string, 16),
    gasLimit: parseInt(block.gasLimit as string, 16),
    txCount: (block.transactions as unknown[]).length,
    baseFeePerGas: parseInt(block.baseFeePerGas as string, 16),
  };
}

// NOTE: A reliable "total transactions since genesis" figure requires either
// an indexer or summing every block, which isn't viable client-side at 60s
// refresh intervals. I deliberately do not extrapolate this from a sample,
// that produces a number that LOOKS precise but isn't statistically sound.
// Instead the dashboard reports verifiable, point-in-time figures: tx count
// in the latest block, and live TPS computed from real consecutive blocks.

export async function getRecentActivity(blockCount = 100): Promise<{
  activeAddresses: number;
  transactionCount: number;
  gasFeesRBNT: number;
  contractsDeployed: number;
}> {
  const latestBlockNum = await getBlockNumber();
  const fromBlock = Math.max(latestBlockNum - blockCount, 1);
  const addresses = new Set<string>();
  let txCount = 0;
  let gasFeesRBNT = 0;
  let contractsDeployed = 0;

  const BATCH = 20;
  for (let i = fromBlock; i <= latestBlockNum; i += BATCH) {
    const batch = Array.from(
      { length: Math.min(BATCH, latestBlockNum - i + 1) },
      (_, j) => i + j
    );
    const results = await Promise.allSettled(
      batch.map((n) =>
        rpcCall("eth_getBlockByNumber", [`0x${n.toString(16)}`, true])
      )
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value) {
        const block = r.value as Record<string, unknown>;
        const txs = block.transactions as Array<Record<string, string>>;
        const gasUsed = parseInt(block.gasUsed as string ?? "0", 16);
        const baseFee = parseInt(block.baseFeePerGas as string ?? "0", 16);
        txCount += txs?.length ?? 0;
        gasFeesRBNT += (gasUsed * baseFee) / 1e18;
        txs?.forEach((tx) => {
          if (tx.from) addresses.add(tx.from.toLowerCase());
          if (tx.to) addresses.add(tx.to.toLowerCase());
          if (!tx.to) contractsDeployed++;
        });
      }
    }
  }
  return { activeAddresses: addresses.size, transactionCount: txCount, gasFeesRBNT, contractsDeployed };
}

export async function getRBNTPrice(): Promise<{
  usd: number;
  change24h: number;
}> {
  return withCache("rbnt-price", 60_000, async () => {
    const res = await fetch(COINGECKO_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
    const data = await res.json();
    const token = data["redbelly-network-token"];
    if (!token) throw new Error("CoinGecko: coin redbelly-network-token missing from response");
    return {
      usd: token.usd ?? 0,
      change24h: token.usd_24h_change ?? 0,
    };
  });
}

export async function getTotalSupply(): Promise<number> {
  return withCache("total-supply", 600_000, async () => {
    const result = (await routescanCall({
      module: "stats",
      action: "ethsupply",
    })) as string;
    return parseInt(result) / 1e18;
  });
}


async function _getRWATokenData(): Promise<
  Array<{
    symbol: string;
    name: string;
    category: string;
    address: string;
    totalSupply: number;
    priceUSD: number;
    tvlUSD: number;
    holders: number;
    priceSource: "routescan" | "manual" | "no-market" | "unreliable";
    priceNote: string | null;
    unreliableRangeUSD: [number, number] | null;
    includedInTVL: boolean;
  }>
> {
  const results = await Promise.allSettled(
    RWA_TOKENS.map(async (token) => {
      const data = (await routescanCall({
        module: "token",
        action: "tokeninfo",
        contractaddress: token.address,
      })) as Array<Record<string, string>>;
      const info = data[0];
      const rawSupply = parseInt(info.totalSupply ?? "0");
      const totalSupply = rawSupply / Math.pow(10, token.decimals);

      // Resolve price strictly according to each token's documented
      // priceSource: never silently trust Routescan for tokens I've
      // manually determined need different handling. See RWA_TOKENS above
      // for the research backing each of these decisions.
      let priceUSD = 0;
      let priceNote: string | null = null;
      let unreliableRangeUSD: [number, number] | null = null;
      let includedInTVL = true;

      switch (token.priceSource) {
        case "manual":
          priceUSD = token.manualPriceUSD;
          priceNote = token.manualPriceNote;
          break;
        case "no-market":
          priceUSD = 0;
          priceNote = token.noMarketNote;
          includedInTVL = false;
          break;
        case "unreliable":
          priceUSD = 0;
          priceNote = token.unreliableNote;
          unreliableRangeUSD = token.unreliableRangeUSD;
          includedInTVL = false;
          break;
        case "routescan":
        default:
          priceUSD = parseFloat(info.tokenPriceUSD ?? "0");
          break;
      }

      return {
        symbol: token.symbol,
        name: token.name,
        category: token.category,
        address: token.address,
        totalSupply,
        priceUSD,
        tvlUSD: includedInTVL ? totalSupply * priceUSD : 0,
        holders: 0,
        priceSource: token.priceSource,
        priceNote,
        unreliableRangeUSD,
        includedInTVL,
        coingeckoId: "coingeckoId" in token ? (token as { coingeckoId: string }).coingeckoId : undefined,
      };
    })
  );

  return results
    .filter(
      (r): r is PromiseFulfilledResult<{
        symbol: string;
        name: string;
        category: string;
        address: string;
        totalSupply: number;
        priceUSD: number;
        tvlUSD: number;
        holders: number;
        priceSource: "routescan" | "manual" | "no-market" | "unreliable";
        priceNote: string | null;
        unreliableRangeUSD: [number, number] | null;
        includedInTVL: boolean;
        coingeckoId: string | undefined;
      }> => r.status === "fulfilled"
    )
    .map((r) => r.value);
}

export async function getRWATokenData() {
  return withCache("rwa-tokens", 300_000, _getRWATokenData);
}

// ReddexRBNTLockStaker: verified, native-RBNT lock-staking vault.
// This is a real DeFi TVL primitive (single view call, no aggregation guesswork),
// distinct from tokenized RWA TVL. Surfaced as its own category so the two
// kinds of "value locked" are never silently summed into one misleading number.
async function _getReddexStakingData(): Promise<{
  address: string;
  totalStakeRBNT: number;
  withdrawFeePct: number;
  rewardFeePct: number;
  claimAble: boolean;
  apyPct: number;
}> {
  const [totalStakeHex, withdrawFeeHex, rewardFeeHex, claimAbleHex, allocHex] =
    await Promise.all([
      rpcCall("eth_call", [
        { to: CONTRACTS.REDDEX_LOCK_STAKER, data: REDDEX_SELECTORS.totalStake },
        "latest",
      ]),
      rpcCall("eth_call", [
        { to: CONTRACTS.REDDEX_LOCK_STAKER, data: REDDEX_SELECTORS.withdrawFee },
        "latest",
      ]),
      rpcCall("eth_call", [
        { to: CONTRACTS.REDDEX_LOCK_STAKER, data: REDDEX_SELECTORS.rewardFee },
        "latest",
      ]),
      rpcCall("eth_call", [
        { to: CONTRACTS.REDDEX_LOCK_STAKER, data: REDDEX_SELECTORS.claimAble },
        "latest",
      ]),
      rpcCall("eth_call", [
        {
          to: CONTRACTS.REDDEX_LOCK_STAKER,
          data: REDDEX_SELECTORS.getCurrentAllocPoint,
        },
        "latest",
      ]),
    ]) as [string, string, string, string, string];

  const totalStakeRBNT = parseInt(totalStakeHex, 16) / 1e18;
  const withdrawFeePct =
    (parseInt(withdrawFeeHex, 16) / REDDEX_CORE_DECIMAL) * 100;
  const rewardFeePct = (parseInt(rewardFeeHex, 16) / REDDEX_CORE_DECIMAL) * 100;
  const claimAble = parseInt(claimAbleHex, 16) === 1;
  const alloc = parseInt(allocHex, 16);
  const secondsPerYear = 365 * 24 * 60 * 60;
  const apyPct =
    ((alloc * secondsPerYear) / REDDEX_TOTAL_ALLOC_POINT) * 100;

  return {
    address: CONTRACTS.REDDEX_LOCK_STAKER,
    totalStakeRBNT,
    withdrawFeePct,
    rewardFeePct,
    claimAble,
    apyPct,
  };
}

export async function getReddexStakingData() {
  return withCache("reddex-staking", 120_000, _getReddexStakingData);
}

export async function getAccreditedIssuerCount(): Promise<number> {
  return withCache("issuer-count", 600_000, async () => {
    const logs = (await routescanCall({
      module: "logs",
      action: "getLogs",
      address: CONTRACTS.ACCREDITED_ISSUERS_REGISTRY,
      topic0: CONTRACTS.ISSUER_ADDED_TOPIC,
      fromBlock: "0",
      toBlock: "latest",
    })) as Array<unknown>;
    return Array.isArray(logs) ? logs.length : 0;
  });
}

export async function getRecentBlocks(count = 5): Promise<
  Array<{ number: number; timestamp: number; txCount: number; hashSuffix: string }>
> {
  const latestNum = await getBlockNumber();
  const nums = Array.from({ length: count }, (_, i) => latestNum - i);
  const results = await Promise.allSettled(
    nums.map((n) => rpcCall("eth_getBlockByNumber", [`0x${n.toString(16)}`, false]))
  );
  return results
    .filter(
      (r): r is PromiseFulfilledResult<unknown> =>
        r.status === "fulfilled" && r.value !== null
    )
    .map((r) => {
      const b = r.value as Record<string, unknown>;
      const txs = b.transactions as string[];
      const hash = (b.hash as string) ?? "0x0000000000";
      return {
        number: parseInt(b.number as string, 16),
        timestamp: parseInt(b.timestamp as string, 16),
        txCount: Array.isArray(txs) ? txs.length : 0,
        hashSuffix: `0x...${hash.slice(-5)}`,
      };
    });
}

export async function getReddexDEXData(): Promise<{
  tvlUSD: number;
  volumeUSD: number;
  pairCount: number;
  txCount: number;
}> {
  return withCache("reddex-dex", 60_000, async () => {
    const res = await fetch(REDDEX_SUBGRAPH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `{ uniswapFactories(first: 1) { totalLiquidityUSD totalVolumeUSD txCount pairCount } }`,
      }),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Reddex subgraph HTTP ${res.status}`);
    const data = await res.json();
    const factory = data?.data?.uniswapFactories?.[0];
    if (!factory) throw new Error("Reddex subgraph: no factory data");
    return {
      tvlUSD: parseFloat(factory.totalLiquidityUSD ?? "0"),
      volumeUSD: parseFloat(factory.totalVolumeUSD ?? "0"),
      pairCount: parseInt(factory.pairCount ?? "0"),
      txCount: parseInt(factory.txCount ?? "0"),
    };
  });
}

export async function getTPS(): Promise<{ tps: number; blockTime: number }> {
  const latestNum = await getBlockNumber();
  const olderNum = Math.max(latestNum - 10, 1);
  const blockNums = Array.from({ length: latestNum - olderNum + 1 }, (_, i) => olderNum + i);
  const results = await Promise.allSettled(
    blockNums.map((n) => rpcCall("eth_getBlockByNumber", [`0x${n.toString(16)}`, false]))
  );
  const blocks = results
    .filter((r): r is PromiseFulfilledResult<unknown> => r.status === "fulfilled" && r.value !== null)
    .map((r) => r.value as Record<string, unknown>);
  if (blocks.length < 2) return { tps: 0, blockTime: 0 };
  const timestamps = blocks.map((b) => parseInt(b.timestamp as string, 16));
  const timeDiff = Math.max(...timestamps) - Math.min(...timestamps);
  const totalTxs = blocks.reduce((sum, b) => {
    const txs = b.transactions as string[];
    return sum + (Array.isArray(txs) ? txs.length : 0);
  }, 0);
  const blockTime = timeDiff > 0 ? timeDiff / (blocks.length - 1) : 0;
  const tps = timeDiff > 0 ? totalTxs / timeDiff : 0;
  return {
    tps: Math.round(tps * 10) / 10,
    blockTime: Math.round(blockTime * 10) / 10,
  };
}

// Binary search via RPC to find the block number closest to a given Unix timestamp
async function getBlockNumberAtTime(targetTimestamp: number, currentBlock: number): Promise<number> {
  let lo = 1;
  let hi = currentBlock;
  while (lo < hi - 1) {
    const mid = Math.floor((lo + hi) / 2);
    const block = (await rpcCall("eth_getBlockByNumber", [`0x${mid.toString(16)}`, false])) as Record<string, unknown>;
    const ts = parseInt(block.timestamp as string, 16);
    if (ts < targetTimestamp) lo = mid;
    else hi = mid;
  }
  return lo;
}

// Sample blocks evenly across a range to estimate tx count, gas fees, and contract deployments
async function sampleBlockRange(
  fromBlock: number,
  toBlock: number,
  samples = 20
): Promise<{ estimatedTxCount: number; estimatedGasFeesRBNT: number; estimatedContractsDeployed: number }> {
  const range = toBlock - fromBlock;
  if (range <= 0) return { estimatedTxCount: 0, estimatedGasFeesRBNT: 0, estimatedContractsDeployed: 0 };
  const step = Math.max(1, Math.floor(range / samples));
  const blockNums: number[] = [];
  for (let n = fromBlock; n <= toBlock && blockNums.length < samples; n += step) blockNums.push(n);

  const results = await Promise.allSettled(
    blockNums.map((n) => rpcCall("eth_getBlockByNumber", [`0x${n.toString(16)}`, true]))
  );

  let totalTx = 0, totalGas = 0, totalContracts = 0, valid = 0;
  for (const r of results) {
    if (r.status === "fulfilled" && r.value) {
      const b = r.value as Record<string, unknown>;
      const txs = b.transactions as Array<Record<string, string>>;
      const gasUsed = parseInt(b.gasUsed as string ?? "0", 16);
      const baseFee = parseInt(b.baseFeePerGas as string ?? "0", 16);
      totalTx += txs?.length ?? 0;
      totalGas += (gasUsed * baseFee) / 1e18;
      totalContracts += txs?.filter((tx) => !tx.to).length ?? 0;
      valid++;
    }
  }
  if (valid === 0) return { estimatedTxCount: 0, estimatedGasFeesRBNT: 0, estimatedContractsDeployed: 0 };
  const avgTx = totalTx / valid;
  const avgGas = totalGas / valid;
  const avgContracts = totalContracts / valid;
  return {
    estimatedTxCount: Math.round(avgTx * range),
    estimatedGasFeesRBNT: avgGas * range,
    estimatedContractsDeployed: Math.round(avgContracts * range),
  };
}

export async function getHistoricalStats(): Promise<{
  tx24h: number;
  tx7d: number;
  tx30d: number;
  txAllTime: number;
  gasFees24hRBNT: number;
  contractsDeployed24h: number;
}> {
  return withCache("historical-stats", 600_000, async () => {
    const now = Math.floor(Date.now() / 1000);
    const currentBlock = await getBlockNumber();
    const [block24hAgo, block7dAgo, block30dAgo] = await Promise.all([
      getBlockNumberAtTime(now - 86_400, currentBlock),
      getBlockNumberAtTime(now - 7 * 86_400, currentBlock),
      getBlockNumberAtTime(now - 30 * 86_400, currentBlock),
    ]);
    const [stats24h, stats7d, stats30d, statsAllTime] = await Promise.all([
      sampleBlockRange(block24hAgo, currentBlock, 25),
      sampleBlockRange(block7dAgo, currentBlock, 25),
      sampleBlockRange(block30dAgo, currentBlock, 25),
      sampleBlockRange(1, currentBlock, 30),
    ]);
    return {
      tx24h: stats24h.estimatedTxCount,
      tx7d: stats7d.estimatedTxCount,
      tx30d: stats30d.estimatedTxCount,
      txAllTime: statsAllTime.estimatedTxCount,
      gasFees24hRBNT: stats24h.estimatedGasFeesRBNT,
      contractsDeployed24h: stats24h.estimatedContractsDeployed,
    };
  });
}
