"use client";

import { useState, useRef, useEffect } from "react";
import { BIOS_LINES } from "../constants";

export function BootScreen({ onComplete }: { onComplete: () => void }) {
  const [stage, setStage] = useState<"bios" | "loading">("bios");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    stageTimeoutRef.current = setTimeout(() => setStage("loading"), 3000);
    timeoutRef.current = setTimeout(() => {
      sessionStorage.setItem("fishposts-booted", "1");
      onCompleteRef.current();
    }, 7000);
    return () => {
      if (stageTimeoutRef.current) clearTimeout(stageTimeoutRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleSkip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (stageTimeoutRef.current) clearTimeout(stageTimeoutRef.current);
    sessionStorage.setItem("fishposts-booted", "1");
    onComplete();
  };

  return (
    <div className="boot-screen" onClick={handleSkip}>
      {stage === "bios" ? (
        <div className="boot-bios">
          {BIOS_LINES.map((line, i) => (
            <div
              key={i}
              className={`boot-line ${line.includes("[OK]") || line.includes(" OK") ? "boot-line-ok" : ""}`}
              style={{ animationDelay: `${i * 0.15}s` }}
            >
              {line || "\u00A0"}
            </div>
          ))}
        </div>
      ) : (
        <div className="boot-loading">
          <div className="boot-logo">{"\uD83D\uDC1F"}</div>
          <div className="boot-title">FishPosts 98</div>
          <div className="boot-subtitle">Loading your memes...</div>
          <div className="boot-progress-bar">
            <div className="boot-progress-fill" />
          </div>
        </div>
      )}
      <div className="boot-skip">Click anywhere to skip</div>
    </div>
  );
}
