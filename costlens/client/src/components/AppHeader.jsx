import { colors, radius, space, type } from "../styles/tokens";

export function AppHeader({ hasResults, view, onViewChange, onGoHome, tabMeta, degradedSet, degradedReason }) {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "rgba(250,247,243,0.88)",
        backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${colors.border}`,
        padding: `${space.sm + 2}px ${space.xxl}px`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          type="button"
          onClick={onGoHome}
          aria-label="Go to home page"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: radius.sm,
              background: colors.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "'IBM Plex Mono',monospace",
              fontWeight: 700,
              fontSize: type.sizeSm,
              color: "#fff",
              letterSpacing: "-0.5px",
            }}
          >
            CL
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: 17, letterSpacing: "-0.02em", lineHeight: 1.1, color: colors.text }}>CostLens</div>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: colors.textMuted, letterSpacing: "0.06em", textTransform: "uppercase" }}>Analyze any SaaS down to its true cost</div>
          </div>
        </button>
        {hasResults && (
          <button
            type="button"
            onClick={onGoHome}
            style={{
              marginLeft: 8,
              padding: "5px 12px",
              background: "transparent",
              border: `1px solid ${colors.borderStrong}`,
              borderRadius: radius.sm,
              fontFamily: "'IBM Plex Mono',monospace",
              fontSize: 11,
              fontWeight: 600,
              color: colors.textSecondary,
              cursor: "pointer",
            }}
          >
            New Scan
          </button>
        )}
      </div>
      {hasResults && (
        <div style={{ display: "flex", border: `1px solid ${colors.borderStrong}`, borderRadius: radius.sm, overflow: "hidden", flexWrap: "wrap" }} role="tablist" aria-label="Report pillars">
          {tabMeta.map(([id, label], idx) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`tab-${id}`}
              aria-controls={`panel-${id}`}
              aria-selected={view === id}
              onClick={() => onViewChange(id)}
              style={{
                padding: "6px 16px",
                border: "none",
                borderRight: idx < tabMeta.length - 1 ? `1px solid ${colors.borderStrong}` : "none",
                background: view === id ? colors.accent : "transparent",
                color: view === id ? "#fff" : colors.textSecondary,
                fontFamily: "'IBM Plex Mono',monospace",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {label}
                {degradedSet.has(id) && (
                <span title={degradedReason(id)} style={{ width: 7, height: 7, borderRadius: "50%", background: view === id ? "#fff" : colors.accent, display: "inline-block" }} />
              )}
            </button>
          ))}
        </div>
      )}
      <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: type.sizeXs, color: colors.textMuted, display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: colors.success }} />
        TinyFish Web Agent
      </div>
    </header>
  );
}
