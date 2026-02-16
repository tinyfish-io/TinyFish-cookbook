import { Panel } from "./ui/Panel";
import { SectionLabel } from "./ui/SectionLabel";
import { colors, space, type } from "../styles/tokens";

export function NegotiationPlaybook({ negotiation }) {
  if (!negotiation) return null;

  const { leverageFactors, talkingPoints, counterOffers, riskWarnings } = negotiation;
  const hasContent = leverageFactors.length > 0 || talkingPoints.length > 0 || counterOffers.length > 0;
  if (!hasContent) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: space.md, animation: "fadeUp 0.4s ease" }}>
      <Panel style={{ padding: 24 }}>
        <SectionLabel style={{ marginBottom: space.lg }}>Negotiation Playbook</SectionLabel>

        {leverageFactors.length > 0 && (
          <div style={{ marginBottom: space.lg }}>
            <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: type.sizeLg, marginBottom: space.sm }}>Leverage Factors</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: space.md }}>
              {leverageFactors.map((f, i) => (
                <div
                  key={i}
                  style={{
                    padding: space.md,
                    background: colors.bg,
                    borderRadius: 4,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontWeight: 600, fontSize: type.sizeMd, color: colors.accent, marginBottom: 4 }}>{f.factor}</div>
                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: type.sizeSm, color: colors.textSecondary, lineHeight: 1.5 }}>{f.explanation}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {talkingPoints.length > 0 && (
          <div style={{ marginBottom: space.lg }}>
            <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: type.sizeLg, marginBottom: space.sm }}>Talking Points</div>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {talkingPoints.map((point, i) => (
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
                  {point}
                </li>
              ))}
            </ul>
          </div>
        )}

        {counterOffers.length > 0 && (
          <div style={{ marginBottom: space.lg }}>
            <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: type.sizeLg, marginBottom: space.sm }}>Counter-Offer Suggestions</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'IBM Plex Mono',monospace", fontSize: type.sizeSm }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${colors.border}` }}>
                    <th style={{ textAlign: "left", padding: "8px 12px", color: colors.textMuted, fontWeight: 600 }}>Plan</th>
                    <th style={{ textAlign: "left", padding: "8px 12px", color: colors.textMuted, fontWeight: 600 }}>Current Price</th>
                    <th style={{ textAlign: "left", padding: "8px 12px", color: colors.textMuted, fontWeight: 600 }}>Target Price</th>
                    <th style={{ textAlign: "left", padding: "8px 12px", color: colors.textMuted, fontWeight: 600 }}>Rationale</th>
                  </tr>
                </thead>
                <tbody>
                  {counterOffers.map((c, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${colors.border}` }}>
                      <td style={{ padding: "8px 12px", fontWeight: 600, color: colors.text }}>{c.plan}</td>
                      <td style={{ padding: "8px 12px", color: colors.textSecondary }}>{c.currentPrice}</td>
                      <td style={{ padding: "8px 12px", color: colors.accent, fontWeight: 600 }}>{c.suggestedTarget}</td>
                      <td style={{ padding: "8px 12px", color: colors.textSecondary }}>{c.rationale}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {riskWarnings.length > 0 && (
          <div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: type.sizeLg, marginBottom: space.sm, color: "#B8860B" }}>Risk Warnings</div>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {riskWarnings.map((w, i) => (
                <li
                  key={i}
                  style={{
                    fontFamily: "'IBM Plex Mono',monospace",
                    fontSize: type.sizeSm,
                    color: "#B8860B",
                    lineHeight: 1.6,
                    marginBottom: 4,
                  }}
                >
                  {w}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Panel>
    </div>
  );
}
