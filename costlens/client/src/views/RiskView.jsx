import { Panel } from "../components/ui/Panel";
import { SectionLabel } from "../components/ui/SectionLabel";
import { DegradedBanner } from "../components/ui/DegradedBanner";
import { colors, space, type } from "../styles/tokens";

const riskLevelColors = {
  low: "#2E7D32",
  medium: "#B8860B",
  high: "#C41E3A",
  critical: "#8B0000",
};

const severityColors = {
  info: "#5C5650",
  warning: "#B8860B",
  critical: "#C41E3A",
};

const badgeStatusColors = {
  verified: "#2E7D32",
  claimed: "#B8860B",
  missing: "#8B8680",
};

function ScoreGauge({ score, label }) {
  const color = score >= 80 ? "#2E7D32" : score >= 60 ? "#B8860B" : "#C41E3A";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div style={{ position: "relative", width: 80, height: 80 }}>
        <svg viewBox="0 0 36 36" style={{ width: 80, height: 80, transform: "rotate(-90deg)" }}>
          <circle cx="18" cy="18" r="15.9155" fill="none" stroke={colors.border} strokeWidth="3" />
          <circle
            cx="18" cy="18" r="15.9155" fill="none" stroke={color} strokeWidth="3"
            strokeDasharray={`${score} ${100 - score}`}
            strokeLinecap="round"
          />
        </svg>
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: 18, color,
        }}>
          {score}
        </div>
      </div>
      <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: type.sizeSm, color: colors.textMuted }}>{label}</div>
    </div>
  );
}

export function RiskView({ report, degraded, degradedReason }) {
  const risk = report.riskProfile || {};
  const riskColor = riskLevelColors[risk.overallRiskLevel] || riskLevelColors.medium;
  const findings = Array.isArray(risk.findings) ? risk.findings : [];
  const badges = Array.isArray(risk.complianceBadges) ? risk.complianceBadges : [];
  const recommendations = Array.isArray(risk.recommendations) ? risk.recommendations : [];
  const trackerTotal = risk.trackerSummary?.total || 0;
  const trackerCategories = risk.trackerSummary?.categories || {};
  const hasMeaningfulData = risk.securityScore > 0 || findings.length > 0 || badges.length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: space.lg, animation: "fadeUp 0.4s ease" }}>
      {degraded && <DegradedBanner title={degradedReason("risk")} message="Risk estimates have degraded confidence for this run." />}

      {/* Overview row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: space.md }}>
        <Panel style={{ padding: 24, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <SectionLabel style={{ marginBottom: space.md }}>Overall Risk Level</SectionLabel>
          <span
            style={{
              fontFamily: "'Playfair Display',serif",
              fontWeight: 900,
              fontSize: 28,
              color: riskColor,
              textTransform: "uppercase",
            }}
          >
            {risk.overallRiskLevel || "Unknown"}
          </span>
        </Panel>

        <Panel style={{ padding: 24, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          {hasMeaningfulData ? (
            <ScoreGauge score={risk.securityScore} label="Security Score" />
          ) : (
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: type.sizeSm, color: colors.textMuted, textAlign: "center" }}>
              Insufficient data for security score
            </div>
          )}
        </Panel>

        <Panel style={{ padding: 24, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <SectionLabel style={{ marginBottom: space.sm }}>Third-Party Trackers</SectionLabel>
          <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: 28, color: trackerTotal > 10 ? "#C41E3A" : trackerTotal > 5 ? "#B8860B" : "#2E7D32" }}>
            {trackerTotal}
          </div>
          {Object.keys(trackerCategories).length > 0 && (
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: colors.textMuted, marginTop: 4, textAlign: "center" }}>
              {Object.entries(trackerCategories).map(([cat, count]) => `${cat}: ${count}`).join(" · ")}
            </div>
          )}
        </Panel>
      </div>

      {/* Compliance Badges */}
      {badges.length > 0 && (
        <Panel style={{ padding: 24 }}>
          <SectionLabel style={{ marginBottom: space.md }}>Compliance & Certifications</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: space.sm }}>
            {badges.map((badge, i) => (
              <span
                key={i}
                style={{
                  fontFamily: "'IBM Plex Mono',monospace",
                  fontSize: type.sizeSm,
                  fontWeight: 600,
                  color: "#fff",
                  background: badgeStatusColors[badge.status] || badgeStatusColors.missing,
                  padding: "4px 10px",
                  borderRadius: 4,
                }}
              >
                {badge.name} — {badge.status}
              </span>
            ))}
          </div>
        </Panel>
      )}

      {/* Findings */}
      {findings.length > 0 && (
        <Panel style={{ padding: 24 }}>
          <SectionLabel style={{ marginBottom: space.md }}>Security & Privacy Findings</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: space.sm }}>
            {findings.map((f, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: space.md,
                  alignItems: "flex-start",
                  padding: `${space.sm}px ${space.md}px`,
                  background: colors.bg,
                  borderRadius: 4,
                  border: `1px solid ${colors.border}`,
                  borderLeftWidth: 3,
                  borderLeftColor: severityColors[f.severity] || severityColors.info,
                }}
              >
                <span
                  style={{
                    fontFamily: "'IBM Plex Mono',monospace",
                    fontSize: 9,
                    fontWeight: 600,
                    color: "#fff",
                    background: severityColors[f.severity] || severityColors.info,
                    padding: "2px 6px",
                    borderRadius: 3,
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                    marginTop: 2,
                  }}
                >
                  {f.severity}
                </span>
                <div>
                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontWeight: 600, fontSize: type.sizeSm, color: colors.textSecondary }}>{f.category}</div>
                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: type.sizeSm, color: colors.text, marginTop: 2 }}>{f.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Panel style={{ padding: 24 }}>
          <SectionLabel style={{ marginBottom: space.md }}>Risk Mitigation Recommendations</SectionLabel>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {recommendations.map((rec, i) => (
              <li
                key={i}
                style={{
                  fontFamily: "'IBM Plex Mono',monospace",
                  fontSize: type.sizeMd,
                  color: colors.textSecondary,
                  lineHeight: 1.6,
                  marginBottom: 4,
                }}
              >
                {rec}
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
