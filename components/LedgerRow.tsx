export default function LedgerRow({
  label,
  value,
  unit,
  detail,
  accent,
}: {
  label: string;
  value: string;
  unit?: string;
  detail?: string;
  accent?: "eucalyptus" | "amber" | "coral" | "default";
}) {
  const accentColor =
    accent === "eucalyptus"
      ? "var(--eucalyptus)"
      : accent === "amber"
      ? "var(--amber)"
      : accent === "coral"
      ? "var(--coral)"
      : "var(--bone)";

  return (
    <div
      className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-4 border-b"
      style={{ borderColor: "var(--hairline)" }}
    >
      <div className="flex flex-col gap-0.5 min-w-0">
        <span
          className="font-mono text-[11px] uppercase tracking-[0.12em]"
          style={{ color: "var(--bone-dim)" }}
        >
          {label}
        </span>
        {detail && (
          <span
            className="font-mono text-xs"
            style={{ color: "var(--bone-dim)" }}
          >
            {detail}
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1.5 shrink-0">
        <span
          className="text-2xl sm:text-3xl font-semibold tabular-nums"
          style={{ color: accentColor, fontFamily: "var(--font-serif)" }}
        >
          {value}
        </span>
        {unit && (
          <span
            className="font-mono text-xs"
            style={{ color: "var(--bone-dim)" }}
          >
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}
