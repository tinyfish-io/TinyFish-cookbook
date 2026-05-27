"use client";

import { useState, useEffect } from "react";
import { MODE_INFO, type ContentMode } from "@/lib/prompts";
import type { WindowId, WindowState } from "../types";

export function Taskbar({
  memeCount,
  windows,
  topZ,
  activeMode,
  startMenuOpen,
  onStartClick,
  onWindowClick,
  crtEnabled,
  onCrtToggle,
  onFullscreenToggle,
  memeMethod,
  onMemeMethodToggle,
  isMemeMode,
}: {
  memeCount: number;
  windows: Record<WindowId, WindowState>;
  topZ: number;
  activeMode: ContentMode;
  startMenuOpen: boolean;
  onStartClick: () => void;
  onWindowClick: (id: WindowId) => void;
  crtEnabled: boolean;
  onCrtToggle: () => void;
  onFullscreenToggle: () => void;
  memeMethod: "api" | "tinyfish";
  onMemeMethodToggle: () => void;
  isMemeMode: boolean;
}) {
  const [time, setTime] = useState("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
      );
    };
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, []);

  const windowConfig: Record<WindowId, { title: string; icon: string }> = {
    fishposts: {
      title: MODE_INFO[activeMode].exe,
      icon: MODE_INFO[activeMode].icon,
    },
    recent_memes: { title: "recent_memes.exe", icon: "\uD83D\uDCC1" },
  };

  return (
    <div className="taskbar">
      <button
        className={`start-btn ${startMenuOpen ? "start-btn-pressed" : ""}`}
        onClick={onStartClick}
      >
        <span className="start-flag">{"\uD83E\uDE9F"}</span> Start
      </button>
      <div className="taskbar-windows">
        {(Object.keys(windowConfig) as WindowId[]).map((id) => (
          <button
            key={id}
            className={`taskbar-window-btn ${
              windows[id].zIndex === topZ && !windows[id].minimized
                ? "taskbar-window-active"
                : ""
            }`}
            onClick={() => onWindowClick(id)}
          >
            {windowConfig[id].icon} {windowConfig[id].title}
          </button>
        ))}
      </div>
      <div className="system-tray">
        {memeCount > 0 && (
          <span className="tray-item" title={`${memeCount} memes generated`}>
            {"\uD83D\uDD25"} {memeCount}
          </span>
        )}
        <button
          className={`tray-btn${!isMemeMode ? " tray-btn-dimmed" : ""}`}
          title={
            isMemeMode
              ? memeMethod === "api"
                ? "Meme: API (fast)"
                : "Meme: TinyFish (browser)"
              : "Only applies to meme modes"
          }
          onClick={isMemeMode ? onMemeMethodToggle : undefined}
          disabled={!isMemeMode}
        >
          {memeMethod === "api" ? "\u26A1" : "\uD83D\uDC1F"}
        </button>
        <button
          className="tray-btn"
          title={`CRT: ${crtEnabled ? "ON" : "OFF"}`}
          onClick={onCrtToggle}
        >
          {"\uD83D\uDDA5\uFE0F"}
        </button>
        <button
          className="tray-btn"
          title="Fullscreen (F11)"
          onClick={onFullscreenToggle}
        >
          {"\u26F6"}
        </button>
        <span className="tray-item">{"\uD83D\uDC1F"}</span>
        <span className="tray-clock">{time}</span>
      </div>
    </div>
  );
}
