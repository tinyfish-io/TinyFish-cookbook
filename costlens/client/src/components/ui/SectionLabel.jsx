import { colors, space, type } from "../../styles/tokens";

export function SectionLabel({ children, style }) {
  return (
    <div
      style={{
        fontFamily: "'IBM Plex Mono',monospace",
        fontSize: type.sizeXs,
        color: colors.textMuted,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        marginBottom: space.sm + 2,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
