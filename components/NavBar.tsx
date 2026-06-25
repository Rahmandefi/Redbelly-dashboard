"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

function timeAgo(date: Date | null): string {
  if (!date) return "never";
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

interface NavBarProps {
  lastUpdated?: Date | null;
  isStale?: boolean;
}

const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: "dashboard" },
  { label: "Analytics", href: "/analytics", icon: "bar_chart" },
  { label: "Ecosystem", href: "/ecosystem", icon: "hub" },
];

export default function NavBar({ lastUpdated = null, isStale = false }: NavBarProps) {
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("rbTheme");
    const dark = stored !== "light";
    setIsDark(dark);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, []);

  // Close sidebar on navigation
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    localStorage.setItem("rbTheme", next ? "dark" : "light");
  }

  return (
    <>
      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <header
        className="flex justify-between items-center w-full px-4 sm:px-8 sticky top-0 z-50"
        style={{
          height: "72px",
          backgroundColor: "var(--nav-bg)",
          borderBottom: "1px solid var(--border-subtle)",
          backdropFilter: "blur(12px)",
          transition: "background-color 0.25s ease",
        }}
      >
        {/* Left: logo */}
        <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
          <Image
            src="/logo.png"
            alt="Redbelly Network"
            width={32}
            height={32}
            style={{ objectFit: "contain" }}
            priority
          />
          <span
            className="hidden sm:inline"
            style={{ fontSize: "17px", fontWeight: 700, color: "var(--accent)", letterSpacing: "-0.01em" }}
          >
            Redbelly
          </span>
        </Link>

        {/* Right: status + chain + theme + hamburger */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Live/stale dot */}
          <div
            title={isStale ? "Data is stale" : `Live · ${timeAgo(lastUpdated)}`}
            className={isStale ? "" : "animate-pulse-green"}
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              backgroundColor: isStale ? "var(--accent)" : "var(--teal)",
              flexShrink: 0,
              cursor: "default",
            }}
          />

          {/* Chain badge */}
          <div
            className="hidden md:flex px-3 py-1 rounded-full"
            style={{ backgroundColor: "rgba(255, 80, 80, 0.1)", border: "1px solid rgba(255, 80, 80, 0.25)" }}
          >
            <span style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.05em", color: "var(--accent)" }}>
              Mainnet - Chain 151
            </span>
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            style={{
              width: "34px", height: "34px", borderRadius: "50%",
              backgroundColor: "var(--pill-bg)", border: "1px solid var(--border)",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--muted)", flexShrink: 0, transition: "border-color 0.2s, color 0.2s",
            }}
            onMouseEnter={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = "var(--accent)"; b.style.color = "var(--accent)"; }}
            onMouseLeave={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = "var(--border)"; b.style.color = "var(--muted)"; }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "17px" }}>
              {isDark ? "dark_mode" : "light_mode"}
            </span>
          </button>

          {/* Hamburger (always visible) */}
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label={sidebarOpen ? "Close navigation" : "Open navigation"}
            style={{
              width: "34px", height: "34px", borderRadius: "8px",
              backgroundColor: sidebarOpen ? "rgba(255, 80, 80, 0.12)" : "var(--pill-bg)",
              border: `1px solid ${sidebarOpen ? "rgba(255,80,80,0.35)" : "var(--border)"}`,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              color: sidebarOpen ? "var(--accent)" : "var(--muted)", flexShrink: 0,
              transition: "background-color 0.2s, border-color 0.2s, color 0.2s",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
              {sidebarOpen ? "close" : "menu"}
            </span>
          </button>
        </div>
      </header>

      {/* ── Backdrop ────────────────────────────────────────────────── */}
      <div
        onClick={() => setSidebarOpen(false)}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 90,
          backgroundColor: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(2px)",
          opacity: sidebarOpen ? 1 : 0,
          pointerEvents: sidebarOpen ? "auto" : "none",
          transition: "opacity 0.25s ease",
        }}
      />

      {/* ── Sidebar drawer ──────────────────────────────────────────── */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          height: "100dvh",
          width: "260px",
          zIndex: 100,
          backgroundColor: "var(--card)",
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: sidebarOpen ? "4px 0 32px rgba(0,0,0,0.35)" : "none",
          overflowY: "auto",
        }}
      >
        {/* Sidebar header */}
        <div
          className="flex items-center justify-between px-5"
          style={{ height: "72px", borderBottom: "1px solid var(--border-subtle)", flexShrink: 0 }}
        >
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="Redbelly Network" width={28} height={28} style={{ objectFit: "contain" }} />
            <span style={{ fontSize: "16px", fontWeight: 700, color: "var(--accent)" }}>Redbelly</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            style={{
              width: "30px", height: "30px", borderRadius: "6px",
              border: "1px solid var(--border)", backgroundColor: "transparent",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--muted)",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>close</span>
          </button>
        </div>

        {/* Nav section */}
        <div style={{ padding: "16px 12px", flexGrow: 1 }}>
          <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", padding: "4px 8px 10px" }}>
            Navigation
          </p>
          {NAV_ITEMS.map(({ label, href, icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "11px 12px",
                  borderRadius: "10px",
                  fontSize: "14px",
                  fontWeight: active ? 700 : 500,
                  color: active ? "var(--accent)" : "var(--surface)",
                  backgroundColor: active ? "rgba(255, 80, 80, 0.1)" : "transparent",
                  marginBottom: "4px",
                  transition: "background-color 0.15s, color 0.15s",
                  borderLeft: active ? "3px solid var(--accent)" : "3px solid transparent",
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "rgba(132, 139, 145, 0.1)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "transparent";
                  }
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "20px", color: active ? "var(--accent)" : "var(--muted)", flexShrink: 0 }}
                >
                  {icon}
                </span>
                {label}
              </Link>
            );
          })}
        </div>

        {/* Sidebar footer: status */}
        <div
          style={{
            padding: "16px",
            borderTop: "1px solid var(--border-subtle)",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className={isStale ? "" : "animate-pulse-green"}
              style={{ width: "7px", height: "7px", borderRadius: "50%", backgroundColor: isStale ? "var(--accent)" : "var(--teal)", flexShrink: 0 }}
            />
            <span style={{ fontSize: "11px", fontWeight: 600, color: isStale ? "var(--accent)" : "var(--teal)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
              {isStale ? "STALE" : "LIVE"}
            </span>
            <span style={{ fontSize: "11px", color: "var(--muted)", marginLeft: "2px" }}>
              {timeAgo(lastUpdated)}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span
              style={{
                fontSize: "11px", fontWeight: 600, color: "var(--accent)",
                backgroundColor: "rgba(255, 80, 80, 0.1)",
                border: "1px solid rgba(255,80,80,0.25)",
                borderRadius: "999px", padding: "3px 10px",
              }}
            >
              Mainnet - Chain 151
            </span>
            <button
              onClick={toggleTheme}
              title={isDark ? "Light mode" : "Dark mode"}
              style={{
                width: "30px", height: "30px", borderRadius: "50%",
                backgroundColor: "var(--pill-bg)", border: "1px solid var(--border)",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--muted)",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                {isDark ? "dark_mode" : "light_mode"}
              </span>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
