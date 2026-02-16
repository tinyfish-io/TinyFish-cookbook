import { colors, radius, space, type } from "../../styles/tokens";

export function ExpandableRow({
  title,
  subtitle,
  badge,
  expanded,
  onToggle,
  children,
  titleRight,
  accessibilityLabel,
}) {
  return (
    <button
      type="button"
      aria-expanded={expanded}
      aria-label={accessibilityLabel || `Toggle ${title}`}
      onClick={onToggle}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "14px 18px",
        background: colors.surface,
        border: `1px solid ${expanded ? `${colors.accent}30` : colors.border}`,
        borderRadius: radius.md,
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: type.sizeLg }}>{title}</span>
          {badge}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {titleRight}
          <span style={{ fontFamily: "'IBM Plex Mono',monospace", color: colors.textMuted, fontSize: type.sizeMd }}>{expanded ? "−" : "+"}</span>
        </div>
      </div>
      {subtitle && (
        <div style={{ fontFamily: "'IBM Plex Mono',monospace", color: colors.textMuted, fontSize: type.sizeXs, marginTop: 4 }}>{subtitle}</div>
      )}
      {expanded && (
        <div
          style={{
            marginTop: 10,
            padding: `${space.sm + 2}px ${space.md}px`,
            background: colors.bg,
            borderRadius: radius.sm,
            fontFamily: "'IBM Plex Mono',monospace",
            fontSize: type.sizeSm,
            color: colors.textSecondary,
            lineHeight: 1.6,
          }}
        >
          {children}
        </div>
      )}
    </button>
  );
}
