import { ScanHistory } from "../components/ScanHistory";
import { colors, radius, space, type } from "../styles/tokens";

export function LandingView({ url, setUrl, runScan, scanning, scanError, onClearError, onLoadReport }) {
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: `${56}px ${28}px`, animation: "fadeUp 0.5s ease" }}>
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: type.sizeXs, color: colors.accent, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: space.lg }}>
          Powered by TinyFish Web Agent
        </div>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: type.sizeHero, fontWeight: 900, lineHeight: 1.05, marginBottom: space.lg, letterSpacing: "-0.02em" }}>
          Analyze any SaaS
          <br />
          down to its <span style={{ color: colors.accent, fontStyle: "italic" }}>true cost</span>
        </h1>
        <p style={{ fontSize: 17, color: colors.textSecondary, lineHeight: 1.7, maxWidth: 460, margin: "0 auto" }}>
          See what it costs them to run, what it would cost to build, and what it actually costs you — including every additional fee.
        </p>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <label htmlFor="scan-url-input" style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: type.sizeXs, textTransform: "uppercase", letterSpacing: "0.08em", color: colors.textMuted, display: "block", marginBottom: 6 }}>
            SaaS URL
          </label>
          <input
            id="scan-url-input"
            aria-label="SaaS URL to investigate"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="notion.so, linear.app, figma.com..."
            style={{
              width: "100%",
              padding: "14px 16px",
              border: `2px solid ${colors.borderStrong}`,
              borderRadius: radius.md,
              background: colors.surface,
              fontFamily: "'IBM Plex Mono',monospace",
              fontSize: 14,
              color: colors.text,
              outline: "none",
            }}
            onKeyDown={(e) => e.key === "Enter" && runScan()}
          />
        </div>
        <button
          type="button"
          onClick={runScan}
          disabled={scanning || !url.trim()}
          aria-label="Start investigation"
          style={{
            alignSelf: "end",
            padding: "14px 28px",
            background: scanning || !url.trim() ? "#BFA8AC" : colors.accent,
            color: "#fff",
            border: "none",
            borderRadius: radius.md,
            fontFamily: "'IBM Plex Mono',monospace",
            fontSize: 13,
            fontWeight: 700,
            cursor: scanning || !url.trim() ? "not-allowed" : "pointer",
            letterSpacing: "0.02em",
          }}
        >
          Investigate
        </button>
      </div>
      {scanError && (
        <div style={{ textAlign: "center", marginTop: 12 }}>
          <p role="alert" style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: type.sizeSm, color: colors.accent, marginBottom: 10 }}>{scanError}</p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={runScan}
              disabled={scanning || !url.trim()}
              aria-label="Retry investigation"
              style={{
                padding: "10px 20px",
                background: colors.accent,
                color: "#fff",
                border: "none",
                borderRadius: radius.md,
                fontFamily: "'IBM Plex Mono',monospace",
                fontSize: 12,
                fontWeight: 600,
                cursor: scanning || !url.trim() ? "not-allowed" : "pointer",
              }}
            >
              Retry
            </button>
            {onClearError && (
              <button
                type="button"
                onClick={onClearError}
                aria-label="Clear error and change URL"
                style={{
                  padding: "10px 20px",
                  background: "transparent",
                  color: colors.textSecondary,
                  border: `1px solid ${colors.borderStrong}`,
                  borderRadius: radius.md,
                  fontFamily: "'IBM Plex Mono',monospace",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Change URL
              </button>
            )}
          </div>
        </div>
      )}

      <ScanHistory onLoadReport={onLoadReport} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginTop: 40 }}>
        {[
          { num: "01", title: "Their Cost", desc: "What it costs the company to run — infrastructure, team, third-party services.", icon: "🔬" },
          { num: "02", title: "Build Cost", desc: "What it would cost to build from scratch, module by module.", icon: "🏗️" },
          { num: "03", title: "Your Cost", desc: "Additional fees, overage charges, SSO surcharges, and add-on costs.", icon: "💸" },
        ].map((p) => (
          <div key={p.num} style={{ padding: "20px", border: `1px solid ${colors.border}`, borderRadius: radius.md, background: colors.surface }}>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, fontWeight: 900, color: colors.accent, opacity: 0.3, marginBottom: 8 }}>{p.num}</div>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{p.icon}</div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{p.title}</div>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: type.sizeSm, color: colors.textMuted, lineHeight: 1.5 }}>{p.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
