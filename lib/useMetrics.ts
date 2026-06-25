"use client";

import { useEffect, useRef, useState } from "react";

export interface RWAToken {
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
  coingeckoId?: string;
}

export interface Partnership {
  name: string;
  category: string;
  detail: string;
  tokenSymbol?: string;
}

export interface ReddexDEX {
  tvlUSD: number;
  volumeUSD: number;
  pairCount: number;
  txCount: number;
}

export interface RecentBlock {
  number: number;
  timestamp: number;
  txCount: number;
  hashSuffix: string;
}

export interface MetricsData {
  timestamp: string;
  isStale: boolean;
  network: {
    blockNumber: number;
    latestBlock: {
      number: number;
      timestamp: number;
      gasUsed: number;
      gasLimit: number;
      txCount: number;
      baseFeePerGas: number;
    } | null;
    tps: number;
    blockTime: number;
    gasPrice: number;
    totalSupply: number;
  };
  activity: {
    activeAddresses: number;
    transactionsRecent: number;
    transactionsWindow: number;
    verifiedWallets: number;
  };
  price: { usd: number; change24h: number; unavailable: boolean };
  tvl: {
    rwaTokens: RWAToken[];
    rwaTVL: number;
    reddexStaking: {
      address: string;
      totalStakeRBNT: number;
      withdrawFeePct: number;
      rewardFeePct: number;
      claimAble: boolean;
      apyPct: number;
      tvlUSD: number;
    };
    reddexDEX: ReddexDEX;
    totalUSD: number;
  };
  entities: { accreditedIssuers: number };
  partnerships: Partnership[];
  recentBlocks: RecentBlock[];
}

const REFRESH_INTERVAL = 30_000;

export function useMetrics() {
  const [data, setData] = useState<MetricsData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isConnectionDown, setIsConnectionDown] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const lastGood = useRef<MetricsData | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchMetrics() {
      try {
        const res = await fetch("/api/metrics", { cache: "no-store" });
        if (!res.ok) throw new Error("Bad response");
        const json: MetricsData = await res.json();
        if (cancelled) return;
        lastGood.current = json;
        setData(json);
        setLastUpdated(new Date());
        setIsConnectionDown(false);
      } catch {
        if (cancelled) return;
        setIsConnectionDown(true);
        if (lastGood.current) {
          setData({ ...lastGood.current, isStale: true });
        }
      } finally {
        if (!cancelled) setRefreshKey((k) => k + 1);
      }
    }

    fetchMetrics();
    const id = setInterval(fetchMetrics, REFRESH_INTERVAL);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return {
    data,
    lastUpdated,
    isStale: isConnectionDown || data?.isStale === true,
    refreshKey,
    intervalMs: REFRESH_INTERVAL,
  };
}
