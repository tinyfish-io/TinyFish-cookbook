import { Panel } from "../components/ui/Panel";
import { SectionLabel } from "../components/ui/SectionLabel";
import { DegradedBanner } from "../components/ui/DegradedBanner";
import { WhyHint } from "../components/ui/WhyHint";
import { NegotiationPlaybook } from "../components/NegotiationPlaybook";
import { ConfBadge } from "../components/Badges";
import { colors, space, type } from "../styles/tokens";

export function BuyerView({ report, degraded, degradedReason }) {
  const confidenceLevel = report.buyerCost?.confidence?.level || "low";
  const confidenceScore = report.buyerCost?.confidence?.overall || 0;
  const provenance = report.provenance?.buyer || { evidenceSources: [] };
  const hasConfidenceData =
    (provenance.evidenceSources?.length || 0) > 0 ||
    (report.buyerCost.validationWarnings?.length || 0) > 0 ||
    confidenceScore > 0;
  const buyerHintLines = [
    `Confidence: ${confidenceScore}% (${confidenceLevel})`,
    `Sources: ${provenance.evidenceSources?.length > 0 ? provenance.evidenceSources.join(", ") : "none"}`,
    `Validation warnings: ${report.buyerCost.validationWarnings?.length || 0}`,
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: space.lg, animation: "fadeUp 0.4s ease" }}>
      {degraded && <DegradedBanner title={degradedReason("buyer")} message="Buyer-cost findings are incomplete for this scan. Confirm key plan details manually." />}

      <Panel>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <SectionLabel style={{ marginBottom: 0 }}>Buyer Cost Confidence</SectionLabel>
              <WhyHint lines={buyerHintLines} />
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: type.sizeSm, color: colors.textSecondary }}>
              {hasConfidenceData
                ? `Overall confidence: ${confidenceScore}% (${confidenceLevel}) · values are estimated.`
                : "Confidence details are not available yet for this run."}
            </div>
          </div>
          {hasConfidenceData ? <ConfBadge level={confidenceLevel} /> : null}
        </div>
        {provenance.evidenceSources?.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            {provenance.evidenceSources.map((src) => (
              <span
                key={src}
                style={{
                  fontFamily: "'IBM Plex Mono',monospace",
                  fontSize: type.sizeXs,
                  color: colors.textMuted,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 999,
                  padding: "3px 8px",
                  background: colors.bg,
                }}
              >
                source: {src}
              </span>
            ))}
          </div>
        )}
        {report.buyerCost.validationWarnings?.length > 0 && (
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: type.sizeXs, color: colors.accent, marginTop: 8 }}>
            Validation notes: {report.buyerCost.validationWarnings.join(" | ")}
          </div>
        )}
      </Panel>

      {report.buyerCost.plans.length > 0 && (
        <Panel style={{ display: "flex", alignItems: "center", gap: space.md, background: "#FFF8E8", borderColor: "#9A5B0033" }}>
          <span style={{ fontSize: 22 }}>ℹ️</span>
          <div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 15 }}>Review plan details carefully</div>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: type.sizeSm, color: colors.textSecondary }}>
              The analysis below is based on publicly available pricing data for {report.target.name}. Verify all figures with the vendor before making decisions.
            </div>
          </div>
        </Panel>
      )}

      <div>
        <SectionLabel>Plan-by-Plan True Cost Analysis</SectionLabel>
        {report.buyerCost.plans.length === 0 && (
          <Panel>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: type.sizeSm, color: colors.textMuted }}>No plan-level details were captured for this scan.</div>
          </Panel>
        )}
        {report.buyerCost.plans.map((plan, i) => (
          <Panel key={`plan-${i}`} style={{ marginBottom: space.sm }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: 18 }}>{plan.name}</span>
                <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: type.sizeMd, color: colors.textMuted }}>Listed (estimated): {plan.listed}</span>
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontWeight: 700, fontSize: 15, color: colors.accent }}>Actual (estimated): {plan.actualMonthly}</div>
            </div>

            {plan.hiddenCosts.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <SectionLabel style={{ marginBottom: 6, color: colors.accent, fontWeight: 700 }}>Additional Costs</SectionLabel>
                {plan.hiddenCosts.map((hc, j) => (
                  <div key={`hidden-${j}`} style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", padding: "6px 10px", background: "#C41E3A06", borderRadius: 4, marginBottom: 3 }}>
                    <div>
                      <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: type.sizeMd, fontWeight: 600, color: colors.text }}>{hc.item}</span>
                      <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: type.sizeXs, color: colors.textMuted, marginLeft: 8 }}>{hc.note}</span>
                    </div>
                    <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: type.sizeMd, fontWeight: 700, color: colors.accent }}>{hc.cost}</span>
                  </div>
                ))}
              </div>
            )}

            <div>
              <SectionLabel style={{ marginBottom: 4 }}>Caveats</SectionLabel>
              {plan.gotchas.length === 0 && <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: type.sizeSm, color: colors.textMuted }}>No caveats detected.</div>}
              {plan.gotchas.map((g, j) => (
                <div key={`caveat-${j}`} style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: type.sizeSm, color: colors.textSecondary, padding: "3px 0", display: "flex", gap: 6 }}>
                  <span style={{ color: colors.accent, flexShrink: 0 }}>•</span>
                  {g}
                </div>
              ))}
            </div>
          </Panel>
        ))}
      </div>

      <Panel>
        <SectionLabel>Real-World TCO Scenarios</SectionLabel>
        {report.buyerCost.tcoComparison.length === 0 && <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: type.sizeSm, color: colors.textMuted }}>No TCO scenarios available.</div>}
        {report.buyerCost.tcoComparison.map((row, i) => (
          <div key={`tco-${i}`} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 8, padding: "10px 0", borderTop: i > 0 ? "1px solid #F0EDE8" : "none" }}>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: type.sizeSm, color: colors.text }}>{row.scenario}</div>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: type.sizeSm, color: colors.textMuted }}>{row.monthlyListed}/mo</div>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: type.sizeSm, fontWeight: 700 }}>{row.monthlyActual}/mo</div>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: type.sizeSm, fontWeight: 700, color: colors.accent }}>+{row.annualDelta}/yr</div>
          </div>
        ))}
      </Panel>

      <Panel>
        <SectionLabel>Competitor True Cost Comparison</SectionLabel>
        {report.buyerCost.competitorComparison.length === 0 && (
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: type.sizeSm, color: colors.textMuted }}>No competitor benchmarks available for this run.</div>
        )}
        {report.buyerCost.competitorComparison.map((c, i) => (
          <div key={`comp-${i}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "10px 12px", background: i === 0 ? "#C41E3A08" : "transparent", borderRadius: 4, borderBottom: "1px solid #F0EDE8" }}>
            <div>
              <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, fontWeight: 700, color: i === 0 ? colors.accent : colors.text }}>{c.name}</span>
              <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: type.sizeXs, color: colors.textMuted, marginLeft: 8 }}>{c.features}</span>
            </div>
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 14, fontWeight: 700, color: i === 0 ? colors.accent : colors.text }}>{c.cost}</span>
          </div>
        ))}
      </Panel>

      <NegotiationPlaybook negotiation={report.negotiation} />
    </div>
  );
}
