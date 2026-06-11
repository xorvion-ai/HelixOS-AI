// HelixOS logotype — two-tone: "Helix" in ink, "OS" in an accent gradient.
// Used wherever the brand name appears as a wordmark (nav, sidebar, login,
// mock header) so the brand reads consistently.
export function Wordmark({ size = 22 }: { size?: number }) {
  return (
    <span style={{ fontSize: size, fontWeight: 800, letterSpacing: "-.035em", lineHeight: 1, display: "inline-block" }}>
      <span style={{ color: "var(--text)" }}>Helix</span>
      <span
        style={{
          background: "linear-gradient(115deg, var(--accent) 10%, var(--accent-strong) 90%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          WebkitTextFillColor: "transparent",
          color: "transparent",
        }}
      >
        OS
      </span>
    </span>
  );
}
