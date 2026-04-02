"use client";

import { useRef, useEffect } from "react";
import { MODE_INFO, type ContentMode } from "@/lib/prompts";
import { MEME_MODES, TEXT_MODES, MODE_DESC } from "../constants";

export function StartMenu({
  isOpen,
  activeMode,
  onSelectMode,
  onClose,
}: {
  isOpen: boolean;
  activeMode: ContentMode;
  onSelectMode: (mode: ContentMode) => void;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        !target.closest(".start-btn")
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const renderModeItem = (mode: ContentMode) => {
    const info = MODE_INFO[mode];
    return (
      <button
        key={mode}
        className={`start-menu-item ${mode === activeMode ? "start-menu-item-active" : ""}`}
        onClick={() => {
          onSelectMode(mode);
          onClose();
        }}
      >
        <span className="start-menu-icon">{info.icon}</span>
        <span className="start-menu-label-wrap">
          <span className="start-menu-label">{info.label}</span>
          <span className="start-menu-desc">{MODE_DESC[mode]}</span>
        </span>
      </button>
    );
  };

  return (
    <div className="start-menu" ref={menuRef}>
      <div className="start-menu-sidebar">
        <span className="start-menu-sidebar-text">FishPosts 98</span>
      </div>
      <div className="start-menu-content">
        <div className="start-menu-header">
          <div className="start-menu-header-avatar">{"\uD83D\uDC1F"}</div>
          <div className="start-menu-header-info">
            <div className="start-menu-header-name">FishPosts</div>
            <div className="start-menu-header-role">AI Meme Generator</div>
          </div>
        </div>
        <div className="start-menu-divider" />

        <div className="start-menu-items">
          <div className="start-menu-section-header">
            <span className="start-menu-section-icon">{"\uD83D\uDDBC\uFE0F"}</span>
            Meme Generators
          </div>
          {MEME_MODES.map(renderModeItem)}
          <div className="start-menu-divider" />
          <div className="start-menu-section-header">
            <span className="start-menu-section-icon">{"\uD83D\uDCDD"}</span>
            Text Generators
          </div>
          {TEXT_MODES.map(renderModeItem)}
        </div>

        <div className="start-menu-divider" />
        <div className="start-menu-footer">
          <div className="start-menu-item start-menu-item-disabled">
            <span className="start-menu-icon">{"\u2699\uFE0F"}</span>
            <span className="start-menu-label-wrap">
              <span className="start-menu-label">Settings</span>
              <span className="start-menu-desc">coming soon</span>
            </span>
          </div>
          <button
            className="start-menu-item"
            onClick={() => {
              onClose();
              sessionStorage.removeItem("fishposts-booted");
              sessionStorage.removeItem("fishposts-fs-hint-shown");
              window.location.reload();
            }}
          >
            <span className="start-menu-icon">{"\uD83D\uDD04"}</span>
            <span className="start-menu-label-wrap">
              <span className="start-menu-label">Restart</span>
              <span className="start-menu-desc">reboot FishPosts</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
