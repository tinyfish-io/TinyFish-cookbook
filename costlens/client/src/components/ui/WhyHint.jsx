import { useEffect, useRef, useState } from "react";
import { colors, type } from "../../styles/tokens";

export function WhyHint({ title = "Why this number?", lines = [] }) {
  const safeLines = Array.isArray(lines) ? lines.filter(Boolean) : [];
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    const updateIsMobile = () => setIsMobile(window.innerWidth < 768);
    updateIsMobile();
    window.addEventListener("resize", updateIsMobile);
    return () => window.removeEventListener("resize", updateIsMobile);
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <span ref={rootRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        style={{
          cursor: "pointer",
          fontFamily: "'IBM Plex Mono',monospace",
          fontSize: type.sizeXs,
          color: colors.textMuted,
          textDecoration: "underline dotted",
          userSelect: "none",
          border: "none",
          background: "transparent",
          padding: 0,
        }}
      >
        {title}
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: isMobile ? "auto" : 0,
            left: isMobile ? 0 : "auto",
            zIndex: 20,
            minWidth: isMobile ? 220 : 240,
            maxWidth: isMobile ? 280 : 340,
            padding: "8px 10px",
            border: `1px solid ${colors.border}`,
            borderRadius: 6,
            background: "#fff",
            boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
            fontFamily: "'IBM Plex Mono',monospace",
            fontSize: type.sizeXs,
            color: colors.textSecondary,
            lineHeight: 1.5,
          }}
        >
          {safeLines.length === 0 ? "No additional context available." : safeLines.map((line, idx) => <div key={idx}>{line}</div>)}
        </div>
      )}
    </span>
  );
}
