"use client";

import { useEffect, useState } from "react";

export default function PulseBar({
  intervalMs,
  refreshKey,
}: {
  intervalMs: number;
  refreshKey: number;
}) {
  return (
    <div
      className="fixed top-0 left-0 right-0 h-[2px] z-50"
      style={{ background: "var(--hairline)" }}
      aria-hidden="true"
    >
      <PulseFill key={refreshKey} intervalMs={intervalMs} />
    </div>
  );
}

function PulseFill({ intervalMs }: { intervalMs: number }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = Date.now() - start;
      setProgress(Math.min(elapsed / intervalMs, 1));
    }, 200);
    return () => clearInterval(id);
  }, [intervalMs]);

  return (
    <div
      className="h-full transition-[width] duration-200 ease-linear"
      style={{
        width: `${progress * 100}%`,
        background: "var(--eucalyptus)",
      }}
    />
  );
}
