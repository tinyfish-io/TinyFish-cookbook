export function ScanOverlay({ progress, action, platforms }) {
  const safePlatforms = Array.isArray(platforms) ? platforms : [];
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(250,247,243,0.96)",
        backdropFilter: "blur(12px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
      }}
    >
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
      <div style={{ width: 64, height: 64, borderRadius: "50%", border: "3px solid #E8E4DF", borderTopColor: "#C41E3A", animation: "spin 0.8s linear infinite" }} />
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: 22, color: "#1A1815" }}>Investigating...</div>
        <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: "#C41E3A", animation: "pulse 1.5s ease infinite", marginTop: 6 }}>{action}</div>
        <div style={{ width: 280, height: 3, background: "#E8E4DF", borderRadius: 2, overflow: "hidden", margin: "16px auto 0" }}>
          <div style={{ width: `${progress}%`, height: "100%", background: "linear-gradient(90deg,#C41E3A,#D4574A)", transition: "width 0.3s" }} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", maxWidth: 500 }}>
        {safePlatforms.map((p, i) => (
          <span
            key={p}
            style={{
              padding: "3px 10px",
              border: `1px solid ${progress > (i + 1) * 9 ? "#C41E3A" : "#D5D0CA"}`,
              borderRadius: 3,
              fontFamily: "'IBM Plex Mono',monospace",
              fontSize: 10,
              color: progress > (i + 1) * 9 ? "#C41E3A" : "#8B8680",
              background: progress > (i + 1) * 9 ? "rgba(196,30,58,0.06)" : "transparent",
              transition: "all 0.3s",
            }}
          >
            {progress > (i + 1) * 9 ? "✓" : "○"} {p}
          </span>
        ))}
      </div>
    </div>
  );
}
