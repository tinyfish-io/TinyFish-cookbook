import { useState } from "react";
import { exportAsJson, copyTextSummary } from "../utils/export";
import { colors, radius, space, type } from "../styles/tokens";

export function ExportBar({ report }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyTextSummary(report);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        gap: space.sm,
        flexWrap: "wrap",
      }}
    >
      <button
        type="button"
        onClick={() => exportAsJson(report)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 14px",
          background: colors.surface,
          color: colors.textSecondary,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.md,
          fontFamily: "'IBM Plex Mono',monospace",
          fontSize: type.sizeSm,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        <span style={{ fontSize: 13 }}>↓</span>
        Download JSON
      </button>
      <button
        type="button"
        onClick={handleCopy}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 14px",
          background: copied ? "#2E7D32" : colors.surface,
          color: copied ? "#fff" : colors.textSecondary,
          border: `1px solid ${copied ? "#2E7D32" : colors.border}`,
          borderRadius: radius.md,
          fontFamily: "'IBM Plex Mono',monospace",
          fontSize: type.sizeSm,
          fontWeight: 600,
          cursor: "pointer",
          transition: "all 0.2s ease",
        }}
      >
        <span style={{ fontSize: 13 }}>{copied ? "✓" : "⎘"}</span>
        {copied ? "Copied!" : "Copy Summary"}
      </button>
    </div>
  );
}
