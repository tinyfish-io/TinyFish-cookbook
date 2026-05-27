"use client";

import type { WindowState } from "../types";

export function Win98Window({
  title,
  children,
  className,
  statusBar,
  windowState,
  isDesktop,
  onMinimize,
  onMaximize,
  onClose,
  onFocus,
  onDragStart,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  statusBar?: React.ReactNode;
  windowState: WindowState;
  isDesktop: boolean;
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
  onFocus: () => void;
  onDragStart: (e: React.MouseEvent) => void;
}) {
  const maximizedStyle: React.CSSProperties | undefined =
    isDesktop && windowState.maximized
      ? {
          position: "absolute",
          left: 0,
          top: 0,
          width: "100%",
          height: "calc(100vh - 42px)",
          zIndex: windowState.zIndex,
        }
      : isDesktop
        ? {
            position: "absolute",
            left: windowState.x,
            top: windowState.y,
            zIndex: windowState.zIndex,
          }
        : undefined;

  return (
    <div
      className={`win-window ${className || ""} ${windowState.minimized ? "win-window-minimized" : ""} ${windowState.maximized ? "win-window-maximized" : ""}`}
      style={maximizedStyle}
      onMouseDown={onFocus}
    >
      <div
        className={`win-titlebar ${isDesktop && !windowState.maximized ? "win-titlebar-draggable" : ""}`}
        onMouseDown={(e) => {
          if (!(e.target as HTMLElement).closest(".win-buttons")) {
            onDragStart(e);
          }
        }}
        onDoubleClick={(e) => {
          if (isDesktop && !(e.target as HTMLElement).closest(".win-buttons")) {
            onMaximize();
          }
        }}
      >
        <div className="win-title">
          <span>{"\uD83D\uDC1F"}</span> {title}
        </div>
        <div className="win-buttons">
          <button
            className="win-btn"
            aria-label="Minimize"
            onClick={(e) => {
              e.stopPropagation();
              onMinimize();
            }}
          >
            _
          </button>
          <button
            className="win-btn"
            aria-label="Maximize"
            onClick={(e) => {
              e.stopPropagation();
              onMaximize();
            }}
          >
            {windowState.maximized ? "\u2750" : "\u25A1"}
          </button>
          <button
            className="win-btn"
            aria-label="Close"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            {"\u00D7"}
          </button>
        </div>
      </div>
      {!windowState.minimized && (
        <>
          <div className="win-body">{children}</div>
          {statusBar && <>{statusBar}</>}
        </>
      )}
    </div>
  );
}
