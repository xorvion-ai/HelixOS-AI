// HelixOS "Linkgraph" mark — kept exactly as the design source (26-grid).
export function BrandMark({ size = 40, glow = false }: { size?: number; glow?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" aria-hidden="true"
      style={{ filter: glow ? "drop-shadow(0 0 12px oklch(0.7 0.13 var(--acc-h) / 0.5))" : "none", display: "block" }}>
      <line x1="7" y1="6" x2="19" y2="13" stroke="var(--accent)" strokeWidth="1.7" strokeLinecap="round" />
      <line x1="19" y1="13" x2="7" y2="20" stroke="var(--accent)" strokeWidth="1.7" strokeLinecap="round" />
      <line x1="7" y1="6" x2="7" y2="20" stroke="var(--border-strong)" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="7" cy="6" r="3" fill="var(--accent)" />
      <circle cx="19" cy="13" r="3" fill="var(--surface)" stroke="var(--accent)" strokeWidth="1.9" />
      <circle cx="7" cy="20" r="3" fill="var(--surface)" stroke="var(--border-strong)" strokeWidth="1.9" />
    </svg>
  );
}
