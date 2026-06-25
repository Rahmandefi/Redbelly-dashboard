import { NextRequest, NextResponse } from "next/server";

const cache = new Map<string, { ts: number; data: unknown }>();
const TTL = 5 * 60 * 1000;

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const cached = cache.get(id);
  if (cached && Date.now() - cached.ts < TTL) {
    return NextResponse.json(cached.data);
  }

  const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=14&interval=daily`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    return NextResponse.json({ prices: [] });
  }

  const json = await res.json();
  const prices: [number, number][] = json.prices ?? [];

  // Deduplicate: keep one point per calendar day (last one wins)
  const byDay = new Map<string, { ts: number; price: number }>();
  for (const [ts, price] of prices) {
    const day = new Date(ts).toISOString().slice(0, 10);
    byDay.set(day, { ts, price });
  }
  const history = [...byDay.values()]
    .sort((a, b) => a.ts - b.ts)
    .map(({ ts, price }) => ({ date: ts, priceUSD: price }));

  const payload = { history };
  cache.set(id, { ts: Date.now(), data: payload });
  return NextResponse.json(payload);
}
