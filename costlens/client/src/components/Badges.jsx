export function ConfBadge({ level }) {
  const c =
    {
      high: { bg: "#E8F5E9", color: "#2E7D32", label: "HIGH" },
      medium: { bg: "#FFF8E1", color: "#F57F17", label: "MED" },
      low: { bg: "#FFEBEE", color: "#C62828", label: "LOW" },
    }[level] || { bg: "#F3F3F3", color: "#555", label: "UNK" };
  return (
    <span
      style={{
        padding: "2px 6px",
        borderRadius: 3,
        background: c.bg,
        color: c.color,
        fontFamily: "'IBM Plex Mono',monospace",
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: "0.05em",
      }}
    >
      {c.label}
    </span>
  );
}

export function ComplexBadge({ level }) {
  const c =
    {
      extreme: { bg: "#C41E3A", label: "EXTREME" },
      hard: { bg: "#D4574A", label: "HARD" },
      medium: { bg: "#E8845C", label: "MEDIUM" },
    }[level] || { bg: "#8B8680", label: "UNKNOWN" };
  return (
    <span
      style={{
        padding: "2px 6px",
        borderRadius: 3,
        background: c.bg,
        color: "#fff",
        fontFamily: "'IBM Plex Mono',monospace",
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: "0.05em",
      }}
    >
      {c.label}
    </span>
  );
}
