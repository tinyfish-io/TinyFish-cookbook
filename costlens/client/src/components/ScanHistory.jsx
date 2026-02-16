import { useState, useEffect } from "react";
import { getHistory, deleteReport, clearHistory } from "../utils/history";
import { colors, radius, space, type } from "../styles/tokens";

export function ScanHistory({ onLoadReport }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const handleDelete = (id, e) => {
    e.stopPropagation();
    deleteReport(id);
    setHistory(getHistory());
  };

  const handleClear = () => {
    clearHistory();
    setHistory([]);
  };

  if (history.length === 0) return null;

  return (
    <div style={{ marginTop: 32, animation: "fadeUp 0.4s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: space.sm }}>
        <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: type.sizeSm, fontWeight: 600, color: colors.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Recent Scans
        </div>
        <button
          type="button"
          onClick={handleClear}
          style={{
            background: "none",
            border: "none",
            fontFamily: "'IBM Plex Mono',monospace",
            fontSize: 10,
            color: colors.textMuted,
            cursor: "pointer",
            textDecoration: "underline",
            padding: 0,
          }}
        >
          Clear all
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {history.map((entry) => (
          <button
            type="button"
            key={entry.id}
            onClick={() => onLoadReport(entry.id)}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: space.md,
              padding: "10px 14px",
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: radius.md,
              cursor: "pointer",
              textAlign: "left",
              width: "100%",
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: type.sizeMd, color: colors.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {entry.target}
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: colors.textMuted, marginTop: 2 }}>
                {entry.url} · {new Date(entry.scannedAt).toLocaleDateString()}
                {entry.verdictLabel ? ` · ${entry.verdictLabel}` : ""}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: space.sm, flexShrink: 0 }}>
              <span
                style={{
                  fontFamily: "'IBM Plex Mono',monospace",
                  fontSize: 9,
                  fontWeight: 600,
                  color: "#fff",
                  background: entry.completenessScore >= 80 ? "#2E7D32" : entry.completenessScore >= 50 ? "#B8860B" : colors.textMuted,
                  padding: "2px 6px",
                  borderRadius: 3,
                }}
              >
                {entry.completenessScore}%
              </span>
              <span
                role="button"
                tabIndex={0}
                aria-label={`Delete scan for ${entry.target}`}
                onClick={(e) => handleDelete(entry.id, e)}
                onKeyDown={(e) => { if (e.key === "Enter") handleDelete(entry.id, e); }}
                style={{
                  fontFamily: "'IBM Plex Mono',monospace",
                  fontSize: 14,
                  color: colors.textMuted,
                  cursor: "pointer",
                  lineHeight: 1,
                  padding: "0 2px",
                }}
              >
                ×
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
