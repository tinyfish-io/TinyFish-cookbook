import { Panel } from "../components/ui/Panel";
import { SectionLabel } from "../components/ui/SectionLabel";
import { DegradedBanner } from "../components/ui/DegradedBanner";
import { WhyHint } from "../components/ui/WhyHint";
import { ExpandableRow } from "../components/ui/ExpandableRow";
import { ConfBadge, ComplexBadge } from "../components/Badges";
import { fmt, fmtRange, hasRange, hasValue } from "../utils/formatting";
import { colors, space, type } from "../styles/tokens";

const NO_DATA = "Insufficient data for this estimate";

export function BuildView({ report, degraded, degradedReason, expandedBuild, setExpandedBuild }) {
  const confidenceLevel = report.buildCost?.confidence?.level || "low";
  const confidenceScore = report.buildCost?.confidence?.overall || 0;
  const provenance = report.provenance?.build || { evidenceSources: [] };
  const buildHintLines = [
    `Confidence: ${confidenceScore}% (${confidenceLevel})`,
    `Sources: ${provenance.evidenceSources?.length > 0 ? provenance.evidenceSources.join(", ") : "none"}`,
    `Validation warnings: ${report.buildCost.validationWarnings?.length || 0}`,
  ];

  const hasCostData = hasRange(report.buildCost.totalEstimate);
  const hasTimeData = hasRange(report.buildCost.timeEstimate);
  const hasTeamData = hasValue(report.buildCost.teamSize?.min) || hasValue(report.buildCost.teamSize?.max) || hasValue(report.buildCost.teamSize?.optimal);

  const cards = [
    { label: "Total Build Cost", hasData: hasCostData, value: fmtRange(report.buildCost.totalEstimate.low, report.buildCost.totalEstimate.high), sub: `Mid: ${fmt(report.buildCost.totalEstimate.mid)} (estimated)` },
    { label: "Timeline", hasData: hasTimeData, value: `${report.buildCost.timeEstimate.low}–${report.buildCost.timeEstimate.high} months`, sub: `Optimal: ${report.buildCost.timeEstimate.mid} months (estimated)` },
    { label: "Team Size", hasData: hasTeamData, value: `${report.buildCost.teamSize.min}–${report.buildCost.teamSize.max} engineers`, sub: `Optimal: ${report.buildCost.teamSize.optimal} (estimated)` },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: space.lg, animation: "fadeUp 0.4s ease" }}>
      {degraded && <DegradedBanner title={degradedReason("build")} message="Build estimates are based on partial signals. Validate before budgeting." />}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: space.md }}>
        {cards.map((c) => (
          <Panel key={c.label}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <SectionLabel style={{ marginBottom: 0 }}>{c.label}</SectionLabel>
                <WhyHint lines={buildHintLines} />
              </div>
              {c.hasData && <ConfBadge level={confidenceLevel} />}
            </div>
            {c.hasData ? (
              <>
                <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: 22, color: colors.accent, lineHeight: 1 }}>{c.value}</div>
                <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: type.sizeSm, color: colors.textMuted, marginTop: 4 }}>{c.sub}</div>
              </>
            ) : (
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: type.sizeSm, color: colors.textMuted }}>{NO_DATA}</div>
            )}
          </Panel>
        ))}
      </div>

      <Panel>
        <SectionLabel style={{ marginBottom: 8 }}>Build Confidence & Sources</SectionLabel>
        <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: type.sizeSm, color: colors.textSecondary, marginBottom: 8 }}>
          Overall confidence: {confidenceScore}% ({confidenceLevel})
        </div>
        {provenance.evidenceSources?.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
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
        {report.buildCost.validationWarnings?.length > 0 && (
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: type.sizeXs, color: colors.accent, marginTop: 8 }}>
            Validation notes: {report.buildCost.validationWarnings.join(" | ")}
          </div>
        )}
      </Panel>

      <div>
        <SectionLabel>Module-by-Module Build Estimate</SectionLabel>
        {report.buildCost.breakdown.length === 0 && (
          <Panel>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: type.sizeSm, color: colors.textMuted }}>No module-level breakdown data available.</div>
          </Panel>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: space.sm }}>
          {report.buildCost.breakdown.map((mod, i) => (
            <ExpandableRow
              key={`build-${i}`}
              title={mod.module}
              badge={<ComplexBadge level={mod.complexity} />}
              expanded={expandedBuild === i}
              onToggle={() => setExpandedBuild(expandedBuild === i ? null : i)}
              titleRight={
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontWeight: 700, fontSize: 13, color: colors.accent }}>{mod.cost}</div>
                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: type.sizeXs, color: colors.textMuted }}>{mod.effort}</div>
                </div>
              }
            >
              {mod.notes}
            </ExpandableRow>
          ))}
        </div>
      </div>

      <Panel>
        <SectionLabel>Detected Tech Stack</SectionLabel>
        {report.buildCost.techStack.length === 0 && <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: type.sizeSm, color: colors.textMuted }}>No tech stack signals were captured.</div>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: space.xs + 2 }}>
          {report.buildCost.techStack.map((t, i) => (
            <div key={`tech-${i}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: colors.bg, borderRadius: 4 }}>
              <div>
                <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: type.sizeXs, color: colors.textMuted }}>{t.layer}: </span>
                <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: type.sizeMd, fontWeight: 600, color: colors.text }}>{t.tech}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {t.detected && <span style={{ color: "#2E7D32", fontSize: 11 }}>✓</span>}
                <ConfBadge level={t.confidence} />
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
