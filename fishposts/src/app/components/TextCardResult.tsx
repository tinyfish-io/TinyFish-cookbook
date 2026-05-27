"use client";

import { useState } from "react";
import { MODE_INFO, type ContentMode } from "@/lib/prompts";
import { IconDownload } from "./Icons";

export function TextCardResult({
  lines,
  title,
  mode,
}: {
  lines: string[];
  title?: string;
  mode: ContentMode;
}) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const handleSaveAsImage = async () => {
    setSaving(true);
    setSaveError(false);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch("/api/render-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, content: lines, title }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) throw new Error("Failed to render card");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fishposts-${mode}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      clearTimeout(timeout);
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  if (mode === "excuse_gen") {
    return (
      <div className="excuse-dialog">
        <div className="excuse-dialog-titlebar">
          <span>{"\u26A0\uFE0F"} excuse_gen.exe</span>
          <span className="excuse-dialog-close">{"\u00D7"}</span>
        </div>
        <div className="excuse-dialog-body">
          <div className="excuse-dialog-icon">{"\u26A0\uFE0F"}</div>
          <div className="excuse-dialog-content">
            {title && <div className="excuse-dialog-situation">{title}</div>}
            <div className="excuse-dialog-excuse">{lines[0] || "Error: no excuse generated."}</div>
          </div>
        </div>
        <div className="excuse-dialog-footer">
          <button className="excuse-dialog-btn">OK</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
          <button
            className="win98-btn win98-btn-sm"
            onClick={handleSaveAsImage}
            disabled={saving}
          >
            <IconDownload /> {saving ? "Saving..." : "Save as Image"}
          </button>
          {saveError && (
            <span style={{ color: "#ff4444", fontSize: 12 }}>
              Failed — try again
            </span>
          )}
        </div>
      </div>
    );
  }

  const modeEmojis: Record<string, string[]> = {
    quote_dunks: ["\uD83D\uDDE1\uFE0F", "\uD83D\uDD25", "\uD83D\uDCA3"],
    fish_dispatches: ["\uD83D\uDC1F", "\uD83D\uDC1F", "\uD83D\uDC1F", "\uD83D\uDC1F", "\uD83D\uDC1F"],
    unhinged_threads: ["\uD83E\uDDF5", "\uD83E\uDDF5", "\uD83E\uDDF5", "\uD83E\uDDF5", "\uD83E\uDDF5"],
    corporate_bs: ["\uD83D\uDCBC", "\uD83D\uDCBC", "\uD83D\uDCBC", "\uD83D\uDCBC", "\uD83D\uDCBC"],
  };
  const emojis = modeEmojis[mode] || [];

  return (
    <div className="text-card" data-mode={mode}>
      {title && (
        <div className="text-card-header">
          <span className="text-card-header-icon">{MODE_INFO[mode]?.icon || "\uD83D\uDC1F"}</span>
          <span className="text-card-title">{title}</span>
        </div>
      )}
      <div className="text-card-lines">
        {lines.map((line, i) => (
          <div key={i} className="text-card-line" style={{ animationDelay: `${i * 0.1}s` }}>
            <span className="text-card-badge">{emojis[i] || `${i + 1}`}</span>
            <span className="text-card-text">{line}</span>
          </div>
        ))}
      </div>
      <div className="text-card-footer">
        <span className="text-card-watermark">{"\uD83D\uDC1F"} fishposts.exe</span>
        <button
          className="win98-btn win98-btn-sm"
          onClick={handleSaveAsImage}
          disabled={saving}
        >
          <IconDownload /> {saving ? "Saving..." : "Save as Image"}
        </button>
        {saveError && (
          <span style={{ color: "#ff4444", fontSize: 12 }}>
            Failed — try again
          </span>
        )}
      </div>
    </div>
  );
}
