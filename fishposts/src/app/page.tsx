"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { MODE_INFO, type ContentMode } from "@/lib/prompts";

import type { AppState, WindowId, WindowState, ScreenPhase, ProgressEvent } from "./types";
import {
  FISH_LOGS,
  STATUS_MESSAGES,
  EXAMPLE_URLS,
  STEPS,
  FISH_FACTS,
  SPARKLE_CHARS,
  NEON_COLORS,
  SPARKLE_BURST,
  MODE_FLAVOR,
  MEME_MODES,
} from "./constants";

import { BootScreen } from "./components/BootScreen";
import { LoginScreen } from "./components/LoginScreen";
import { Win98Window } from "./components/Win98Window";
import { StartMenu } from "./components/StartMenu";
import { Taskbar } from "./components/Taskbar";
import { Marquee } from "./components/Marquee";
import { TextCardResult } from "./components/TextCardResult";
import { IconCopy, IconDownload, IconRefresh } from "./components/Icons";
import { Win98ErrorBoundary } from "./components/ErrorBoundary";

/* ================================================================
   MAIN COMPONENT
   ================================================================ */

export default function Home() {
  /* ---- Screen phase (boot → login → desktop) ---- */
  const [screenPhase, setScreenPhase] = useState<ScreenPhase>("booting");
  const [crtEnabled, setCrtEnabled] = useState(false);
  const [memeMethod, setMemeMethod] = useState<"api" | "tinyfish">("api");
  const [showFullscreenHint, setShowFullscreenHint] = useState(false);

  /* ---- App state ---- */
  const [activeMode, setActiveMode] = useState<ContentMode>("site_roast");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [state, setState] = useState<AppState>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [memeUrl, setMemeUrl] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [textContent, setTextContent] = useState<string[]>([]);
  const [textTitle, setTextTitle] = useState<string | undefined>();
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const [fishLogs, setFishLogs] = useState<string[]>([]);
  const [factIdx, setFactIdx] = useState(0);
  const [memeCount, setMemeCount] = useState(0);
  const [recentMemes, setRecentMemes] = useState<string[]>([]);
  const [startMenuOpen, setStartMenuOpen] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const logRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const stateRef = useRef<AppState>("idle");
  const logIdx = useRef(0);

  /* ---- Window management state ---- */
  const [windows, setWindows] = useState<Record<WindowId, WindowState>>({
    fishposts: { x: 0, y: 0, zIndex: 2, minimized: false, maximized: false },
    recent_memes: { x: 0, y: 0, zIndex: 1, minimized: false, maximized: false },
  });
  const [topZ, setTopZ] = useState(2);
  const [isDesktop, setIsDesktop] = useState(false);
  const dragRef = useRef<{
    windowId: WindowId;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  /* ---- Helpers ---- */

  const setAppState = useCallback((s: AppState) => {
    stateRef.current = s;
    setState(s);
  }, []);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (logRef.current) {
      clearInterval(logRef.current);
      logRef.current = null;
    }
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  useEffect(() => cleanup, [cleanup]);

  /* ---- Boot / CRT initialization ---- */
  useEffect(() => {
    if (sessionStorage.getItem("fishposts-booted")) {
      setScreenPhase("desktop");
    }
    if (localStorage.getItem("fishposts-crt") === "1") {
      setCrtEnabled(true);
    }
    if (localStorage.getItem("fishposts-meme-method") === "tinyfish") {
      setMemeMethod("tinyfish");
    }
  }, []);

  const toggleCrt = useCallback(() => {
    setCrtEnabled((prev) => {
      const next = !prev;
      localStorage.setItem("fishposts-crt", next ? "1" : "0");
      return next;
    });
  }, []);

  const toggleMemeMethod = useCallback(() => {
    setMemeMethod((prev) => {
      const next = prev === "api" ? "tinyfish" : "api";
      localStorage.setItem("fishposts-meme-method", next);
      return next;
    });
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  }, []);

  /* ---- isDesktop media query ---- */
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    setIsDesktop(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  /* ---- Calculate initial window positions when entering desktop mode ---- */
  useEffect(() => {
    if (isDesktop) {
      const vw = window.innerWidth;
      const contentWidth = Math.min(1100, vw - 48);
      const offsetX = (vw - contentWidth) / 2;

      setWindows((prev) => ({
        recent_memes: {
          ...prev.recent_memes,
          x: offsetX,
          y: 60,
          minimized: false,
        },
        fishposts: {
          ...prev.fishposts,
          x: offsetX + 380 + 16,
          y: 60,
          minimized: false,
        },
      }));
    }
  }, [isDesktop]);

  /* ---- Rotating fish facts ---- */
  useEffect(() => {
    const interval = setInterval(() => {
      setFactIdx((prev) => (prev + 1) % FISH_FACTS.length);
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  /* ---- Meme counter + recent memes from localStorage ---- */
  useEffect(() => {
    const saved = localStorage.getItem("fishposts-count");
    if (saved) setMemeCount(parseInt(saved, 10) || 0);
    try {
      const memes = JSON.parse(
        localStorage.getItem("fishposts-recent") || "[]"
      );
      if (Array.isArray(memes)) setRecentMemes(memes.slice(0, 6));
    } catch {
      /* ignore */
    }
  }, []);

  /* ---- Mouse sparkle trail ---- */
  useEffect(() => {
    let lastSparkle = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastSparkle < 80) return;
      lastSparkle = now;

      const spark = document.createElement("span");
      spark.className = "sparkle";
      spark.textContent =
        SPARKLE_CHARS[Math.floor(Math.random() * SPARKLE_CHARS.length)];
      spark.style.left = e.clientX + "px";
      spark.style.top = e.clientY + "px";
      spark.style.color =
        NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)];
      document.body.appendChild(spark);
      setTimeout(() => spark.remove(), 600);
    };

    document.addEventListener("mousemove", handleMouseMove);
    return () => document.removeEventListener("mousemove", handleMouseMove);
  }, []);

  /* ================================================================
     WINDOW MANAGEMENT — Drag, Focus, Minimize, Maximize
     ================================================================ */

  const bringToFront = useCallback((windowId: WindowId) => {
    setTopZ((prev) => {
      const newZ = prev + 1;
      setWindows((w) => ({
        ...w,
        [windowId]: { ...w[windowId], zIndex: newZ },
      }));
      return newZ;
    });
  }, []);

  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!dragRef.current) return;
    const { windowId, startX, startY, origX, origY } = dragRef.current;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    const newX = origX + dx;
    const newY = origY + dy;

    const clampedX = Math.max(-400, Math.min(window.innerWidth - 100, newX));
    const clampedY = Math.max(0, Math.min(window.innerHeight - 50, newY));

    setWindows((prev) => ({
      ...prev,
      [windowId]: {
        ...prev[windowId],
        x: clampedX,
        y: clampedY,
      },
    }));
  }, []);

  const handleDragEnd = useCallback(() => {
    dragRef.current = null;
    document.removeEventListener("mousemove", handleDragMove);
    document.removeEventListener("mouseup", handleDragEnd);
  }, [handleDragMove]);

  const handleDragStart = useCallback(
    (windowId: WindowId) => (e: React.MouseEvent) => {
      if (!isDesktop) return;
      const ws = windows[windowId];
      if (ws.maximized) return;
      e.preventDefault();
      dragRef.current = {
        windowId,
        startX: e.clientX,
        startY: e.clientY,
        origX: ws.x,
        origY: ws.y,
      };

      bringToFront(windowId);
      document.addEventListener("mousemove", handleDragMove);
      document.addEventListener("mouseup", handleDragEnd);
    },
    [isDesktop, windows, bringToFront, handleDragMove, handleDragEnd]
  );

  const handleMinimize = useCallback((windowId: WindowId) => {
    setWindows((prev) => ({
      ...prev,
      [windowId]: { ...prev[windowId], minimized: true },
    }));
  }, []);

  const handleMaximize = useCallback((windowId: WindowId) => {
    if (!isDesktop) return;
    setWindows((prev) => {
      const ws = prev[windowId];
      if (ws.maximized) {
        return {
          ...prev,
          [windowId]: {
            ...ws,
            maximized: false,
            x: ws.preMaxPos?.x ?? ws.x,
            y: ws.preMaxPos?.y ?? ws.y,
            preMaxPos: undefined,
          },
        };
      }
      return {
        ...prev,
        [windowId]: {
          ...ws,
          maximized: true,
          preMaxPos: { x: ws.x, y: ws.y },
        },
      };
    });
    bringToFront(windowId);
  }, [isDesktop, bringToFront]);

  const handleWindowFocus = useCallback(
    (windowId: WindowId) => {
      if (windows[windowId].zIndex !== topZ) {
        bringToFront(windowId);
      }
    },
    [windows, topZ, bringToFront]
  );

  const handleTaskbarWindowClick = useCallback(
    (id: WindowId) => {
      const ws = windows[id];
      if (ws.minimized) {
        setWindows((prev) => ({
          ...prev,
          [id]: { ...prev[id], minimized: false },
        }));
        bringToFront(id);
      } else if (ws.zIndex === topZ) {
        setWindows((prev) => ({
          ...prev,
          [id]: { ...prev[id], minimized: true },
        }));
      } else {
        bringToFront(id);
      }
    },
    [windows, topZ, bringToFront]
  );

  /* ================================================================
     GENERATE HANDLER
     ================================================================ */

  const isMemeMode = MEME_MODES.includes(activeMode);
  const flavor = MODE_FLAVOR[activeMode];
  const canGenerate =
    flavor.inputType === "none"
      ? true
      : flavor.inputType === "url"
        ? url.trim().length > 0
        : text.trim().length > 0;

  const handleGenerate = async () => {
    if (!canGenerate) return;
    cleanup();
    setAppState("generating");
    setMemeUrl("");
    setPageUrl("");
    setTextContent([]);
    setTextTitle(undefined);
    setErrorMsg("");
    setCopied(false);
    setProgress(0);
    setStatusMessage(STATUS_MESSAGES[0]);
    logIdx.current = 0;
    setFishLogs([FISH_LOGS[0]]);

    setStartMenuOpen(false);

    const startTime = Date.now();
    const statusIdx = { current: 0 };

    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const pct = Math.min(92, (1 - Math.exp(-elapsed / 80)) * 100);
      setProgress((prev) => Math.max(prev, pct));
      let idx = 0;
      if (elapsed > 120) idx = 4;
      else if (elapsed > 90) idx = 3;
      else if (elapsed > 45) idx = 2;
      else if (elapsed > 20) idx = 1;
      if (idx !== statusIdx.current) {
        statusIdx.current = idx;
        setStatusMessage(STATUS_MESSAGES[idx]);
      }
    }, 500);

    logRef.current = setInterval(() => {
      logIdx.current = Math.min(logIdx.current + 1, FISH_LOGS.length - 1);
      setFishLogs((prev) =>
        [...prev, FISH_LOGS[logIdx.current]].slice(-6)
      );
    }, 10000);

    const controller = new AbortController();
    abortRef.current = controller;

    const body: Record<string, string> = { mode: activeMode, memeMethod };
    if (flavor.inputType === "url") {
      body.url = url.trim();
    } else if (flavor.inputType === "text") {
      body.text = text.trim();
    }

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Server error: ${res.status}`);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No response stream");

      let buffer = "";
      let gotFinal = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event: ProgressEvent = JSON.parse(line.slice(6));
            if (event.type === "progress") {
              if (event.message) setStatusMessage(event.message);
              if (event.percent)
                setProgress((prev) => Math.max(prev, event.percent!));
            } else if (event.type === "done") {
              gotFinal = true;
              cleanup();
              setProgress(100);

              if (event.memeUrl) {
                setMemeUrl(event.memeUrl);
                if (event.pageUrl) setPageUrl(event.pageUrl);
                setMemeCount((prev) => {
                  const next = prev + 1;
                  localStorage.setItem("fishposts-count", String(next));
                  return next;
                });
                setRecentMemes((prev) => {
                  const updated = [
                    event.memeUrl!,
                    ...prev.filter((u) => u !== event.memeUrl),
                  ].slice(0, 6);
                  localStorage.setItem(
                    "fishposts-recent",
                    JSON.stringify(updated)
                  );
                  return updated;
                });
              } else if (event.textContent) {
                setTextContent(event.textContent);
                if (event.textTitle) setTextTitle(event.textTitle);
              }

              setAppState("done");
            } else if (event.type === "error") {
              gotFinal = true;
              cleanup();
              setErrorMsg(event.error || "Something went wrong");
              setAppState("error");
            }
          } catch {
            /* skip malformed SSE */
          }
        }
      }

      if (!gotFinal && stateRef.current === "generating") {
        cleanup();
        setErrorMsg("Connection lost. Try again.");
        setAppState("error");
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      cleanup();
      setErrorMsg(
        err instanceof Error ? err.message : "Something went wrong"
      );
      setAppState("error");
    }
  };

  /* ---- Action handlers ---- */

  const handleCopy = async () => {
    const u = pageUrl || memeUrl;
    if (!u) return;
    try {
      await navigator.clipboard.writeText(u);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard API denied — ignore */
    }
  };

  const handleDownload = () => {
    if (!memeUrl) return;
    const a = document.createElement("a");
    a.href = `/api/download?url=${encodeURIComponent(memeUrl)}`;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleReset = () => {
    cleanup();
    setAppState("idle");
    setMemeUrl("");
    setPageUrl("");
    setTextContent([]);
    setTextTitle(undefined);
    setErrorMsg("");
    setProgress(0);
    setFishLogs([]);
  };

  const handleDesktopIconClick = (exUrl: string) => {
    setActiveMode("site_roast");
    setUrl(exUrl);
    handleReset();
  };

  const handleModeSelect = (mode: ContentMode) => {
    setActiveMode(mode);
    if (state !== "generating") {
      handleReset();
    }
    setWindows((prev) => ({
      ...prev,
      fishposts: { ...prev.fishposts, minimized: false },
    }));
    bringToFront("fishposts");
  };

  /* ---- Current mode info ---- */
  const modeInfo = MODE_INFO[activeMode];

  /* ================================================================
     RENDER
     ================================================================ */

  return (
    <Win98ErrorBoundary>
    <div className={crtEnabled ? "crt-active" : undefined}>
      {screenPhase === "booting" && (
        <BootScreen onComplete={() => setScreenPhase("login")} />
      )}
      {screenPhase === "login" && (
        <LoginScreen
          onEnter={() => {
            setScreenPhase("desktop");
            if (!sessionStorage.getItem("fishposts-fs-hint-shown")) {
              setShowFullscreenHint(true);
              sessionStorage.setItem("fishposts-fs-hint-shown", "1");
            }
          }}
        />
      )}
      {screenPhase === "desktop" && (
    <div className="desktop">
      <Marquee />

      {/* Desktop icons */}
      <div className="desktop-icons" aria-hidden="true">
        {EXAMPLE_URLS.map((ex) => (
          <button
            key={ex.url}
            className="desktop-icon"
            onClick={() => handleDesktopIconClick(ex.url)}
            title={ex.url}
          >
            <span className="desktop-icon-img">{ex.icon}</span>
            <span className="desktop-icon-label">{ex.label}</span>
          </button>
        ))}
      </div>

      {/* Two-window content area */}
      <div className="desktop-content">
        {/* LEFT WINDOW: recent_memes.exe */}
        <Win98Window
          title="recent_memes.exe"
          className="win-window-side"
          windowState={windows.recent_memes}
          isDesktop={isDesktop}
          onMinimize={() => handleMinimize("recent_memes")}
          onMaximize={() => handleMaximize("recent_memes")}
          onClose={() => handleMinimize("recent_memes")}
          onFocus={() => handleWindowFocus("recent_memes")}
          onDragStart={handleDragStart("recent_memes")}
          statusBar={
            <div className="win-statusbar" key={factIdx}>
              {FISH_FACTS[factIdx].emoji} {FISH_FACTS[factIdx].fact}
            </div>
          }
        >
          <div className="win-section-label">How it works:</div>
          <div className="win-steps">
            {STEPS.map((step) => (
              <div key={step.num} className="win-step">
                <div className="win-step-num">{step.emoji}</div>
                <div className="win-step-text">
                  <strong>{step.title}</strong>
                  <span>{step.desc}</span>
                </div>
              </div>
            ))}
          </div>

          <hr className="hr98" />

          <div className="win-section-label">
            Recent memes ({recentMemes.length}/6):
          </div>
          {recentMemes.length > 0 ? (
            <div className="recent-memes-grid">
              {recentMemes.map((meme, i) => (
                <a
                  key={`${meme}-${i}`}
                  href={meme}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="recent-meme-item"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={meme}
                    alt={`Meme ${i + 1}`}
                    loading="lazy"
                    onError={(e) => {
                      const el = (e.target as HTMLImageElement).parentElement;
                      if (el) (el as HTMLElement).style.display = "none";
                    }}
                  />
                </a>
              ))}
            </div>
          ) : (
            <div className="recent-memes-empty">
              No files found. Generate your first meme!
            </div>
          )}
        </Win98Window>

        {/* RIGHT WINDOW: fishposts.exe (main) */}
        <Win98Window
          title={modeInfo.exe}
          className="win-window-main"
          windowState={windows.fishposts}
          isDesktop={isDesktop}
          onMinimize={() => handleMinimize("fishposts")}
          onMaximize={() => handleMaximize("fishposts")}
          onClose={() => handleMinimize("fishposts")}
          onFocus={() => handleWindowFocus("fishposts")}
          onDragStart={handleDragStart("fishposts")}
        >
          {/* ---- IDLE STATE ---- */}
          {state === "idle" && (
            <div className="state-enter">
              <h1 className="impact headline">
                {modeInfo.icon} {modeInfo.label.toUpperCase()}
              </h1>
              <p className="subhead">{flavor.tagline}</p>

              <div className="win-tab-body">
                {flavor.inputType === "url" && (
                  <>
                    <div style={{ marginBottom: 10 }}>
                      <label className="input-label" htmlFor="url-input">
                        {activeMode === "fish_dispatches"
                          ? "Where should the fish go?"
                          : "Target URL:"}
                      </label>
                      <input
                        id="url-input"
                        type="url"
                        className="win-input"
                        placeholder={flavor.placeholder}
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleGenerate();
                        }}
                      />
                    </div>
                    {activeMode === "site_roast" && (
                      <div className="examples">
                        <span>or try: </span>
                        {EXAMPLE_URLS.map((ex, i) => (
                          <span key={ex.url}>
                            <a
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                setUrl(ex.url);
                              }}
                            >
                              {ex.label}
                            </a>
                            {i < EXAMPLE_URLS.length - 1 && " \u00B7 "}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {flavor.inputType === "text" && (
                  <div>
                    <label className="input-label" htmlFor="text-input">
                      {activeMode === "unhinged_threads"
                        ? "Topic:"
                        : activeMode === "chaos_mode"
                          ? "Input:"
                          : "The take:"}
                    </label>
                    <textarea
                      id="text-input"
                      className="win-input win-textarea"
                      placeholder={flavor.placeholder}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      rows={4}
                    />
                  </div>
                )}

                {flavor.inputType === "none" && (
                  <div className="trend-roast-idle">
                    <p className="trend-roast-desc">
                      No input needed. The fish will browse Hacker News, find
                      something worth making fun of, and come back with a meme.
                    </p>
                  </div>
                )}
              </div>

              <button
                className="win98-btn win98-btn-full"
                onClick={handleGenerate}
                disabled={!canGenerate}
              >
                {activeMode === "trend_roast"
                  ? `${modeInfo.icon} FIND A TREND`
                  : activeMode === "chaos_mode"
                    ? `${modeInfo.icon} CHAOS`
                    : `\u25BA MEME ME \u25C4`}
              </button>
            </div>
          )}

          {/* ---- GENERATING STATE ---- */}
          {state === "generating" && (
            <div className="state-enter">
              <div className="terminal">
                {fishLogs.map((log, i) => (
                  <div
                    key={`${i}-${log}`}
                    className={`term-line ${
                      i === fishLogs.length - 1 ? "active" : ""
                    }`}
                  >
                    {log}
                    {i === fishLogs.length - 1 && (
                      <span className="cursor-blink" />
                    )}
                  </div>
                ))}
              </div>

              <div className="progress-wrap">
                <div className="progress-label">
                  {statusMessage} {Math.round(progress)}%
                </div>
                <div className="win-progress">
                  <div
                    className="win-progress-fill"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <p className="wait-text">
                please wait... the fish is literally browsing the internet rn{" "}
                {"\uD83D\uDC1F"}
              </p>
            </div>
          )}

          {/* ---- DONE STATE ---- */}
          {state === "done" && (memeUrl || textContent.length > 0) && (
            <div className="pop-in" style={{ position: "relative" }}>
              <div className="sparkle-burst" aria-hidden="true">
                {SPARKLE_BURST.map((s, i) => (
                  <span
                    key={i}
                    className="sparkle-piece"
                    style={{
                      left: s.left,
                      color: s.color,
                      animationDelay: s.delay,
                      animationDuration: s.duration,
                    }}
                  >
                    {s.char}
                  </span>
                ))}
              </div>

              <h2 className="result-title">
                {"\uD83D\uDC1F"}{" "}
                {memeUrl ? "YOUR MEME IS READY" : "CONTENT SERVED"}
              </h2>

              {/* Meme result */}
              {memeUrl && (
                <>
                  <div className="meme-frame">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={memeUrl}
                      alt="Generated meme"
                      onError={() => {
                        setErrorMsg("Could not load meme image");
                        setAppState("error");
                      }}
                    />
                  </div>

                  <div className="btn-group">
                    <button className="win98-btn win98-btn-sm" onClick={handleCopy}>
                      <IconCopy /> {copied ? "Copied!" : "Copy Link"}
                    </button>
                    <button
                      className="win98-btn win98-btn-sm"
                      onClick={handleDownload}
                    >
                      <IconDownload /> Save
                    </button>
                    <button
                      className="win98-btn win98-btn-sm"
                      onClick={handleReset}
                    >
                      <IconRefresh /> Make Another
                    </button>
                  </div>

                  {pageUrl && (
                    <p style={{ textAlign: "center", marginTop: 8 }}>
                      <a
                        href={pageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="win-link"
                        style={{ fontSize: 11 }}
                      >
                        {"View on Imgflip \u2192"}
                      </a>
                    </p>
                  )}
                </>
              )}

              {/* Text card result */}
              {!memeUrl && textContent.length > 0 && (
                <>
                  <TextCardResult
                    lines={textContent}
                    title={textTitle}
                    mode={activeMode}
                  />
                  <div className="btn-group" style={{ marginTop: 12 }}>
                    <button
                      className="win98-btn win98-btn-sm"
                      onClick={handleReset}
                    >
                      <IconRefresh /> Make Another
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ---- ERROR STATE ---- */}
          {state === "error" && (
            <div className="pop-in">
              <div className="error-row">
                <div className="error-icon">{"\u26A0\uFE0F"}</div>
                <div className="error-text">
                  <strong>{modeInfo.exe} has encountered an error.</strong>
                  <br />
                  <br />
                  {errorMsg || "Something went wrong"}
                  <br />
                  <br />
                  Try a different input, or just try again.
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <button className="win98-btn" onClick={handleReset}>
                  OK
                </button>
              </div>
            </div>
          )}
        </Win98Window>
      </div>

      {/* Footer */}
      <div className="footer-98">
        <div className="hit-counter">visitors: 042069</div>
        <br />
        powered by{" "}
        <a href="https://tinyfish.ai" target="_blank" rel="noopener noreferrer">
          tinyfish.ai
        </a>{" "}
        {"\uD83D\uDC1F"} {"\u2014"} a literal fish that browses the internet
        <div className="construction">
          {"\uD83D\uDEA7"} always under construction {"\uD83D\uDEA7"}
        </div>
        <div className="netscape">
          best viewed in netscape navigator 4.0 at 800{"\u00D7"}600
        </div>
      </div>

      {/* Start Menu (rendered above taskbar) */}
      <StartMenu
        isOpen={startMenuOpen}
        activeMode={activeMode}
        onSelectMode={handleModeSelect}
        onClose={() => setStartMenuOpen(false)}
      />

      <Taskbar
        memeCount={memeCount}
        windows={windows}
        topZ={topZ}
        activeMode={activeMode}
        startMenuOpen={startMenuOpen}
        onStartClick={() => setStartMenuOpen((prev) => !prev)}
        onWindowClick={handleTaskbarWindowClick}
        crtEnabled={crtEnabled}
        onCrtToggle={toggleCrt}
        onFullscreenToggle={toggleFullscreen}
        memeMethod={memeMethod}
        onMemeMethodToggle={toggleMemeMethod}
        isMemeMode={isMemeMode}
      />

      {showFullscreenHint && (
        <div
          className="fs-hint"
          onClick={() => setShowFullscreenHint(false)}
          onAnimationEnd={() => setShowFullscreenHint(false)}
        >
          For the best experience, press F11 for fullscreen {"\uD83D\uDDA5\uFE0F"}
        </div>
      )}
    </div>
      )}
    </div>
    </Win98ErrorBoundary>
  );
}
