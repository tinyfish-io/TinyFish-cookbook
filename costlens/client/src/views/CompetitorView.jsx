import { Panel } from "../components/ui/Panel";
import { SectionLabel } from "../components/ui/SectionLabel";
import { colors, radius, space, type } from "../styles/tokens";

const GRID_SIZE = 5;
const MAP_SIZE = 320;
const DOT_SIZE = 14;

function PositioningMap({ competitors, targetPositioning, targetName }) {
  const toX = (featureRichness) => ((featureRichness - 1) / (GRID_SIZE - 1)) * (MAP_SIZE - DOT_SIZE * 2) + DOT_SIZE;
  const toY = (priceLevel) => ((GRID_SIZE - priceLevel) / (GRID_SIZE - 1)) * (MAP_SIZE - DOT_SIZE * 2) + DOT_SIZE;

  return (
    <div style={{ position: "relative", width: MAP_SIZE, height: MAP_SIZE, margin: "0 auto" }}>
      {/* Grid background */}
      <svg width={MAP_SIZE} height={MAP_SIZE} style={{ position: "absolute", top: 0, left: 0 }}>
        {[...Array(GRID_SIZE)].map((_, i) => {
          const x = toX(i + 1);
          const y = toY(i + 1);
          return (
            <g key={i}>
              <line x1={x} y1={DOT_SIZE} x2={x} y2={MAP_SIZE - DOT_SIZE} stroke={colors.border} strokeWidth={1} strokeDasharray="4,4" />
              <line x1={DOT_SIZE} y1={y} x2={MAP_SIZE - DOT_SIZE} y2={y} stroke={colors.border} strokeWidth={1} strokeDasharray="4,4" />
            </g>
          );
        })}
      </svg>

      {/* Axis labels */}
      <div style={{ position: "absolute", bottom: -22, left: "50%", transform: "translateX(-50%)", fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: colors.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>
        Feature Richness →
      </div>
      <div style={{ position: "absolute", top: "50%", left: -28, transform: "translateY(-50%) rotate(-90deg)", fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: colors.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>
        Price Level →
      </div>

      {/* Competitor dots */}
      {competitors.map((c, i) => {
        const cx = toX(c.positioning.featureRichness);
        const cy = toY(c.positioning.priceLevel);
        return (
          <div
            key={i}
            title={`${c.name}: ${c.startingPrice}`}
            style={{
              position: "absolute",
              left: cx - DOT_SIZE / 2,
              top: cy - DOT_SIZE / 2,
              width: DOT_SIZE,
              height: DOT_SIZE,
              borderRadius: "50%",
              background: colors.borderStrong,
              border: `2px solid ${colors.textMuted}`,
              cursor: "default",
              zIndex: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 7,
              fontWeight: 700,
              color: "#fff",
              fontFamily: "'IBM Plex Mono',monospace",
            }}
          >
            {i + 1}
          </div>
        );
      })}

      {/* Target dot (highlighted) */}
      <div
        title={targetName}
        style={{
          position: "absolute",
          left: toX(targetPositioning.featureRichness) - 10,
          top: toY(targetPositioning.priceLevel) - 10,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: colors.accent,
          border: "3px solid #fff",
          boxShadow: `0 0 0 2px ${colors.accent}, 0 2px 8px rgba(196,30,58,0.3)`,
          zIndex: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 8,
          fontWeight: 800,
          color: "#fff",
          fontFamily: "'IBM Plex Mono',monospace",
        }}
      >
        T
      </div>

      {/* Corner labels */}
      <div style={{ position: "absolute", top: 2, left: 4, fontFamily: "'IBM Plex Mono',monospace", fontSize: 8, color: colors.textMuted }}>Premium</div>
      <div style={{ position: "absolute", bottom: 2, left: 4, fontFamily: "'IBM Plex Mono',monospace", fontSize: 8, color: colors.textMuted }}>Budget</div>
      <div style={{ position: "absolute", bottom: 2, right: 4, fontFamily: "'IBM Plex Mono',monospace", fontSize: 8, color: colors.textMuted }}>Full-Suite</div>
      <div style={{ position: "absolute", top: 2, right: 4, fontFamily: "'IBM Plex Mono',monospace", fontSize: 8, color: colors.textMuted }}>Enterprise</div>
    </div>
  );
}

function CompetitorCard({ competitor, index }) {
  return (
    <Panel style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: radius.sm,
            background: colors.borderStrong,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "'IBM Plex Mono',monospace",
            fontWeight: 700,
            fontSize: 11,
            color: "#fff",
            flexShrink: 0,
          }}
        >
          {index + 1}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>{competitor.name}</div>
          {competitor.url && (
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: colors.textMuted, marginTop: 2 }}>{competitor.url}</div>
          )}
        </div>
        <div
          style={{
            padding: "3px 8px",
            background: colors.accentSoft,
            borderRadius: radius.sm,
            fontFamily: "'IBM Plex Mono',monospace",
            fontSize: 11,
            fontWeight: 600,
            color: colors.accent,
            whiteSpace: "nowrap",
          }}
        >
          {competitor.startingPrice}
        </div>
      </div>

      {competitor.description && (
        <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: type.sizeSm, color: colors.textSecondary, marginBottom: 10, lineHeight: 1.5 }}>
          {competitor.description}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {competitor.prosVsTarget.length > 0 && (
          <div>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, fontWeight: 600, color: colors.success, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
              Strengths vs Target
            </div>
            {competitor.prosVsTarget.map((p, i) => (
              <div key={i} style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: colors.textSecondary, lineHeight: 1.6 }}>
                + {p}
              </div>
            ))}
          </div>
        )}
        {competitor.consVsTarget.length > 0 && (
          <div>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, fontWeight: 600, color: colors.accent, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
              Weaknesses vs Target
            </div>
            {competitor.consVsTarget.map((c, i) => (
              <div key={i} style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: colors.textSecondary, lineHeight: 1.6 }}>
                - {c}
              </div>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}

export function CompetitorView({ report }) {
  const analysis = report.competitorAnalysis;

  if (!analysis || !analysis.competitors || analysis.competitors.length === 0) {
    return (
      <Panel style={{ padding: 24, textAlign: "center" }}>
        <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
          No Competitor Data
        </div>
        <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: type.sizeSm, color: colors.textMuted }}>
          TinyFish could not discover competitors for this target. This can happen with niche or very new products.
        </div>
      </Panel>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: space.lg, animation: "fadeUp 0.4s ease" }}>
      {/* Verdict Banner */}
      <Panel style={{ padding: "16px 20px", background: "#F0F7FF", borderColor: "#2E7D3225" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: colors.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "'IBM Plex Mono',monospace",
              fontWeight: 800,
              fontSize: 14,
              color: "#fff",
              flexShrink: 0,
            }}
          >
            {analysis.competitors.length}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 15, marginBottom: 2 }}>
              Competitors Discovered via TinyFish
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: type.sizeSm, color: colors.textSecondary, lineHeight: 1.5 }}>
              {analysis.verdict}
            </div>
          </div>
        </div>
      </Panel>

      {/* Positioning Map + Legend */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: space.lg, alignItems: "start" }}>
        <Panel style={{ padding: 24 }}>
          <SectionLabel>Market Positioning Map</SectionLabel>
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: colors.textMuted, marginBottom: 16 }}>
            Where {report.target.name} sits relative to competitors
          </div>
          <PositioningMap
            competitors={analysis.competitors}
            targetPositioning={analysis.targetPositioning}
            targetName={report.target.name}
          />
        </Panel>

        <Panel style={{ padding: 24 }}>
          <SectionLabel>Map Legend</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 16, height: 16, borderRadius: "50%", background: colors.accent, border: "2px solid #fff", boxShadow: `0 0 0 1px ${colors.accent}`, flexShrink: 0 }} />
              <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: type.sizeSm, fontWeight: 600 }}>
                {report.target.name} (Target)
              </span>
            </div>
            {analysis.competitors.map((c, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: colors.borderStrong,
                    border: `2px solid ${colors.textMuted}`,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 8,
                    fontWeight: 700,
                    color: "#fff",
                    fontFamily: "'IBM Plex Mono',monospace",
                  }}
                >
                  {i + 1}
                </div>
                <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: type.sizeSm }}>
                  {c.name}
                </span>
                <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: colors.textMuted, marginLeft: "auto" }}>
                  {c.startingPrice}
                </span>
              </div>
            ))}
          </div>

          {analysis.landscape && (
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${colors.border}` }}>
              <SectionLabel>Landscape Overview</SectionLabel>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: type.sizeSm, color: colors.textSecondary, lineHeight: 1.6, marginTop: 6 }}>
                {analysis.landscape}
              </div>
            </div>
          )}
        </Panel>
      </div>

      {/* Competitor Cards */}
      <div>
        <SectionLabel>Competitor Breakdown</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: space.md, marginTop: space.sm }}>
          {analysis.competitors.map((c, i) => (
            <CompetitorCard key={i} competitor={c} index={i} />
          ))}
        </div>
      </div>

      {/* TinyFish attribution */}
      <div style={{ textAlign: "center", fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: colors.textMuted, padding: `${space.sm}px 0` }}>
        Competitor data discovered autonomously by TinyFish Web Agent
      </div>
    </div>
  );
}
