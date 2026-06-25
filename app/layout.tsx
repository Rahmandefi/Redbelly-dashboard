import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Redbelly Network | Public Metrics Dashboard",
  description:
    "Real-time on-chain metrics for Redbelly Network: TVL, transactions, active addresses, and partnerships.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        {/* Sync theme before first paint to prevent flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('rbTheme');document.documentElement.dataset.theme=t==='light'?'light':'dark';}catch(e){}})();`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
