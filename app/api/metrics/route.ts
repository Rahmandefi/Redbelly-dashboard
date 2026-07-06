// app/api/metrics/route.ts
import { NextResponse } from "next/server";
import {
  getBlockNumber,
  getLatestBlock,
  getRecentActivity,
  getRecentBlocks,
  getRBNTPrice,
  getTotalSupply,
  getRWATokenData,
  getReddexStakingData,
  getReddexDEXData,
  getAccreditedIssuerCount,
  getTPS,
  getHistoricalStats,
  PARTNERSHIPS,
} from "@/lib/rpc";

export const dynamic = "force-dynamic";

// Each metric is fetched independently so one failure doesn't sink the rest.
async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<{ value: T; ok: boolean }> {
  try {
    const value = await fn();
    return { value, ok: true };
  } catch {
    return { value: fallback, ok: false };
  }
}

export async function GET() {
  const [
    blockNumber,
    latestBlock,
    recentActivity,
    price,
    totalSupply,
    rwaTokens,
    reddexStaking,
    reddexDEX,
    issuerCount,
    tps,
    recentBlocks,
    historicalStats,
  ] = await Promise.all([
    safe(getBlockNumber, 0),
    safe(getLatestBlock, null),
    safe(() => getRecentActivity(100), { activeAddresses: 0, transactionCount: 0, gasFeesRBNT: 0, contractsDeployed: 0 }),
    safe(getRBNTPrice, { usd: 0, change24h: 0 }),
    safe(getTotalSupply, 10_000_000_000),
    safe(getRWATokenData, []),
    safe(getReddexStakingData, {
      address: "",
      totalStakeRBNT: 0,
      withdrawFeePct: 0,
      rewardFeePct: 0,
      claimAble: false,
      apyPct: 0,
    }),
    safe(getReddexDEXData, { tvlUSD: 0, volumeUSD: 0, pairCount: 0, txCount: 0 }),
    safe(getAccreditedIssuerCount, 1),
    safe(getTPS, { tps: 0, blockTime: 0 }),
    safe(() => getRecentBlocks(5), [] as Array<{ number: number; timestamp: number; txCount: number; hashSuffix: string }>),
    safe(getHistoricalStats, { tx24h: 0, tx7d: 0, tx30d: 0, txAllTime: 0, gasFees24hRBNT: 0, contractsDeployed24h: 0 }),
  ]);

  // Gas price derived from the RPC block (baseFeePerGas is in wei; convert to gwei).
  // The Routescan gasoracle returned a raw wei value for chain 151 rather than the
  // Gwei string that endpoint normally yields on Ethereum, so I use the RPC block
  // directly to avoid displaying an astronomically wrong number.
  const gasPrice = (latestBlock.value?.baseFeePerGas ?? 0) / 1e9;

  const rwaTVL = rwaTokens.value.reduce((sum, t) => sum + t.tvlUSD, 0);
  const reddexTVL = reddexStaking.value.totalStakeRBNT * price.value.usd;

  const anyFailed = [
    blockNumber.ok,
    latestBlock.ok,
    recentActivity.ok,
    price.ok,
    totalSupply.ok,
    rwaTokens.ok,
    reddexStaking.ok,
    issuerCount.ok,
    tps.ok,
  ].some((ok) => !ok);

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    isStale: anyFailed,
    network: {
      blockNumber: blockNumber.value,
      latestBlock: latestBlock.value,
      tps: tps.value.tps,
      blockTime: tps.value.blockTime,
      gasPrice: gasPrice,
      totalSupply: totalSupply.value,
    },
    activity: {
      activeAddresses: recentActivity.value.activeAddresses,
      transactionsRecent: recentActivity.value.transactionCount,
      transactionsWindow: 100,
      gasFeesRBNT: recentActivity.value.gasFeesRBNT,
      contractsDeployed: recentActivity.value.contractsDeployed,
      verifiedWallets: 740000,
      tx24h: historicalStats.value.tx24h,
      tx7d: historicalStats.value.tx7d,
      tx30d: historicalStats.value.tx30d,
      txAllTime: historicalStats.value.txAllTime,
      gasFees24hRBNT: historicalStats.value.gasFees24hRBNT,
      contractsDeployed24h: historicalStats.value.contractsDeployed24h,
    },
    price: {
      ...price.value,
      unavailable: !price.ok,
    },
    tvl: {
      rwaTokens: rwaTokens.value,
      rwaTVL,
      reddexStaking: {
        ...reddexStaking.value,
        tvlUSD: reddexTVL,
      },
      reddexDEX: reddexDEX.value,
      // Combined for convenience, but the categories above remain
      // separately inspectable: tokenized RWA value and native-RBNT lock
      // staking are fundamentally different kinds of "locked value" and
      // should never be presented as a single unlabeled blob.
      totalUSD: rwaTVL + reddexTVL,
    },
    entities: {
      accreditedIssuers: issuerCount.value,
    },
    partnerships: PARTNERSHIPS,
    recentBlocks: recentBlocks.value,
  });
}
