import { Panel } from "./ui/Panel";
import { SectionLabel } from "./ui/SectionLabel";
import { fmt, hasValue, hasRange } from "../utils/formatting";
import { colors, space, type } from "../styles/tokens";

export function ReportSummary({ report, activePillar = "infra" }) {
  const pillar = ["infra", "build", "buyer", "risk"].includes(activePillar) ? activePillar : "infra";
  const checklistPillars = ["infra", "build", "buyer", "risk"];
  const visiblePillars = [pillar];
  const pillarLabel = pillar === "infra" ? "Their Cost" : pillar === "build" ? "Build Cost" : pillar === "buyer" ? "Your Cost" : "Risk";
  const degradedCount = report.quality.degradedPillars.length;
  const legacyScore = report.quality.completenessScore;
  const weightedScore = report.quality.qualityMeta?.confidenceScore?.global || legacyScore;
  const trustLevel = degradedCount >= 2 || weightedScore < 70 ? "Low" : degradedCount > 0 || weightedScore < 85 ? "Medium" : "High";
  const trustColor = trustLevel === "Low" ? colors.accent : trustLevel === "Medium" ? "#9A5B00" : "#1B5E20";
  const trustBackground = trustLevel === "Low" ? colors.accentSoft : trustLevel === "Medium" ? "#FFF8E8" : "#ECF8EE";
  const trustMessage =
    trustLevel === "Low"
      ? "Multiple pipeline steps degraded. Treat outputs as directional estimates only."
      : trustLevel === "Medium"
        ? "Some inputs were incomplete. Validate critical numbers before decisions."
        : "Signal coverage is healthy, but outputs are still model-based estimates.";
  const checklist = checklistPillars.map((pillar) => {
    const tasks = report.quality.qualityMeta?.pillarCoverage?.[pillar] || { tasksSucceeded: 0, tasksExpected: 0 };
    const sources = report.quality.qualityMeta?.sourceCoverage?.[pillar] || { sourceCount: 0, expectedSources: 0 };
    const hasError = Boolean(report.quality.scannerErrors?.[pillar] || report.quality.modelErrors?.[pillar]);
    const hasAnyData = tasks.tasksExpected > 0 || sources.expectedSources > 0;
    const isComplete = !hasError && tasks.tasksExpected > 0 && tasks.tasksSucceeded === tasks.tasksExpected && sources.sourceCount >= Math.max(1, Math.floor(sources.expectedSources * 0.7));
    const isMissing = hasError || (hasAnyData && (tasks.tasksSucceeded === 0 || sources.sourceCount === 0));
    return {
      pillar,
      label: pillar === "infra" ? "Their Cost" : pillar === "build" ? "Build Cost" : pillar === "buyer" ? "Your Cost" : "Risk",
      status: hasAnyData ? (isComplete ? "complete" : isMissing ? "missing" : "partial") : "unavailable",
      details: hasAnyData
        ? `${tasks.tasksSucceeded}/${tasks.tasksExpected} tasks, ${sources.sourceCount}/${sources.expectedSources} sources`
        : "Verification data not available yet",
    };
  });
  const crossChecks = Array.isArray(report.quality.qualityMeta?.crossChecks) ? report.quality.qualityMeta.crossChecks : [];
  const headlineText =
    pillar === "infra"
      ? hasValue(report.infraCost.revenueEstimate) ? `Estimated Revenue Signal: ${fmt(report.infraCost.revenueEstimate)}/mo` : null
      : pillar === "build"
        ? hasRange(report.buildCost.totalEstimate) ? `Estimated Build Midpoint: ${fmt(report.buildCost.totalEstimate.mid)}` : null
        : pillar === "buyer"
          ? report.buyerCost.plans.length > 0 ? `Plans Analyzed: ${report.buyerCost.plans.length}` : null
          : report.riskProfile?.securityScore > 0 ? `Security Score: ${report.riskProfile.securityScore}/100` : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: space.md }}>
      <Panel
        style={{
          background: trustBackground,
          borderColor: `${trustColor}33`,
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div>
          <SectionLabel style={{ marginBottom: 6 }}>Trust Indicator</SectionLabel>
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: type.sizeMd, color: colors.textSecondary }}>
            {trustMessage}
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: type.sizeSm, color: colors.textMuted, marginTop: 6 }}>
            All numbers shown are estimated from public signals and model inference, not audited financial statements.
          </div>
        </div>
        <div
          style={{
            padding: "8px 12px",
            borderRadius: 999,
            border: `1px solid ${trustColor}55`,
            color: trustColor,
            fontFamily: "'IBM Plex Mono',monospace",
            fontWeight: 700,
            fontSize: type.sizeSm,
            background: "#fff",
            whiteSpace: "nowrap",
          }}
        >
          {trustLevel} Trust ({weightedScore}%)
        </div>
      </Panel>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: space.md }}>
        <Panel style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 8,
              background: colors.text,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "'Playfair Display',serif",
              fontWeight: 900,
              fontSize: type.sizeDisplay,
              color: "#fff",
              flexShrink: 0,
            }}
          >
            {report.target.logo}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: type.sizeDisplay, overflow: "hidden", textOverflow: "ellipsis" }}>
              {report.target.name}
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: type.sizeMd, color: colors.textMuted }}>{report.target.url}</div>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: type.sizeSm, color: colors.textMuted, marginTop: 2 }}>
              Scanned {report.platformsScanned.length} sources · {new Date(report.scannedAt).toLocaleDateString()}
            </div>
          </div>
        </Panel>

        <Panel>
          <SectionLabel style={{ marginBottom: 6 }}>Data Completeness</SectionLabel>
          <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 800, fontSize: 26, color: legacyScore < 70 ? colors.accent : colors.text }}>
            {legacyScore}%
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: type.sizeSm, color: colors.textMuted, marginTop: 4 }}>
            {report.quality.partialData ? "Partial scan quality detected" : "High confidence structure"}
          </div>
        </Panel>

        <Panel>
          <SectionLabel style={{ marginBottom: 6 }}>{pillarLabel} Trust Summary</SectionLabel>
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: type.sizeMd, color: colors.textSecondary, lineHeight: 1.5 }}>
            {report.quality.degradedPillars.includes(pillar) ? `${pillarLabel} has degraded signals in this run.` : `${pillarLabel} has no degradation flags.`}
          </div>
          {headlineText && (
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: type.sizeSm, color: colors.textMuted, marginTop: 6 }}>
              {headlineText}
            </div>
          )}
          {crossChecks.length > 0 && (
            <div style={{ marginTop: 8, fontFamily: "'IBM Plex Mono',monospace", fontSize: type.sizeSm, color: colors.accent }}>
              Cross-check alerts: {crossChecks.length}
            </div>
          )}
        </Panel>
      </div>

      <Panel>
        <SectionLabel style={{ marginBottom: 10 }}>Trust Score Breakdown</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: space.sm }}>
          {visiblePillars.map((pillar) => {
            const score = report.quality.qualityMeta?.confidenceScore?.[pillar] || 0;
            const warnings = report.quality.modelWarnings?.[pillar] || [];
            const sources = report.quality.qualityMeta?.sourceCoverage?.[pillar];
            const components = report.quality.qualityMeta?.perPillar?.[pillar]?.scoreComponents || {};
            const scannerErr = report.quality.scannerErrors?.[pillar];
            const modelErr = report.quality.modelErrors?.[pillar];
            const hasTrustData = (sources?.expectedSources || 0) > 0 || (warnings?.length || 0) > 0 || scannerErr || modelErr;
            const reasons = [];
            if (scannerErr) reasons.push(`Scanner issue: ${scannerErr}`);
            if (modelErr) reasons.push(`Model issue: ${modelErr}`);
            if (!scannerErr && !modelErr && warnings.length === 0 && score >= 80) reasons.push("Healthy coverage and reliability signals.");
            return (
              <div key={pillar} style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 4, padding: 10 }}>
                <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: type.sizeXs, color: colors.textMuted, textTransform: "uppercase", marginBottom: 3 }}>
                  {pillar}
                </div>
                {hasTrustData ? (
                  <>
                    <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 22, color: score < 60 ? colors.accent : colors.text }}>
                      {score}%
                    </div>
                    <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: type.sizeXs, color: colors.textMuted }}>
                      Sources: {sources?.sourceCount || 0}/{sources?.expectedSources || 0} · warnings: {warnings.length}
                    </div>
                    <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: type.sizeXs, color: colors.textMuted, marginTop: 4 }}>
                      Coverage {components.coverageScore ?? 0}% · Reliability {components.reliabilityScore ?? 0}%
                    </div>
                  </>
                ) : (
                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: type.sizeSm, color: colors.textMuted, marginTop: 2 }}>
                    Not available yet
                  </div>
                )}
                {reasons.length > 0 && (
                  <div style={{ marginTop: 6, fontFamily: "'IBM Plex Mono',monospace", fontSize: type.sizeXs, color: colors.textSecondary }}>
                    {reasons.join(" ")}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Panel>

      {crossChecks.length > 0 && (
        <Panel>
          <SectionLabel style={{ marginBottom: 8 }}>Cross-Check Details</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {crossChecks.map((check) => (
              <div
                key={check.id}
                style={{
                  background: colors.accentSoft,
                  border: `1px solid ${colors.accent}33`,
                  borderRadius: 4,
                  padding: "8px 10px",
                  fontFamily: "'IBM Plex Mono',monospace",
                  fontSize: type.sizeXs,
                  color: colors.textSecondary,
                }}
              >
                {check.note}
              </div>
            ))}
          </div>
        </Panel>
      )}

      <Panel>
        <SectionLabel style={{ marginBottom: 10 }}>Verification Checklist</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {checklist.map((item) => (
            <div
              key={item.pillar}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                borderRadius: 4,
                padding: "9px 10px",
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: type.sizeSm, color: colors.text }}>{item.label}</div>
                <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: type.sizeXs, color: colors.textMuted }}>{item.details}</div>
              </div>
              <span
                style={{
                  fontFamily: "'IBM Plex Mono',monospace",
                  fontWeight: 700,
                  fontSize: type.sizeXs,
                  padding: "5px 8px",
                  borderRadius: 999,
                  background:
                    item.status === "complete"
                      ? "#ECF8EE"
                      : item.status === "partial"
                        ? "#FFF8E8"
                        : item.status === "unavailable"
                          ? colors.bg
                          : colors.accentSoft,
                  color:
                    item.status === "complete"
                      ? "#1B5E20"
                      : item.status === "partial"
                        ? "#9A5B00"
                        : item.status === "unavailable"
                          ? colors.textMuted
                          : colors.accent,
                  textTransform: "uppercase",
                }}
              >
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
