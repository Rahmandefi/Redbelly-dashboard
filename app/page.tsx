"use client";

import { useEffect, useState } from "react";
import { useMetrics } from "@/lib/useMetrics";
import NavBar from "@/components/NavBar";

const ACCENT = "var(--accent)";
const TEAL = "var(--teal)";
const MUTED = "var(--muted)";
const SURFACE = "var(--surface)";

// ---- formatters ----------------------------------------------------------------

function formatLargeUSD(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function formatShortNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("en-US");
}

function timeAgo(date: Date | null): string {
  if (!date) return "never";
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

// ---- sub-components ------------------------------------------------------------

function TerminalRow({
  label,
  value,
  valueColor,
  last,
}: {
  label: string;
  value: string;
  valueColor?: string;
  last?: boolean;
}) {
  return (
    <div
      className="flex justify-between"
      style={{
        paddingBottom: last ? 0 : "12px",
        borderBottom: last ? "none" : "1px solid rgba(132, 139, 145, 0.1)",
      }}
    >
      <span style={{ color: MUTED }}>{label}</span>
      <span style={{ color: valueColor ?? SURFACE }}>{value}</span>
    </div>
  );
}

function DonutChart({
  stakingUSD,
  rwaUSD,
}: {
  stakingUSD: number;
  rwaUSD: number;
}) {
  const total = stakingUSD + rwaUSD;
  const stakingPct = total > 0 ? (stakingUSD / total) * 100 : 50;
  const rwaPct = total > 0 ? (rwaUSD / total) * 100 : 50;

  return (
    <div className="flex flex-col items-center w-full">
      <div className="relative w-48 h-48 mb-6">
        <svg
          className="w-full h-full"
          style={{ transform: "rotate(-90deg)" }}
          viewBox="0 0 36 36"
        >
          <circle
            cx="18" cy="18" r="15.915"
            fill="transparent"
            stroke="#1d2d38"
            strokeWidth="3"
          />
          <circle
            cx="18" cy="18" r="15.915"
            fill="transparent"
            stroke={ACCENT}
            strokeWidth="3"
            strokeDasharray={`${stakingPct.toFixed(2)} ${(100 - stakingPct).toFixed(2)}`}
            style={{ transition: "stroke-dasharray 1s ease-in-out" }}
          />
          <circle
            cx="18" cy="18" r="15.915"
            fill="transparent"
            stroke={TEAL}
            strokeWidth="3"
            strokeDasharray={`${rwaPct.toFixed(2)} ${(100 - rwaPct).toFixed(2)}`}
            strokeDashoffset={`-${stakingPct.toFixed(2)}`}
            style={{ transition: "stroke-dasharray 1s ease-in-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            style={{
              color: MUTED,
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            Total
          </span>
          <span style={{ fontSize: "20px", fontWeight: 700 }}>
            {formatLargeUSD(total)}
          </span>
        </div>
      </div>

      <div className="w-full space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: ACCENT }}
            />
            <span style={{ fontSize: "14px" }}>Native Staking</span>
          </div>
          <span
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: "14px",
            }}
          >
            {formatLargeUSD(stakingUSD)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: TEAL }}
            />
            <span style={{ fontSize: "14px" }}>Tokenised RWA</span>
          </div>
          <span
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: "14px",
            }}
          >
            {formatLargeUSD(rwaUSD)}
          </span>
        </div>
      </div>
    </div>
  );
}

interface HeroCardProps {
  label: string;
  value: string;
  sub?: string;
  changeLabel?: string;
  changeDir?: "up" | "down" | "flat";
  accentValue?: boolean;
  accentBorder?: boolean;
}

function HeroCard({
  label,
  value,
  sub,
  changeLabel,
  changeDir,
  accentValue,
  accentBorder,
}: HeroCardProps) {
  const changeColor =
    changeDir === "up" ? TEAL : changeDir === "down" ? ACCENT : MUTED;

  return (
    <div
      className="glass-card p-6 rounded flex flex-col justify-between"
      style={{
        minHeight: "128px",
        ...(accentBorder ? { borderLeft: `4px solid ${ACCENT}` } : {}),
      }}
    >
      <span
        style={{
          color: MUTED,
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <div>
        <div className="flex items-baseline justify-between mt-2">
          <span
            style={{
              fontSize: "28px",
              fontWeight: 600,
              lineHeight: "36px",
              letterSpacing: "-0.01em",
              color: accentValue ? ACCENT : SURFACE,
            }}
          >
            {value}
          </span>
          {changeLabel && (
            <span
              style={{
                color: changeColor,
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.05em",
              }}
            >
              {changeDir === "up" ? "+" : changeDir === "down" ? "-" : ""}
              {changeLabel}
            </span>
          )}
        </div>
        {sub && (
          <p
            style={{
              color: MUTED,
              fontSize: "11px",
              marginTop: "4px",
            }}
          >
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

const PARTNER_LOGO_FILES: Record<string, string> = {
  "Taram":                    "/logos/taram.png",
  "RBA Project Acacia":       "/logos/rba.png",
  "Lucid Labs (Polymer)":     "/logos/lucid.png",
  "Celer Network (cBridge)":  "/logos/celer.png",
  "Novatti (AUDD)":           "/logos/novatti.png",
  "Metawealth":               "/logos/metawealth.png",
  "Goldsky":                  "/logos/goldsky.png",
  "Biome / WBIOME":           "/logos/biome.png",
  "Bulla Network":            "/logos/bulla.png",
  "OpenMarkets":              "/logos/openmarkets.png",
  "Raze Finance + Ferrox":    "/logos/raze.png",
  "Blubird":                  "/logos/blubird.png",
  "Hutly":                    "/logos/hutly.png",
  "Macropod":                 "/logos/macropod.avif",
  "AUDX Token":               "/logos/audx.png",
  "Forte Tech (AUDF)":        "/logos/forteaud.webp",
  "MintMingle / Nexus Fusion":"/logos/mintmingle.svg",
  "JellyC":                   "/logos/jellyc.gif",
  "Tokeniser":                "/logos/tokeniser.jpg",
  "Imperium Markets":         "/logos/imperium.svg",
  "Reddex":                   "/logos/reddex.png",
};

function PartnerMarquee({ partners }: { partners: Array<{ name: string }> }) {
  const withLogos = partners.filter((p) => PARTNER_LOGO_FILES[p.name]);
  const items = [...withLogos, ...withLogos]; // duplicate for seamless loop
  return (
    <div className="marquee-wrap">
      <div className="marquee-track">
        {items.map(({ name }, i) => {
          const src = PARTNER_LOGO_FILES[name];
          return (
            <div
              key={`${name}-${i}`}
              className="partner-logo-item"
              title={name}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={name}
                style={{
                  maxHeight: "40px",
                  maxWidth: "120px",
                  width: "auto",
                  height: "auto",
                  objectFit: "contain",
                  display: "block",
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- main dashboard ------------------------------------------------------------

export default function Dashboard() {
  const { data, lastUpdated, isStale } = useMetrics();
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const loading = !data;
  const change24h = data?.price.change24h ?? 0;
  const changeDir =
    change24h > 0.01 ? "up" : change24h < -0.01 ? "down" : "flat";

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "var(--bg)", color: "var(--surface)" }}
    >
      <NavBar lastUpdated={lastUpdated} isStale={isStale} />

      {/* Main content */}
      <main
        className="flex-grow w-full max-w-[1440px] mx-auto px-4 sm:px-8 py-6 sm:py-8"
        style={{ display: "flex", flexDirection: "column", gap: "32px" }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-40">
            <div className="text-center">
              <div
                className="animate-pulse-green mx-auto mb-4"
                style={{
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  backgroundColor: TEAL,
                }}
              />
              <p
                style={{
                  color: MUTED,
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: "13px",
                }}
              >
                Connecting to governors.mainnet.redbelly.network...
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Hero metric cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <HeroCard
                label="Total Value Locked (TVL)"
                value={formatLargeUSD(data.tvl.totalUSD)}
                accentValue
              />
              <HeroCard
                label="Active Addresses"
                value={formatShortNum(data.activity.activeAddresses)}
                sub={`last ${data.activity.transactionsWindow} blocks`}
              />
              <HeroCard
                label="Transactions (24h)"
                value={data.activity.tx24h > 0 ? formatShortNum(data.activity.tx24h) : formatShortNum(data.activity.transactionsRecent)}
                sub={data.activity.tx24h > 0 ? "est. from block sample" : `last ${data.activity.transactionsWindow} blocks`}
              />
              <HeroCard
                label="RBNT Price (USD)"
                value={data.price.unavailable ? "Unavailable" : `$${data.price.usd.toFixed(4)}`}
                changeLabel={
                  data.price.unavailable
                    ? undefined
                    : `${Math.abs(change24h).toFixed(2)}%`
                }
                changeDir={data.price.unavailable ? undefined : changeDir}
                accentValue={!data.price.unavailable}
                accentBorder
              />
            </div>

            {/* TVL Breakdown + Network Health */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* TVL Breakdown */}
              <div className="glass-card p-6 rounded flex flex-col">
                <h3
                  style={{
                    fontSize: "20px",
                    fontWeight: 500,
                    lineHeight: "28px",
                    marginBottom: "24px",
                  }}
                >
                  TVL Breakdown
                </h3>
                <div className="flex-grow flex flex-col items-center justify-center py-4">
                  <DonutChart
                    stakingUSD={data.tvl.reddexStaking.tvlUSD}
                    rwaUSD={data.tvl.rwaTVL}
                  />
                </div>
              </div>

              {/* Network Health */}
              <div className="glass-card p-6 rounded flex flex-col lg:col-span-2">
                <h3
                  style={{
                    fontSize: "20px",
                    fontWeight: 500,
                    lineHeight: "28px",
                    marginBottom: "24px",
                  }}
                >
                  Network Health
                </h3>
                <div
                  className="terminal-readout p-4 flex-grow"
                  style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: "14px",
                  }}
                >
                  <div className="space-y-3">
                    <TerminalRow
                      label="Current Block"
                      value={`#${data.network.blockNumber.toLocaleString("en-US")}`}
                      valueColor={ACCENT}
                    />
                    {data.network.blockTime > 0 && (
                      <TerminalRow
                        label="Block Time"
                        value={`${data.network.blockTime.toFixed(1)}s avg`}
                      />
                    )}
                    <TerminalRow
                      label="Base Gas Fee"
                      value={`${data.network.gasPrice.toFixed(0)} Gwei`}
                    />
                    <TerminalRow
                      label="TPS"
                      value={`${data.network.tps} tx/s`}
                    />
                    <TerminalRow
                      label="Gas Fees (24h)"
                      value={data.activity.gasFees24hRBNT > 0 ? `${data.activity.gasFees24hRBNT.toFixed(2)} RBNT` : `${data.activity.gasFeesRBNT.toFixed(4)} RBNT`}
                    />
                    <TerminalRow
                      label="Contracts Deployed (24h)"
                      value={data.activity.contractsDeployed24h > 0 ? formatShortNum(data.activity.contractsDeployed24h) : formatShortNum(data.activity.contractsDeployed)}
                    />
                    <TerminalRow
                      label="Consensus"
                      value="BFT"
                      valueColor={TEAL}
                      last
                    />
                  </div>

                  {data.network.latestBlock && (
                    <div
                      className="mt-6 pt-4"
                      style={{
                        borderTop: "1px solid rgba(255, 80, 80, 0.15)",
                      }}
                    >
                      <div className="flex gap-2 items-center mb-2">
                        <span
                          style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            backgroundColor: ACCENT,
                            display: "inline-block",
                          }}
                        />
                        <span
                          style={{ color: MUTED, fontSize: "12px" }}
                        >
                          Real-time stream
                        </span>
                      </div>
                      <div
                        style={{
                          color: MUTED,
                          fontSize: "12px",
                          lineHeight: "1.7",
                          opacity: 0.8,
                        }}
                      >
                        <p>
                          {">"} Block{" "}
                          {data.network.blockNumber.toLocaleString("en-US")}{" "}
                          committed
                        </p>
                        <p>
                          {">"} {data.network.latestBlock.txCount} transactions
                          verified
                        </p>
                        <p>
                          {">"} Gas used:{" "}
                          {(
                            (data.network.latestBlock.gasUsed /
                              data.network.latestBlock.gasLimit) *
                            100
                          ).toFixed(1)}
                          % of limit
                        </p>
                        <p>{">"} State root update: success</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Historical transaction stats */}
            {data.activity.tx24h > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Txs (24h)", value: formatShortNum(data.activity.tx24h) },
                  { label: "Txs (7d)", value: formatShortNum(data.activity.tx7d) },
                  { label: "Txs (30d)", value: formatShortNum(data.activity.tx30d) },
                  { label: "Txs (all-time)", value: formatShortNum(data.activity.txAllTime) },
                ].map(({ label, value }) => (
                  <div key={label} className="glass-card p-4 rounded flex flex-col gap-1">
                    <span style={{ fontSize: "11px", color: MUTED, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
                    <span style={{ fontSize: "22px", fontWeight: 600, color: TEAL }}>{value}</span>
                    <span style={{ fontSize: "10px", color: MUTED }}>est. from block sample</span>
                  </div>
                ))}
              </div>
            )}

            {/* Partner marquee */}
            <section
              className="py-8 rounded-xl"
              style={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
              }}
            >
              <p
                className="text-center mb-6"
                style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: MUTED }}
              >
                {data.partnerships.length} ecosystem partners and counting
              </p>
              <PartnerMarquee partners={data.partnerships} />
            </section>
          </>
        )}
      </main>

      {/* Footer */}
      <footer
        className="w-full px-4 sm:px-8 py-8 mt-12"
        style={{
          backgroundColor: "var(--dark)",
          borderTop: "1px solid rgba(132, 139, 145, 0.1)",
        }}
      >
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-col gap-1">
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: MUTED,
              }}
            >
              Redbelly Network
            </span>
            <p
              className="hidden sm:block"
              style={{
                color: MUTED,
                fontSize: "14px",
                lineHeight: "20px",
                maxWidth: "28rem",
              }}
            >
              Institutional Grade Distributed Ledger Technology with native
              legal finality and RWA compliance.
            </p>
          </div>

          <div className="flex items-center gap-6">
            <a
              href="https://github.com/Rahmandefi/Redbelly-dashboard"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: MUTED,
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
              className="hover:underline"
            >
              GitHub
            </a>
            <a
              href="https://redbelly.routescan.io"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: MUTED,
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
              className="hover:underline"
            >
              Explorer
            </a>
            <div
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: "12px",
                color: MUTED,
              }}
            >
              Node Status: Operational
            </div>
          </div>
        </div>

        <div
          className="max-w-[1440px] mx-auto mt-8 pt-6 text-center"
          style={{ borderTop: "1px solid rgba(132, 139, 145, 0.05)" }}
        >
          <p
            style={{
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.05em",
              color: MUTED,
              opacity: 0.5,
            }}
          >
            &copy; {new Date().getFullYear()} Redbelly Network. Registered in Australia.
          </p>
        </div>
      </footer>
    </div>
  );
}
