/** Initials on a disc: artists have no photo, so their name stands in for one. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

export function Avatar({ name, size = 28, tone = "soft" }: { name: string; size?: number; tone?: "soft" | "ink" }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold ${tone === "ink" ? "bg-ink text-white" : "bg-surface text-ink"}`}
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.36)), letterSpacing: "-0.02em" }}
    >
      {initials(name)}
    </span>
  );
}
