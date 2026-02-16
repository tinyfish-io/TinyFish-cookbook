export function MarginGauge({ low, mid, high }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <div style={{ position: "relative", width: 110, height: 110 }}>
        <svg width="110" height="110" viewBox="0 0 110 110">
          <circle cx="55" cy="55" r="48" fill="none" stroke="#E8E4DF" strokeWidth="8" />
          <circle
            cx="55"
            cy="55"
            r="48"
            fill="none"
            stroke="#C41E3A"
            strokeWidth="8"
            strokeDasharray={`${mid * 3.01} ${301.6 - mid * 3.01}`}
            strokeLinecap="round"
            transform="rotate(-90 55 55)"
            style={{ transition: "stroke-dasharray 1s ease", filter: "drop-shadow(0 0 4px rgba(196,30,58,0.4))" }}
          />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: 26, color: "#C41E3A", lineHeight: 1 }}>{mid.toFixed(0)}%</span>
          <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: "#8B8680", textTransform: "uppercase", letterSpacing: "0.1em" }}>margin</span>
        </div>
      </div>
      <div>
        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 700, color: "#1A1815", marginBottom: 4 }}>Estimated Gross Margin</div>
        <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: "#8B8680" }}>Range: {low.toFixed(1)}% – {high.toFixed(1)}%</div>
      </div>
    </div>
  );
}

export function CostBar({ items }) {
  const colors = ["#C41E3A", "#D4574A", "#E8845C", "#F2A86B", "#F5C97A", "#8B7355", "#6B8F71", "#4A7A8C"];
  return (
    <div>
      <div style={{ display: "flex", height: 28, borderRadius: 4, overflow: "hidden", gap: 1, marginBottom: 10 }}>
        {items.filter((i) => i.pct > 0).map((item, i) => (
          <div
            key={`${item.category}-${i}`}
            style={{
              flex: item.pct,
              background: colors[i % colors.length],
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "'IBM Plex Mono',monospace",
              fontSize: 9,
              color: "#fff",
              fontWeight: 600,
              minWidth: item.pct > 5 ? "auto" : 0,
              overflow: "hidden",
            }}
          >
            {item.pct >= 6 ? `${item.pct}%` : ""}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {items.filter((i) => i.pct > 0).map((item, i) => (
          <div key={`${item.category}-legend-${i}`} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: colors[i % colors.length] }} />
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: "#5C5650" }}>{item.category.split("(")[0].trim()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
