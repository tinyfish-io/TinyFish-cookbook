import { Panel } from "./ui/Panel";
import { SectionLabel } from "./ui/SectionLabel";
import { colors, space, type } from "../styles/tokens";

const priorityColors = {
  high: "#C41E3A",
  medium: "#B8860B",
  low: "#2E7D32",
};

const verdictColors = {
  "Strong Value": "#2E7D32",
  "Fair Market": "#B8860B",
  "Overpriced": "#C41E3A",
  "Insufficient Data": "#8B8680",
};

export function ExecutiveSummary({ executiveSummary }) {
  if (!executiveSummary || !executiveSummary.summary) return null;

  const { summary, keyFindings, recommendations, verdictLabel } = executiveSummary;
  const verdictColor = verdictColors[verdictLabel] || verdictColors["Insufficient Data"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: space.md, animation: "fadeUp 0.4s ease" }}>
      <Panel style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: space.md, marginBottom: space.lg, flexWrap: "wrap" }}>
          <SectionLabel style={{ marginBottom: 0 }}>AI Executive Summary</SectionLabel>
          <span
            style={{
              fontFamily: "'IBM Plex Mono',monospace",
              fontSize: type.sizeSm,
              fontWeight: 600,
              color: "#fff",
              background: verdictColor,
              padding: "3px 10px",
              borderRadius: 4,
              whiteSpace: "nowrap",
            }}
          >
            {verdictLabel}
          </span>
        </div>

        <div
          style={{
            fontFamily: "'Source Serif 4',Georgia,serif",
            fontSize: type.sizeLg,
            lineHeight: 1.6,
            color: colors.text,
            marginBottom: space.lg,
          }}
        >
          {summary}
        </div>

        {keyFindings.length > 0 && (
          <div style={{ marginBottom: space.lg }}>
            <SectionLabel>Key Findings</SectionLabel>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {keyFindings.map((finding, i) => (
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
                  {finding}
                </li>
              ))}
            </ul>
          </div>
        )}

        {recommendations.length > 0 && (
          <div>
            <SectionLabel>Recommendations</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: space.sm }}>
              {recommendations.map((rec, i) => (
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
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono',monospace",
                      fontSize: 9,
                      fontWeight: 600,
                      color: "#fff",
                      background: priorityColors[rec.priority] || priorityColors.medium,
                      padding: "2px 6px",
                      borderRadius: 3,
                      textTransform: "uppercase",
                      whiteSpace: "nowrap",
                      marginTop: 2,
                    }}
                  >
                    {rec.priority}
                  </span>
                  <div>
                    <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: type.sizeMd, color: colors.text }}>{rec.title}</div>
                    <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: type.sizeSm, color: colors.textSecondary, marginTop: 2 }}>{rec.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
