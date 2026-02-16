import { colors, radius, space } from "../../styles/tokens";

export function Panel({ children, style, ...rest }) {
  return (
    <div
      style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.lg,
        padding: space.xl,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
