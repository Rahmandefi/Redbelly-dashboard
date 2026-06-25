export default function StaleBanner({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div
      className="w-full px-4 py-2.5 text-sm font-mono flex items-center gap-2 border-b"
      style={{
        background: "rgba(212, 162, 76, 0.12)",
        borderColor: "var(--amber)",
        color: "var(--amber)",
      }}
      role="status"
    >
      <span aria-hidden="true">&#9888;</span>
      <span>
        RPC connection degraded, showing last known values until the next
        refresh.
      </span>
    </div>
  );
}
