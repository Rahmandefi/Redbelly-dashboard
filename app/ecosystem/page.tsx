"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useMetrics } from "@/lib/useMetrics";
import type { Partnership, RWAToken } from "@/lib/useMetrics";
import NavBar from "@/components/NavBar";

const ACCENT = "var(--accent)";
const TEAL = "var(--teal)";
const MUTED = "var(--muted)";
const SURFACE = "var(--surface)";
const CARD_BG = "var(--card)";
const DARK_BG = "var(--dark)";

// ---- category icon map ---------------------------------------------------------

const CATEGORY_ICONS: Record<string, string> = {
  "Real Estate": "apartment",
  "AUD Stablecoin": "currency_exchange",
  "Commodity RWA": "factory",
  "Trade Finance": "payments",
  "ESG / Carbon": "energy_savings_leaf",
  "DeFi / NFT": "token",
  "NFT Marketplace": "storefront",
  "Cross-chain Bridge": "sync_alt",
  "Cross-chain": "hub",
  "Developer Tooling": "code",
  "Equity Tokenisation": "account_balance",
  "Supply Chain Finance": "inventory",
  "Fund Tokenisation": "candlestick_chart",
  "Bond Issuance": "receipt_long",
  "Investment Banking": "trending_up",
  "Secondary Trading": "swap_horiz",
  "CBDC Pilot": "account_balance_wallet",
  Strategic: "star",
};

function iconFor(category: string): string {
  return CATEGORY_ICONS[category] ?? "handshake";
}

// Full researched descriptions shown in the modal
const PARTNER_DESCRIPTIONS: Record<string, string> = {
  "Hutly": "Australian proptech platform founded in 2017 to transact real estate as a digital asset. Hutly chose Redbelly to tokenise over $1.8B USD in rent rolls, leveraging the network's KYC identity layer, fixed gas fees, and instant finality. As of January 2025, $210M AUD in assets are already live on-chain.",
  "Metawealth": "European RWA investment platform that went live as the first retail-friendly real estate issuer on Redbelly. Their debut asset is Domus Nova, a 140 apartment luxury residential development in Rome's EUR district. MetaWealth holds $50M+ in tokenised property across Europe and has distributed over $1M in on-chain rental yield to investors.",
  "Raze Finance + Ferrox": "Raze Finance is a RWA tokenisation engine that partnered with Redbelly to accelerate commodity tokenisation. Their first deployment is with Ferrox Holdings, a South African titanium and iron miner whose flagship Tivani Project is now tokenised as $FeTi70 on Redbelly. Investors can enter from as little as $100 USD via tokenised invoice financing backed by commercial offtake agreements.",
  "Macropod": "Macropod issued AUDM, Australia's first stablecoin developed under the RBA's Project Acacia licensing framework. AUDM was used to settle Australia's first tokenised corporate bond (Imperium Markets' CLIFFO Series 1) on Redbelly in 2025, with atomic settlement completing in 4 minutes versus the traditional T+4 cycle of up to 4 days.",
  "Novatti (AUDD)": "Novatti is an ASX-listed Australian fintech (ASX: NOV) and issuer of AUDD, the Australian Digital Dollar. AUDD is a 1:1 AUD-collateralised stablecoin deployed across 8+ chains including Redbelly, Ethereum, Solana, Stellar, and Base. In September 2025 it became the first AUD-backed stablecoin listed on Coinbase's global retail platform, and has surpassed $1.4B in Stellar payments volume.",
  "AUDX Token": "AUDX is an AUSTRAC-registered AUD-backed digital token linked to an Australian Authorised Deposit-taking Institution (ADI), providing institutional-grade backing. Deployed on Redbelly as part of the Project Acacia stablecoin ecosystem, AUDX targets ASX-linked settlement and regulated financial market use cases.",
  "Forte Tech (AUDF)": "Forte Tech issues AUDF, a trade finance-focused AUD stablecoin on Redbelly. AUDF is purpose built for cross-border trade corridors in the Asia-Pacific region, enabling businesses to settle invoices and receivables in a regulated AUD-denominated digital currency without requiring a domestic AUD bank account.",
  "Taram": "Taram is a cross-border B2B trade finance and transportation management platform that joined a three-way partnership with Bulla Network and Redbelly to deploy the first live on-chain invoice finance pool in October 2025. The BFT-TARAM (Blubird Funding Token - TARAM) represents a pool of short-duration trade receivables, with individual invoices visible and auditable on Redbelly rather than a blind pool.",
  "Blubird": "Blubird is an institutional tokenisation platform covering legal structuring, KYC/AML, registry management, and marketplace distribution across 23+ asset classes including real estate, carbon credits, and commodities. On Redbelly, Blubird tokenised $32B in Emission Reduction Assets (ERAs) representing over 394 million tons of CO2 prevented, equivalent to the annual emissions of 82 million US homes. The BFT-TARAM funding pool is also structured via Blubird's platform, providing transparent on-chain trade receivables for Taram. Blubird plans to tokenise a further $18B in assets, bringing total avoided CO2 to approximately 600 million tons.",
  "MintMingle / Nexus Fusion": "MintMingle is a creator friendly NFT marketplace for digital and RWA-backed NFTs, developed by Nexus Fusion Capital natively on Redbelly. In September 2025, Redbelly's first ever NFT collection launched through MintMingle, with reward tiers for RBNT, DONO, and FeTi70 token holders. Features include no-code minting tools, auction support, and fixed-price listings.",
  "Reddex": "Reddex is Redbelly's native decentralised exchange and RBNT lock-staking protocol. The staking vault lets RBNT holders lock tokens for a fixed term to earn on-chain yield, governed by immutable smart contract parameters. The Reddex DEX provides on-chain liquidity pools for trading RWA tokens and native assets, with pair data and volume indexed via an on-chain subgraph.",
  "Biome / WBIOME": "Biome is a DeFi and NFT staking ecosystem that partnered with Redbelly and Nexus Fusion Capital to launch the first NFT collection on the network. WBIOME is a wrapped BEP-20 token bridged from BNB Chain to Redbelly, enabling cross-chain liquidity for the Biome ecosystem. Token holders gain access to pre-sales, project investments, and early marketplace features.",
  "Celer Network (cBridge)": "In August 2025, Celer launched cBridge support for Redbelly, enabling users to move USDT, USDC, WBTC, ETH, LQDX, and RBNT between Ethereum, BNB Chain, and Redbelly. Celer's Inter-chain Messaging Framework (IMF) is also roadmapped for Redbelly, which will let developers build dApps with cross-chain logic including NFT bridges and cross-chain reward claiming.",
  "Lucid Labs (Polymer)": "Lucid Labs is a cross-chain stablecoin infrastructure provider that integrated Polymer Labs' interoperability layer to connect Redbelly with other EVM-compatible chains. The integration offers near-instant finality at a fixed $0.05 fee per transfer via Polymer's Prove API, making it the cheapest bridging option on the network. Announced as part of Redbelly's July 2025 cross-chain expansion.",
  "Goldsky": "Goldsky is a real-time blockchain data and infrastructure platform that integrated with Redbelly in late 2024. Developers can deploy subgraphs to extract, index, and query Redbelly's on-chain data tracking dApp activity, RWA events, and compliant finance transactions. Goldsky supports 153+ chains and provides the back end data tooling needed to build data-rich applications on top of Redbelly's RWA ecosystem.",
  "Tokeniser": "A Redbelly Network project originating from University of Sydney research and CSIRO, Tokeniser is a digital asset management platform with A$1.2B in issued equity value across 160+ companies and funds, and A$2B+ in transactions performed. Formerly known as Liquidise, Tokeniser launched an asset tokenisation solution on Redbelly Mainnet covering private equity, secondary market trading, borrowing and lending, and corporate action management. Investors get real-time portfolio statements, tax reporting, and instant settlement when converting holdings back to liquidity.",
  "Bulla Network": "Bulla Network is an on-chain invoicing and liquidity pool protocol that partnered with Taram and Redbelly to deploy the first live invoice finance pool in October 2025. Unlike traditional receivables pools, Bulla exposes individual invoice level transparency on Redbelly, giving investors real-time visibility, automated reconciliation, and lower cost of capital. Finance teams get real-time payment status; treasurers gain cash-flow certainty.",
  "JellyC": "JellyC is an Australian digital asset manager that, in partnership with Tokeniser (formerly Liquidise) and Redbelly, is pioneering Australia's first fully liquid tokenised managed investment scheme (MIS). Investors get real-time NAV unit pricing, full on-chain auditability, and built-in KYC compliance via Redbelly's identity layer. JellyC also participated as the secondary buyer of Imperium Markets' CLIFFO Series 1 bond, with settlement completing in 4 minutes.",
  "Imperium Markets": "Imperium Markets issued Australia's first tokenised corporate bond CLIFFO Series 1 on its ASIC-licensed marketplace, settled on Redbelly using AUDM stablecoin. The primary issuance and a secondary trade to JellyC both completed in 4 minutes, compared to the conventional T+4 settlement of up to 4 days. Coupon payments and maturity are automated via smart contract.",
  "OpenMarkets": "OpenMarkets is an Australian financial services and securities execution firm that serves as a post-issuance secondary market distribution partner for tokenised securities on Redbelly. Through OpenMarkets, tokenised fund units can trade on secondary venues with NAV-linked pricing, real-time settlement, and immutable audit trails that reduce friction versus traditional OTC markets.",
  "RBA Project Acacia": "Project Acacia is the Reserve Bank of Australia's wholesale CBDC and tokenised asset settlement initiative, run jointly with the DFCRC and ASIC. Redbelly was selected as the only public blockchain among platforms including Hedera, R3 Corda, and Canvas Connect to host live real-money pilot use cases. 24 use cases from fintechs to major banks are being tested across tokenised money markets, bond settlement, and fund distribution.",
};

// Partner logo files for modal header
const PARTNER_LOGOS: Record<string, string> = {
  "Taram": "/logos/taram.png",
  "RBA Project Acacia": "/logos/rba.png",
  "Lucid Labs (Polymer)": "/logos/lucid.png",
  "Celer Network (cBridge)": "/logos/celer.png",
  "Novatti (AUDD)": "/logos/novatti.png",
  "Metawealth": "/logos/metawealth.png",
  "Goldsky": "/logos/goldsky.png",
  "Biome / WBIOME": "/logos/biome.png",
  "Bulla Network": "/logos/bulla.png",
  "OpenMarkets": "/logos/openmarkets.png",
  "Raze Finance + Ferrox": "/logos/raze.png",
  "Blubird": "/logos/blubird.png",
  "Hutly": "/logos/hutly.png",
  "Macropod": "/logos/macropod.avif",
  "AUDX Token": "/logos/audx.png",
  "Forte Tech (AUDF)": "/logos/forteaud.webp",
  "MintMingle / Nexus Fusion": "/logos/mintmingle.svg",
  "JellyC": "/logos/jellyc.gif",
  "Tokeniser": "/logos/tokeniser.jpg",
  "Imperium Markets": "/logos/imperium.svg",
  "Reddex": "/logos/reddex.png",
};

// Partner websites for modal external link
const PARTNER_WEBSITES: Record<string, string> = {
  "Hutly": "https://hutly.com",
  "Metawealth": "https://metawealth.co",
  "Raze Finance + Ferrox": "https://raze.finance",
  "Macropod": "https://macropod.io",
  "Novatti (AUDD)": "https://audd.digital",
  "AUDX Token": "https://www.audxtoken.com",
  "Forte Tech (AUDF)": "https://www.forteaud.com",
  "Taram": "https://taram.io",
  "Blubird": "https://www.getblubird.com",
  "MintMingle / Nexus Fusion": "https://mintmingle.ai",
  "Biome / WBIOME": "https://redbelly.biome-token.io",
  "Celer Network (cBridge)": "https://celer.network",
  "Lucid Labs (Polymer)": "https://lucidlabs.fi",
  "Goldsky": "https://goldsky.com",
  "Tokeniser": "https://tokeniser.com/",
  "Bulla Network": "https://bulla.network",
  "JellyC": "https://www.jellyc.io",
  "Imperium Markets": "https://imperium.markets",
  "OpenMarkets": "https://openmarkets.com.au",
  "RBA Project Acacia": "https://rba.gov.au",
  "Reddex": "https://www.reddex.io",
};

const PARTNER_BRIDGE_LINKS: Record<string, string> = {
  "Celer Network (cBridge)": "https://cbridge.celer.network/1/10/USDC",
  "Lucid Labs (Polymer)": "https://bridge.lucidlabs.fi",
};

// Maps partnership name to its on-chain token symbol (where one exists)
const PARTNER_TOKEN_SYMBOL: Record<string, string> = {
  "Hutly": "sHUT",
  "Macropod": "AUDM",
  "Novatti (AUDD)": "AUDD",
  "AUDX Token": "AUDX",
  "Forte Tech (AUDF)": "AUDF",
  "Taram": "BFT-TARAM",
  "Biome / WBIOME": "WBIOME",
  "Raze Finance + Ferrox": "FeTi70",
};

// ---- token price chart ---------------------------------------------------------

function TokenPriceChart({ coingeckoId }: { coingeckoId: string }) {
  const [history, setHistory] = useState<{ date: number; priceUSD: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/token-chart?id=${encodeURIComponent(coingeckoId)}`)
      .then((r) => r.json())
      .then((json) => {
        setHistory(json.history ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [coingeckoId]);

  if (loading) {
    return (
      <div
        style={{
          marginTop: "12px",
          borderRadius: "10px",
          height: "88px",
          backgroundColor: "rgba(13,23,29,0.4)",
          animation: "pulse 1.5s ease-in-out infinite",
        }}
      />
    );
  }

  if (history.length < 3) return null;

  const prices = history.map((d) => d.priceUSD);
  const first = prices[0];
  const last = prices[prices.length - 1];
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || first * 0.001;
  const isUp = last >= first;
  const color = isUp ? "#22c55e" : "#ef4444";
  const changePct = ((last - first) / first) * 100;

  const W = 280;
  const H = 52;
  const PAD = 3;

  const pts = prices.map((p, i) => [
    PAD + (i / (prices.length - 1)) * (W - PAD * 2),
    PAD + (1 - (p - min) / range) * (H - PAD * 2),
  ]);

  const lineD = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const fillD = `${lineD} L${(W - PAD).toFixed(1)},${H} L${PAD},${H} Z`;

  return (
    <div
      style={{
        marginTop: "12px",
        borderRadius: "10px",
        backgroundColor: "rgba(13,23,29,0.4)",
        padding: "12px 14px 10px",
        border: `1px solid ${isUp ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)"}`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <span style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: MUTED }}>
          14-Day Price (CoinGecko)
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "12px", color: "var(--surface)" }}>
            ${last.toFixed(4)}
          </span>
          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "11px", fontWeight: 700, color }}>
            {isUp ? "▲" : "▼"} {Math.abs(changePct).toFixed(2)}%
          </span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "52px", display: "block" }}>
        <defs>
          <linearGradient id={`cg-${coingeckoId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={fillD} fill={`url(#cg-${coingeckoId})`} />
        <path d={lineD} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

// ---- partner card --------------------------------------------------------------

function PartnerCard({ p, onClick }: { p: Partnership; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className="p-6 rounded-xl flex flex-col justify-between group"
      style={{
        backgroundColor: CARD_BG,
        border: "1px solid rgba(132, 139, 145, 0.2)",
        minHeight: "200px",
        transition: "border-color 0.3s, transform 0.2s",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255, 80, 80, 0.4)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(132, 139, 145, 0.2)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
      }}
    >
      <div>
        <div className="flex justify-between items-start mb-4">
          {PARTNER_LOGOS[p.name] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={PARTNER_LOGOS[p.name]}
              alt={p.name}
              style={{
                width: "48px",
                height: "48px",
                objectFit: "contain",
                borderRadius: "10px",
                background: "rgba(255,255,255,0.06)",
                padding: "5px",
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{
                backgroundColor: "rgba(255, 80, 80, 0.08)",
                border: "1px solid rgba(132, 139, 145, 0.1)",
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "28px", color: ACCENT }}
              >
                {iconFor(p.category)}
              </span>
            </div>
          )}
          <span
            className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
            style={{
              backgroundColor: "rgba(255, 80, 80, 0.08)",
              color: ACCENT,
              border: "1px solid rgba(255, 80, 80, 0.2)",
            }}
          >
            {p.category}
          </span>
        </div>
        <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>
          {p.name}
        </h3>
        <p style={{ color: MUTED, fontSize: "13px", lineHeight: "1.6" }}>
          {p.detail}
        </p>
      </div>
      <div
        className="mt-4 flex items-center gap-1"
        style={{ color: ACCENT, fontSize: "12px", fontWeight: 600 }}
      >
        <span>View details</span>
        <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>arrow_forward</span>
      </div>
    </div>
  );
}

// ---- partner detail modal ------------------------------------------------------

function fmt(n: number, decimals = 2): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(decimals)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(decimals)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(decimals)}K`;
  return n.toLocaleString("en-US", { maximumFractionDigits: decimals });
}

function PartnerModal({
  partner,
  token,
  onClose,
}: {
  partner: Partnership;
  token: RWAToken | undefined;
  onClose: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const addrShort = token ? `${token.address.slice(0, 8)}...${token.address.slice(-6)}` : null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.75)",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: CARD_BG,
          border: "1px solid rgba(132, 139, 145, 0.25)",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "600px",
          maxHeight: "80vh",
          overflowY: "auto",
          padding: "32px",
          position: "relative",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            background: "rgba(132,139,145,0.15)",
            border: "none",
            borderRadius: "50%",
            width: "32px",
            height: "32px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: MUTED,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>close</span>
        </button>

        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          {PARTNER_LOGOS[partner.name] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={PARTNER_LOGOS[partner.name]}
              alt={partner.name}
              className="partner-modal-logo"
              style={{
                width: "56px",
                height: "56px",
                objectFit: "contain",
                borderRadius: "12px",
                padding: "6px",
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "12px",
                backgroundColor: "rgba(255, 80, 80, 0.08)",
                border: "1px solid rgba(132, 139, 145, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "30px", color: ACCENT }}>
                {iconFor(partner.category)}
              </span>
            </div>
          )}
          <div className="flex-1">
            <h2 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "6px" }}>
              {partner.name}
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                style={{
                  display: "inline-block",
                  backgroundColor: "rgba(255, 80, 80, 0.08)",
                  color: ACCENT,
                  border: "1px solid rgba(255, 80, 80, 0.2)",
                  borderRadius: "6px",
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  padding: "2px 10px",
                }}
              >
                {partner.category}
              </span>
              {PARTNER_WEBSITES[partner.name] && (
                <a
                  href={PARTNER_WEBSITES[partner.name]}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: "11px", color: MUTED, display: "flex", alignItems: "center", gap: "3px", textDecoration: "none" }}
                  className="hover:underline"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "12px" }}>open_in_new</span>
                  {PARTNER_WEBSITES[partner.name].replace("https://", "")}
                </a>
              )}
              {PARTNER_BRIDGE_LINKS[partner.name] && (
                <a
                  href={PARTNER_BRIDGE_LINKS[partner.name]}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: "11px", color: MUTED, display: "flex", alignItems: "center", gap: "3px", textDecoration: "none" }}
                  className="hover:underline"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "12px" }}>open_in_new</span>
                  Bridge
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        <p style={{ color: MUTED, fontSize: "14px", lineHeight: "1.7", marginBottom: "24px" }}>
          {PARTNER_DESCRIPTIONS[partner.name] ?? partner.detail}
        </p>

        {/* On-chain token section */}
        {token && (
          <>
            <div
              style={{
                height: "1px",
                backgroundColor: "rgba(132, 139, 145, 0.15)",
                marginBottom: "24px",
              }}
            />
            <h3
              style={{
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: TEAL,
                marginBottom: "16px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>token</span>
              On-Chain Token
            </h3>

            <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-4 mb-6">
              <div className="stat-box">
                <div style={{ color: MUTED, fontSize: "10px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "4px" }}>Symbol</div>
                <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "18px", fontWeight: 600 }}>{token.symbol}</div>
              </div>

              <div className="stat-box">
                <div style={{ color: MUTED, fontSize: "10px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "4px" }}>Total Supply</div>
                <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "18px", fontWeight: 600 }}>
                  {token.totalSupply > 0 ? fmt(token.totalSupply, 0) : "--"}
                </div>
              </div>

              {token.includedInTVL && token.priceUSD > 0 && (
                <>
                  <div className="stat-box">
                    <div style={{ color: MUTED, fontSize: "10px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "4px" }}>Price (USD)</div>
                    <div className="stat-teal-value" style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "18px", fontWeight: 600, color: TEAL }}>
                      ${token.priceUSD.toFixed(4)}
                    </div>
                  </div>
                  <div className="stat-box">
                    <div style={{ color: MUTED, fontSize: "10px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "4px" }}>TVL (USD)</div>
                    <div className="stat-teal-value" style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "18px", fontWeight: 600, color: TEAL }}>
                      ${fmt(token.tvlUSD, 0)}
                    </div>
                  </div>
                </>
              )}

              {token.unreliableRangeUSD && (
                <div
                  className="col-span-2"
                  style={{
                    backgroundColor: "rgba(255, 80, 80, 0.06)",
                    borderRadius: "10px",
                    padding: "14px 16px",
                    border: "1px solid rgba(255, 80, 80, 0.15)",
                  }}
                >
                  <div style={{ color: MUTED, fontSize: "10px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "4px" }}>Price Range (USD)</div>
                  <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "16px", fontWeight: 600 }}>
                    ${token.unreliableRangeUSD[0].toFixed(2)} - ${token.unreliableRangeUSD[1].toFixed(2)}
                  </div>
                </div>
              )}
            </div>

            {/* Price note */}
            {token.priceNote && (
              <div
                style={{
                  backgroundColor: "rgba(13, 23, 29, 0.5)",
                  borderRadius: "8px",
                  padding: "12px 14px",
                  marginBottom: "16px",
                  fontSize: "12px",
                  color: MUTED,
                  lineHeight: "1.6",
                  borderLeft: "2px solid rgba(132,139,145,0.4)",
                }}
              >
                {token.priceNote}
              </div>
            )}

            {/* Contract address + explorer link */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "12px",
                backgroundColor: "rgba(13, 23, 29, 0.6)",
                borderRadius: "10px",
                padding: "12px 16px",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ color: MUTED, fontSize: "10px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "4px" }}>Contract</div>
                <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "13px" }}>{addrShort}</div>
              </div>
              <a
                href={`https://redbelly.routescan.io/token/${token.address}?type=erc20`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  backgroundColor: ACCENT,
                  color: "#fff",
                  borderRadius: "8px",
                  padding: "8px 14px",
                  fontSize: "12px",
                  fontWeight: 700,
                  textDecoration: "none",
                  flexShrink: 0,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>open_in_new</span>
                Explorer
              </a>
            </div>

            {token.coingeckoId && (
              <TokenPriceChart coingeckoId={token.coingeckoId} />
            )}
          </>
        )}

        {/* No token section */}
        {!token && (
          <div
            style={{
              backgroundColor: "rgba(13, 23, 29, 0.4)",
              borderRadius: "10px",
              padding: "16px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              color: MUTED,
              fontSize: "13px",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>info</span>
            This partner does not have a tracked on-chain token. Activity is recorded at the ecosystem level.
          </div>
        )}
      </div>
    </div>
  );
}

// ---- main page -----------------------------------------------------------------

// ---- network status card -------------------------------------------------------

function NodeGraph() {
  const cx = 110, cy = 110, r = 72;
  const count = 9;
  const nodes = Array.from({ length: count }, (_, i) => {
    const a = (i / count) * 2 * Math.PI - Math.PI / 2;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  });
  const spokes = nodes.map((n) => ({ x1: cx, y1: cy, x2: n.x, y2: n.y }));
  const cross = [
    [0, 2], [0, 4], [1, 3], [1, 5], [2, 6], [3, 7], [4, 8], [5, 7],
  ] as [number, number][];
  return (
    <svg viewBox="0 0 220 220" style={{ width: "100%", maxWidth: "220px" }}>
      {spokes.map((s, i) => (
        <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
          stroke="var(--teal)" strokeWidth="0.8" strokeOpacity="0.3" />
      ))}
      {cross.map(([a, b], i) => (
        <line key={i} x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y}
          stroke="var(--teal)" strokeWidth="0.6" strokeOpacity="0.18" />
      ))}
      {nodes.map((n, i) => (
        <circle key={i} cx={n.x} cy={n.y} r="5" fill="var(--teal)" opacity="0.7" />
      ))}
      <circle cx={cx} cy={cy} r="9" fill="var(--accent)" opacity="0.9" />
      <circle cx={cx} cy={cy} r="4" fill="#fff" opacity="0.95" />
    </svg>
  );
}

function NetworkStatusCard({ data, onClose }: {
  data: import("@/lib/useMetrics").MetricsData | null;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const onMouse = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onMouse);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onMouse);
    };
  }, [onClose]);

  const row = (label: string, value: string) => (
    <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(132,139,145,0.08)" }}>
      <span style={{ color: MUTED, fontSize: "11px" }}>{label}</span>
      <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "11px" }}>{value}</span>
    </div>
  );

  const n = data?.network;
  const fmt = (x: number) => x.toLocaleString("en-US");

  return (
    <div
      ref={ref}
      className="status-popover"
      style={{
        backgroundColor: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "14px",
        padding: "20px",
        zIndex: 60,
        boxShadow: "0 -8px 32px rgba(0,0,0,0.25)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
        <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#22c55e", display: "inline-block", flexShrink: 0 }} className="animate-pulse-green" />
        <span style={{ fontSize: "13px", fontWeight: 700 }}>Network Status</span>
        <span style={{ marginLeft: "auto", fontSize: "10px", fontWeight: 700, color: "#22c55e", textTransform: "uppercase", letterSpacing: "0.05em" }}>Operational</span>
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginBottom: "14px", opacity: 0.8 }}>
        <NodeGraph />
      </div>

      <div>
        {row("Chain", "Mainnet (ID 151)")}
        {row("Block Height", n ? `#${fmt(n.blockNumber)}` : "--")}
        {row("TPS", n ? `${n.tps.toFixed(1)} tx/s` : "--")}
        {row("Block Time", n ? `${n.blockTime.toFixed(1)}s avg` : "--")}
        {row("Total Supply", n ? `${fmt(Math.round(n.totalSupply))} RBNT` : "--")}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
          <span style={{ color: MUTED, fontSize: "11px" }}>Explorer</span>
          <a href="https://redbelly.routescan.io" target="_blank" rel="noopener noreferrer"
            style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "11px", color: "var(--teal)", textDecoration: "none" }}
            className="hover:underline">
            routescan.io
          </a>
        </div>
      </div>
    </div>
  );
}

// ---- main page -----------------------------------------------------------------

export default function EcosystemPage() {
  const { data, lastUpdated, isStale } = useMetrics();
  const [selectedCategory, setSelectedCategory] = useState<string>("All Partners");
  const [sortBy, setSortBy] = useState<"Latest" | "Alphabetical">("Latest");
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [activePartner, setActivePartner] = useState<Partnership | null>(null);
  const [showStatus, setShowStatus] = useState(false);

  const activeToken = useMemo<RWAToken | undefined>(() => {
    if (!activePartner || !data) return undefined;
    const symbol = PARTNER_TOKEN_SYMBOL[activePartner.name];
    return symbol ? data.tvl.rwaTokens.find((t) => t.symbol === symbol) : undefined;
  }, [activePartner, data]);

  const loading = !data;

  const categories = useMemo(() => {
    if (!data) return ["All Partners"];
    const unique = Array.from(new Set(data.partnerships.map((p) => p.category))).sort();
    return ["All Partners", ...unique];
  }, [data]);

  const filteredPartners = useMemo(() => {
    if (!data) return [];
    let result = [...data.partnerships];
    if (selectedCategory !== "All Partners") {
      result = result.filter((p) => p.category === selectedCategory);
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.detail.toLowerCase().includes(q)
      );
    }
    if (sortBy === "Alphabetical") {
      result = result.sort((a, b) => a.name.localeCompare(b.name));
    }
    return result;
  }, [data, selectedCategory, sortBy, searchTerm]);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "var(--bg)", color: "var(--surface)" }}
    >
      <NavBar lastUpdated={lastUpdated} isStale={isStale} />

      {/* Hero */}
      <section
        className="relative flex flex-col justify-center px-4 sm:px-8 overflow-hidden"
        style={{
          minHeight: "340px",
          borderBottom: "1px solid rgba(132, 139, 145, 0.1)",
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none opacity-5"
          style={{
            backgroundImage: "radial-gradient(#ff5050 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
        <div className="relative z-10 max-w-3xl">
          <span
            className="inline-block py-1 px-4 rounded-lg mb-4"
            style={{
              backgroundColor: "rgba(255, 80, 80, 0.08)",
              color: ACCENT,
              border: "1px solid rgba(255, 80, 80, 0.2)",
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            Redbelly Ecosystem
          </span>
          <h1
            className="text-[28px] sm:text-[40px]"
            style={{
              fontWeight: 600,
              lineHeight: "1.2",
              letterSpacing: "-0.02em",
              marginBottom: "16px",
            }}
          >
            Building the RWA Layer
          </h1>
          <p style={{ color: MUTED, fontSize: "16px", lineHeight: "24px", maxWidth: "680px" }}>
            Redbelly Network provides the compliant, regulated infrastructure for
            global Real World Asset tokenisation. Explore the verified partners
            expanding the frontier of institutional blockchain.
          </p>
        </div>
      </section>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-8 px-4 sm:px-8 py-6 sm:py-8">
        {/* Sidebar */}
        <aside className="w-full lg:w-72 flex flex-col gap-6 flex-shrink-0">
          {/* Search */}
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-lg"
            style={{
              backgroundColor: CARD_BG,
              border: "1px solid rgba(132, 139, 145, 0.2)",
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "18px", color: MUTED }}
            >
              search
            </span>
            <input
              type="text"
              placeholder="Search partners..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none w-full"
              style={{ color: SURFACE, fontSize: "14px" }}
            />
          </div>

          {/* Category filters */}
          <div className="flex flex-col gap-1">
            {/* Mobile toggle (hidden on lg) */}
            <button
              className="lg:hidden flex items-center justify-between px-4 py-2 rounded-lg w-full"
              onClick={() => setShowFilters((v) => !v)}
              style={{
                backgroundColor: "rgba(132,139,145,0.08)",
                border: "1px solid var(--border)",
                color: MUTED,
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              <span>Asset Categories{selectedCategory !== "All Partners" ? `: ${selectedCategory}` : ""}</span>
              <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                {showFilters ? "expand_less" : "expand_more"}
              </span>
            </button>

            {/* Label (visible on lg only) */}
            <h3
              className="hidden lg:block"
              style={{
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: MUTED,
                padding: "0 8px",
                marginBottom: "4px",
              }}
            >
              Asset Categories
            </h3>

            {/* List: always visible on lg, toggled on mobile */}
            <div className={`${showFilters ? "flex" : "hidden"} lg:flex flex-col gap-0.5`}>
              {categories.map((cat) => {
                const active = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => { setSelectedCategory(cat); setShowFilters(false); }}
                    className="flex items-center justify-between px-4 py-2 rounded-lg text-left text-sm transition-all"
                    style={{
                      backgroundColor: active
                        ? "rgba(255, 80, 80, 0.1)"
                        : "transparent",
                      color: active ? ACCENT : MUTED,
                      borderRight: active ? `2px solid ${ACCENT}` : "2px solid transparent",
                      fontWeight: active ? 600 : 400,
                    }}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Network Pulse */}
          <div
            className="p-6 rounded-xl flex flex-col gap-5"
            style={{
              backgroundColor: CARD_BG,
              border: "1px solid rgba(132, 139, 145, 0.15)",
            }}
          >
            <h3
              style={{
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: MUTED,
              }}
            >
              Network Pulse
            </h3>

            <div>
              <span style={{ color: MUTED, fontSize: "11px" }}>Total Partners</span>
              <div
                style={{
                  fontSize: "20px",
                  fontWeight: 500,
                  marginTop: "2px",
                }}
              >
                {loading ? "--" : data.partnerships.length}
              </div>
              <div
                className="w-full rounded-full mt-1 overflow-hidden"
                style={{ height: "4px", backgroundColor: "rgba(132, 139, 145, 0.2)" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{ width: "100%", backgroundColor: ACCENT }}
                />
              </div>
            </div>

            <div>
              <span style={{ color: MUTED, fontSize: "11px" }}>Current Block</span>
              <div
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: "20px",
                  fontWeight: 500,
                  marginTop: "2px",
                }}
              >
                {loading ? "--" : `#${data.network.blockNumber.toLocaleString("en-US")}`}
              </div>
            </div>

            <div>
              <span style={{ color: MUTED, fontSize: "11px" }}>RBNT Price</span>
              <div
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: "20px",
                  fontWeight: 500,
                  marginTop: "2px",
                  color: loading || data.price.unavailable ? MUTED : SURFACE,
                  fontStyle: loading || data.price.unavailable ? "italic" : "normal",
                }}
              >
                {loading
                  ? "--"
                  : data.price.unavailable
                  ? "Unavailable"
                  : `$${data.price.usd.toFixed(4)}`}
              </div>
            </div>

            {!loading && data.tvl.reddexDEX && data.tvl.reddexDEX.tvlUSD > 0 && (
              <div>
                <span style={{ color: MUTED, fontSize: "11px" }}>Reddex DEX Pool TVL</span>
                <div
                  style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: "18px",
                    fontWeight: 500,
                    marginTop: "2px",
                    color: TEAL,
                  }}
                >
                  ${data.tvl.reddexDEX.tvlUSD.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </div>
                <div style={{ color: MUTED, fontSize: "10px", marginTop: "2px" }}>
                  {data.tvl.reddexDEX.pairCount} pairs &middot; ${(data.tvl.reddexDEX.volumeUSD / 1_000_000).toFixed(1)}M vol
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Partner grid */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <h2 style={{ fontSize: "20px", fontWeight: 500 }}>
              {selectedCategory === "All Partners"
                ? "All Partners"
                : selectedCategory}{" "}
              {!loading && (
                <span style={{ color: MUTED, fontSize: "14px", fontWeight: 400 }}>
                  ({filteredPartners.length})
                </span>
              )}
            </h2>
            <div className="flex items-center gap-2">
              <span style={{ color: MUTED, fontSize: "12px" }}>Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value as "Latest" | "Alphabetical")
                }
                className="rounded-lg px-3 py-1 text-sm outline-none"
                style={{
                  backgroundColor: CARD_BG,
                  border: "1px solid rgba(132, 139, 145, 0.2)",
                  color: SURFACE,
                  fontSize: "13px",
                }}
              >
                <option>Latest</option>
                <option>Alphabetical</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
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
          ) : filteredPartners.length === 0 ? (
            <div
              className="py-16 text-center rounded-xl"
              style={{ color: MUTED, backgroundColor: CARD_BG, border: "1px solid rgba(132, 139, 145, 0.2)" }}
            >
              No partners match your filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredPartners.map((p) => (
                <PartnerCard key={p.name} p={p} onClick={() => setActivePartner(p)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CTA */}
      <section
        className="px-4 sm:px-8 py-12 sm:py-16"
        style={{ backgroundColor: "rgba(13, 23, 29, 0.6)" }}
      >
        <div
          className="rounded-2xl p-12 flex flex-col items-center text-center relative overflow-hidden"
          style={{
            backgroundColor: CARD_BG,
            border: "1px solid rgba(132, 139, 145, 0.2)",
          }}
        >
          <div
            className="absolute inset-0 opacity-5 pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(#ff5050 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
          <div className="relative z-10 max-w-2xl">
            <h2
              style={{
                fontSize: "28px",
                fontWeight: 600,
                lineHeight: "36px",
                letterSpacing: "-0.01em",
                marginBottom: "12px",
              }}
            >
              Integrate with Redbelly
            </h2>
            <p
              style={{
                color: MUTED,
                fontSize: "16px",
                lineHeight: "24px",
                marginBottom: "32px",
              }}
            >
              Join the growing network of financial institutions and tech
              providers building on the only regulated, accountability-based
              blockchain.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="https://redbelly.network"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3 rounded-lg font-bold text-sm transition-all hover:brightness-110"
                style={{
                  backgroundColor: ACCENT,
                  color: "#fff",
                }}
              >
                Apply as Partner
              </a>
              <a
                href="https://docs.redbelly.network"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3 rounded-lg text-sm font-medium transition-all hover:opacity-80"
                style={{
                  border: "1px solid rgba(132, 139, 145, 0.3)",
                  color: SURFACE,
                }}
              >
                Developer Docs
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="w-full px-4 sm:px-8 py-6"
        style={{
          backgroundColor: DARK_BG,
          borderTop: "1px solid rgba(132, 139, 145, 0.1)",
        }}
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span style={{ fontSize: "16px", fontWeight: 500 }}>Redbelly</span>
            <p style={{ color: MUTED, fontSize: "13px", marginTop: "4px" }}>
              &copy; {new Date().getFullYear()} Redbelly Network. Institutional Grade RWA Layer.
            </p>
          </div>
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowStatus((v) => !v)}
              style={{ background: "none", border: "none", cursor: "pointer", color: MUTED, fontSize: "12px", padding: 0, display: "flex", alignItems: "center", gap: "5px" }}
              className="hover:underline"
            >
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#22c55e", display: "inline-block" }} />
              Status
            </button>
            {showStatus && <NetworkStatusCard data={data} onClose={() => setShowStatus(false)} />}
          </div>
        </div>
      </footer>

      {activePartner && (
        <PartnerModal
          partner={activePartner}
          token={activeToken}
          onClose={() => setActivePartner(null)}
        />
      )}
    </div>
  );
}
