import { colors, radius, type } from "../../styles/tokens";

export function DegradedBanner({ message, title }) {
  return (
    <div
      title={title}
      style={{
        padding: "10px 14px",
        borderRadius: radius.md,
        border: `1px solid ${colors.accent}40`,
        background: colors.accentSoft,
        fontFamily: "'IBM Plex Mono',monospace",
        fontSize: type.sizeSm,
        color: "#7A2733",
      }}
    >
      {message}
    </div>
  );
}
