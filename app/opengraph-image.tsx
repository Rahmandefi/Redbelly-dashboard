import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

export const runtime = "nodejs";
export const alt = "Redbelly Network Dashboard";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  const logoData = readFileSync(join(process.cwd(), "public/logo.png"));
  const logo = `data:image/png;base64,${logoData.toString("base64")}`;

  const BRACKET = "rgba(0,212,200,0.6)";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          background: "#0a0d13",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Corner brackets */}
        {/* Top-left */}
        <div style={{ position: "absolute", top: "36px", left: "36px", width: "40px", height: "40px", borderTop: `2px solid ${BRACKET}`, borderLeft: `2px solid ${BRACKET}`, display: "flex" }} />
        {/* Top-right */}
        <div style={{ position: "absolute", top: "36px", right: "36px", width: "40px", height: "40px", borderTop: `2px solid ${BRACKET}`, borderRight: `2px solid ${BRACKET}`, display: "flex" }} />
        {/* Bottom-left */}
        <div style={{ position: "absolute", bottom: "36px", left: "36px", width: "40px", height: "40px", borderBottom: `2px solid ${BRACKET}`, borderLeft: `2px solid ${BRACKET}`, display: "flex" }} />
        {/* Bottom-right */}
        <div style={{ position: "absolute", bottom: "36px", right: "36px", width: "40px", height: "40px", borderBottom: `2px solid ${BRACKET}`, borderRight: `2px solid ${BRACKET}`, display: "flex" }} />

        {/* Content */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} width={140} height={140} style={{ marginBottom: "28px" }} alt="" />
          <div style={{ fontSize: "72px", fontWeight: "700", color: "#ffffff", letterSpacing: "-1px", lineHeight: 1 }}>
            Redbelly Network
          </div>
          <div style={{ fontSize: "26px", color: "#00d4c8", marginTop: "18px", letterSpacing: "3px" }}>
            LIVE BLOCKCHAIN METRICS
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
