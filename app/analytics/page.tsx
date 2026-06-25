"use client";

import { useMetrics } from "@/lib/useMetrics";
import type { RWAToken } from "@/lib/useMetrics";
import NavBar from "@/components/NavBar";

const ACCENT = "var(--accent)";
const TEAL = "var(--teal)";
const MUTED = "var(--muted)";
const SURFACE = "var(--surface)";
const CARD_BG = "var(--card)";
const DARK_BG = "var(--dark)";

// ---- formatters ----------------------------------------------------------------

function formatLargeUSD(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function formatSupply(n: number, decimals = 0): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("en-US", { maximumFractionDigits: decimals });
}

function timeAgoFromTs(ts: number): string {
  const s = Math.floor(Date.now() / 1000 - ts);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

// ---- RWA table row -------------------------------------------------------------

function RWARow({ token }: { token: RWAToken }) {
  let valueDisplay: string;
  let valueColor = SURFACE;
  if (token.includedInTVL) {
    valueDisplay = formatLargeUSD(token.tvlUSD);
  } else if (token.priceSource === "unreliable" && token.unreliableRangeUSD) {
    valueDisplay = `~$${token.unreliableRangeUSD[0].toFixed(2)}-$${token.unreliableRangeUSD[1].toFixed(2)}/token`;
    valueColor = MUTED;
  } else {
    valueDisplay = "No public price";
    valueColor = MUTED;
  }

  return (
    <tr
      className="data-grid-row transition-colors"
      style={{ borderBottom: "1px solid rgba(132, 139, 145, 0.1)" }}
    >
      <td className="px-6 py-4">
        <div className="flex items-center gap-4">
          <div
            className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: "rgba(255, 80, 80, 0.1)" }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "18px", color: ACCENT }}
            >
              token
            </span>
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: "14px" }}>
              {token.name}
            </div>
            <a
              href={`https://redbelly.routescan.io/token/${token.address}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: "11px",
                color: MUTED,
                textDecoration: "underline dotted",
                cursor: "pointer",
              }}
            >
              {token.address.slice(0, 6)}...{token.address.slice(-4)}
            </a>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <span
          className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
          style={{
            backgroundColor: "rgba(132, 139, 145, 0.1)",
            color: MUTED,
          }}
        >
          {token.category}
        </span>
      </td>
      <td
        className="px-6 py-4 text-right"
        style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "13px" }}
      >
        {formatSupply(token.totalSupply)} {token.symbol}
      </td>
      <td
        className="px-6 py-4 text-right"
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: "13px",
          color: valueColor,
          fontStyle: token.includedInTVL ? "normal" : "italic",
        }}
      >
        {valueDisplay}
      </td>
    </tr>
  );
}

// ---- main page -----------------------------------------------------------------

export default function AnalyticsPage() {
  const { data, lastUpdated, isStale } = useMetrics();

  const loading = !data;
  const sortedTokens = data
    ? [...data.tvl.rwaTokens].sort((a, b) => b.tvlUSD - a.tvlUSD)
    : [];

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "var(--bg)", color: "var(--surface)" }}
    >
      <NavBar lastUpdated={lastUpdated} isStale={isStale} />

      {/* Filter bar */}
      <section
        className="flex flex-col md:flex-row justify-between items-center gap-4 px-4 sm:px-8 py-6"
        style={{
          backgroundColor: "rgba(40, 58, 70, 0.4)",
          borderBottom: "1px solid rgba(132, 139, 145, 0.1)",
        }}
      >
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: 500, lineHeight: "28px" }}>
            Institutional RWA Analytics
          </h2>
          <p style={{ color: MUTED, fontSize: "14px", marginTop: "2px" }}>
            Real-time performance metrics for the Redbelly Network ecosystem.
          </p>
        </div>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 600,
            padding: "4px 12px",
            borderRadius: "20px",
            backgroundColor: "rgba(94, 219, 191, 0.08)",
            color: TEAL,
            border: "1px solid rgba(94, 219, 191, 0.25)",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          Live snapshot
        </span>
      </section>

      <main className="flex-grow px-4 sm:px-8 py-6 sm:py-8">
        {loading ? (
          <div className="flex items-center justify-center py-40">
            <div
              className="animate-pulse-green"
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                backgroundColor: TEAL,
              }}
            />
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-5">
            {/* TVL Growth - large bento */}
            <div
              className="col-span-12 lg:col-span-8 p-6 rounded-xl"
              style={{
                backgroundColor: CARD_BG,
                border: "1px solid rgba(132, 139, 145, 0.2)",
              }}
            >
              <div className="flex justify-between items-end mb-6">
                <div>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      color: MUTED,
                    }}
                  >
                    Ecosystem TVL (Live)
                  </span>
                  <h3
                    style={{
                      fontSize: "28px",
                      fontWeight: 600,
                      color: ACCENT,
                      marginTop: "4px",
                    }}
                  >
                    {formatLargeUSD(data.tvl.totalUSD)}
                  </h3>
                </div>
                <div style={{ color: MUTED, fontSize: "12px" }}>
                  Live snapshot
                </div>
              </div>
              {/* Per-token TVL breakdown */}
              {(() => {
                const allItems = [
                  ...sortedTokens.map(t => ({
                    label: t.symbol,
                    sublabel: t.name,
                    value: t.tvlUSD,
                    included: t.includedInTVL,
                    priceSource: t.priceSource,
                    rangeUSD: t.unreliableRangeUSD,
                    color: TEAL,
                  })),
                  {
                    label: "Reddex Staking",
                    sublabel: "Native RBNT lock vault",
                    value: data.tvl.reddexStaking.tvlUSD,
                    included: true,
                    priceSource: "routescan" as const,
                    rangeUSD: null,
                    color: ACCENT,
                  },
                ];
                const maxValue = Math.max(...allItems.filter(i => i.included).map(i => i.value), 1);
                return (
                  <div className="flex flex-col gap-2 mt-2">
                    {allItems.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div style={{ width: "80px", flexShrink: 0 }}>
                          <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--surface)" }}>{item.label}</div>
                          <div style={{ fontSize: "10px", color: MUTED, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.sublabel}</div>
                        </div>
                        <div className="flex-1 relative" style={{ height: "20px" }}>
                          <div
                            style={{
                              position: "absolute",
                              inset: 0,
                              borderRadius: "4px",
                              backgroundColor: "rgba(132, 139, 145, 0.08)",
                            }}
                          />
                          <div
                            style={{
                              position: "absolute",
                              left: 0,
                              top: 0,
                              bottom: 0,
                              borderRadius: "4px",
                              width: item.included && item.value > 0
                                ? `${Math.max((item.value / maxValue) * 100, 2)}%`
                                : "6px",
                              backgroundColor: item.included
                                ? item.color === ACCENT
                                  ? "rgba(255, 80, 80, 0.35)"
                                  : "rgba(94, 219, 191, 0.25)"
                                : "rgba(132, 139, 145, 0.15)",
                              borderLeft: `2px solid ${item.included ? item.color : "rgba(132,139,145,0.3)"}`,
                              transition: "width 0.6s ease",
                            }}
                          />
                        </div>
                        <div style={{ width: "90px", textAlign: "right", flexShrink: 0, fontFamily: '"JetBrains Mono", monospace', fontSize: "11px" }}>
                          {item.included && item.value > 0
                            ? <span style={{ color: "var(--surface)" }}>{formatLargeUSD(item.value)}</span>
                            : item.priceSource === "unreliable" && item.rangeUSD
                              ? <span style={{ color: MUTED, fontSize: "10px" }}>~${item.rangeUSD[0]}-${item.rangeUSD[1]}/token</span>
                              : <span style={{ color: MUTED, fontSize: "10px" }}>no public price</span>
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Vital stats - side column */}
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-5">
              {/* TPS card */}
              <div
                className="flex-1 p-6 rounded-xl flex flex-col justify-between"
                style={{
                  backgroundColor: CARD_BG,
                  border: "1px solid rgba(132, 139, 145, 0.2)",
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      color: MUTED,
                    }}
                  >
                    Current TPS
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <h3
                      style={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: "28px",
                        fontWeight: 600,
                      }}
                    >
                      {data.network.tps}
                    </h3>
                    {data.network.blockTime > 0 && (
                      <span style={{ color: MUTED, fontSize: "12px" }}>
                        Block: {data.network.blockTime.toFixed(1)}s
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Gas price card */}
              <div
                className="flex-1 p-6 rounded-xl flex flex-col justify-between"
                style={{
                  backgroundColor: CARD_BG,
                  border: "1px solid rgba(132, 139, 145, 0.2)",
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      color: MUTED,
                    }}
                  >
                    Base Gas Fee
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <h3
                      style={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: "28px",
                        fontWeight: 600,
                      }}
                    >
                      {data.network.gasPrice.toFixed(0)}
                    </h3>
                    <span style={{ color: MUTED, fontSize: "12px" }}>Gwei</span>
                  </div>
                </div>
              </div>
            </div>

            {/* RWA Tokenized Inventory table */}
            <div className="col-span-12 mt-4">
              <div className="flex items-center justify-between mb-4">
                <h3 style={{ fontSize: "20px", fontWeight: 500 }}>
                  Tokenised RWA Inventory
                </h3>
              </div>
              <div
                className="overflow-x-auto rounded-xl"
                style={{
                  backgroundColor: CARD_BG,
                  border: "1px solid rgba(132, 139, 145, 0.2)",
                }}
              >
                <table className="w-full min-w-[560px] text-left border-collapse">
                  <thead>
                    <tr
                      style={{
                        borderBottom: "1px solid rgba(132, 139, 145, 0.15)",
                        backgroundColor: "rgba(20, 37, 48, 0.4)",
                      }}
                    >
                      {["Asset Name", "Category", "Total Supply", "Value (USD)"].map(
                        (h) => (
                          <th
                            key={h}
                            className={`px-6 py-4 ${h === "Total Supply" || h === "Value (USD)" ? "text-right" : ""}`}
                            style={{
                              fontSize: "11px",
                              fontWeight: 600,
                              letterSpacing: "0.05em",
                              textTransform: "uppercase",
                              color: MUTED,
                            }}
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTokens.map((token) => (
                      <RWARow key={token.address} token={token} />
                    ))}
                    {sortedTokens.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-6 py-8 text-center"
                          style={{ color: MUTED }}
                        >
                          Loading token data...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Network Health Deep-Dive */}
            <div className="col-span-12 grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
              {/* Block stats (replaces fake node distribution) */}
              <div
                className="p-6 rounded-xl flex flex-col gap-4"
                style={{
                  backgroundColor: CARD_BG,
                  border: "1px solid rgba(132, 139, 145, 0.2)",
                }}
              >
                <div className="flex justify-between items-center">
                  <h4 style={{ fontSize: "20px", fontWeight: 500 }}>
                    Network Status
                  </h4>
                  <span
                    className="flex items-center gap-1"
                    style={{ color: TEAL, fontSize: "11px", fontWeight: 600 }}
                  >
                    <span
                      className="animate-pulse-green"
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: TEAL,
                        display: "inline-block",
                      }}
                    />
                    Network Healthy
                  </span>
                </div>
                <div
                  className="flex-1 rounded flex items-center justify-center py-8"
                  style={{ backgroundColor: DARK_BG }}
                >
                  <div className="text-center">
                    <div
                      style={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: "40px",
                        fontWeight: 600,
                        color: SURFACE,
                      }}
                    >
                      #{data.network.blockNumber.toLocaleString("en-US")}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        color: MUTED,
                        marginTop: "8px",
                      }}
                    >
                      Current Block Height
                    </div>
                    <div
                      style={{
                        color: MUTED,
                        fontSize: "12px",
                        marginTop: "12px",
                      }}
                    >
                      Consensus: BFT
                    </div>
                    {data.network.blockTime > 0 && (
                      <div style={{ color: MUTED, fontSize: "12px" }}>
                        Block time: {data.network.blockTime.toFixed(1)}s avg
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Recent Blocks */}
              <div
                className="p-6 rounded-xl flex flex-col gap-4"
                style={{
                  backgroundColor: CARD_BG,
                  border: "1px solid rgba(132, 139, 145, 0.2)",
                }}
              >
                <h4 style={{ fontSize: "20px", fontWeight: 500 }}>
                  Recent Blocks
                </h4>
                <div className="flex flex-col gap-2">
                  {data.recentBlocks.length > 0 ? (
                    data.recentBlocks.map((block) => (
                      <div
                        key={block.number}
                        className="flex justify-between items-center p-4 rounded"
                        style={{
                          backgroundColor: DARK_BG,
                          border: "1px solid rgba(132, 139, 145, 0.1)",
                        }}
                      >
                        <div className="flex items-center gap-4">
                          <span
                            style={{
                              fontFamily: '"JetBrains Mono", monospace',
                              fontSize: "13px",
                              color: ACCENT,
                            }}
                          >
                            #{block.number.toLocaleString("en-US")}
                          </span>
                          <span style={{ color: MUTED, fontSize: "12px" }}>
                            {timeAgoFromTs(block.timestamp)}
                          </span>
                          <span style={{ color: MUTED, fontSize: "12px" }}>
                            {block.txCount} txns
                          </span>
                        </div>
                        <span
                          style={{
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: "11px",
                            color: MUTED,
                          }}
                        >
                          {block.hashSuffix}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div style={{ color: MUTED, fontSize: "13px" }}>
                      Loading block data...
                    </div>
                  )}
                </div>
                <a
                  href="https://redbelly.routescan.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 text-center rounded text-sm transition-all hover:opacity-80"
                  style={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    color: "var(--accent)",
                    fontSize: "11px",
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    display: "block",
                  }}
                >
                  View Block Explorer
                </a>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer
        className="w-full px-4 sm:px-8 py-6 mt-8"
        style={{
          backgroundColor: DARK_BG,
          borderTop: "1px solid rgba(132, 139, 145, 0.1)",
        }}
      >
        <div className="flex justify-between items-center">
          <div>
            <span style={{ fontSize: "16px", fontWeight: 500 }}>
              Redbelly Network
            </span>
            <p style={{ color: MUTED, fontSize: "13px", marginTop: "4px" }}>
              &copy; {new Date().getFullYear()} Redbelly Network. Institutional Grade RWA Layer.
            </p>
          </div>
          <div className="flex gap-6">
            {["Terms of Service", "Privacy Policy", "Status"].map((l) => (
              <a
                key={l}
                href="#"
                style={{ color: MUTED, fontSize: "12px" }}
                className="hover:underline"
              >
                {l}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
