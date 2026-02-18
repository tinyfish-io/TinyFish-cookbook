"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import ScoreCircle from "@/app/components/ScoreCircle";

// =============================================================================
// TYPES
// =============================================================================

interface TestInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface AuditEvent {
  testId: string;
  status: "queued" | "running" | "pass" | "fail" | "error";
  message: string;
  subscore?: number;
  data?: {
    passed?: string[];
    failed?: string[];
    issues?: string[];
    fixes?: string[];
    // Full audit result on completion
    score?: number;
    grade?: string;
    gradeColor?: string;
    tests?: Record<string, unknown>;
    topFixes?: string[];
    [key: string]: unknown;
  };
  timestamp: number;
}

interface TestState {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: "queued" | "running" | "pass" | "fail" | "error";
  message: string;
  subscore?: number;
  startedAt?: number;
  passed: string[];
  failed: string[];
  fixes: string[];
}

// =============================================================================
// ELAPSED TIMER COMPONENT
// =============================================================================

function ElapsedTimer({ startedAt }: { startedAt: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const display = elapsed >= 60
    ? `${Math.floor(elapsed / 60)}m ${String(elapsed % 60).padStart(2, "0")}s`
    : `${elapsed}s`;

  return (
    <span className="font-mono text-[10px] text-gray-500 ml-1.5">{display}</span>
  );
}

// =============================================================================
// TEST CARD COMPONENT
// =============================================================================

function TestCard({
  test,
  isExpanded,
  onToggle,
  index,
  justCompleted,
}: {
  test: TestState;
  isExpanded: boolean;
  onToggle: () => void;
  index: number;
  justCompleted: boolean;
}) {
  const statusConfig: Record<string, { color: string; bg: string; label: string; dot: string; borderColor: string }> = {
    queued:  { color: "#6B7280", bg: "rgba(31, 41, 55, 1)",        label: "Queued",        dot: "bg-gray-500",   borderColor: "#1F2937" },
    running: { color: "#00E5FF", bg: "rgba(0, 229, 255, 0.06)",    label: "Running...",    dot: "bg-cyan-400 pulse-dot", borderColor: "#00E5FF" },
    pass:    { color: "#00E676", bg: "rgba(0, 230, 118, 0.05)",    label: "Passed",        dot: "bg-green-400",  borderColor: "#00E676" },
    fail:    { color: "#FF1744", bg: "rgba(255, 23, 68, 0.05)",    label: "Issues Found",  dot: "bg-red-400",    borderColor: "#FF1744" },
    error:   { color: "#FF9100", bg: "rgba(255, 145, 0, 0.05)",    label: "Error",         dot: "bg-orange-400", borderColor: "#FF9100" },
  };

  const config = statusConfig[test.status];
  const flashColor = test.status === "pass"
    ? "rgba(0, 230, 118, 0.4)"
    : test.status === "fail"
      ? "rgba(255, 23, 68, 0.4)"
      : "rgba(255, 145, 0, 0.4)";

  return (
    <div
      className={`relative border rounded-lg overflow-hidden transition-all duration-500 animate-card-enter ${
        test.status === "running" ? "running-glow" : ""
      } ${justCompleted ? "status-flash" : ""}`}
      style={{
        borderColor: config.borderColor,
        backgroundColor: config.bg,
        animationDelay: `${index * 100}ms`,
        animationFillMode: "backwards",
        ["--flash-color" as string]: flashColor,
      }}
    >
      {/* Shimmer overlay when queued */}
      {test.status === "queued" && <div className="shimmer-overlay" />}

      {/* Scan animation when running */}
      {test.status === "running" && <div className="scan-overlay" />}

      {/* Card header */}
      <button
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className={`text-2xl ${test.status === "running" ? "animate-icon-pulse" : ""}`}>
            {test.icon}
          </span>
          <div>
            <div className="font-semibold text-white text-sm">{test.name}</div>
            <div className="text-xs text-gray-400">{test.description}</div>
            {test.status === "running" && test.message && (
              <div className="text-[11px] text-cyan-400/80 mt-0.5 truncate max-w-[280px]">
                {test.message}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {test.subscore !== undefined && (
            <span className="font-mono text-lg font-bold" style={{ color: config.color }}>
              {test.subscore}
            </span>
          )}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${config.dot} ${test.status === "queued" ? "animate-pulse" : ""}`} />
            <span className="text-xs font-medium" style={{ color: config.color }}>
              {config.label}
            </span>
            {test.status === "running" && test.startedAt && (
              <ElapsedTimer startedAt={test.startedAt} />
            )}
          </div>
        </div>
      </button>

      {/* Expanded details */}
      {isExpanded && (test.status === "pass" || test.status === "fail" || test.status === "error") && (
        <div className="px-5 pb-4 border-t border-gray-800 pt-3 space-y-3 animate-fade-in">
          {/* Summary message — always shown when available */}
          {test.message && (
            <div className="text-sm text-gray-300 pb-1">{test.message}</div>
          )}

          {test.passed.length > 0 && (
            <div>
              <div className="text-xs uppercase tracking-wider text-gray-500 mb-1.5">Passed</div>
              {test.passed.map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-green-400 py-0.5">
                  <span className="mt-0.5 shrink-0">✓</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          )}

          {test.failed.length > 0 && (
            <div>
              <div className="text-xs uppercase tracking-wider text-gray-500 mb-1.5">Failed</div>
              {test.failed.map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-red-400 py-0.5">
                  <span className="mt-0.5 shrink-0">✗</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          )}

          {test.fixes.length > 0 && (
            <div>
              <div className="text-xs uppercase tracking-wider text-gray-500 mb-1.5">How to Fix</div>
              {test.fixes.map((fix, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-amber-300 py-0.5">
                  <span className="mt-0.5 shrink-0">→</span>
                  <span>{fix}</span>
                </div>
              ))}
            </div>
          )}

          {/* Fallback when no structured data at all */}
          {test.passed.length === 0 && test.failed.length === 0 && test.fixes.length === 0 && !test.message && (
            <div className="text-sm text-gray-500 italic">No detailed results available for this test.</div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// LIVE BROWSER PREVIEW COMPONENT
// =============================================================================

interface ActivityEntry {
  testName: string;
  message: string;
  timestamp: number;
}

function LiveActivityFeed({ activities }: { activities: ActivityEntry[] }) {
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [activities]);

  return (
    <div className="border border-cyan-800/50 rounded-lg overflow-hidden bg-gray-900 animate-fade-in">
      <div className="px-4 py-2.5 bg-cyan-950/40 border-b border-cyan-800/30 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-cyan-400 pulse-dot" />
          <span className="text-xs font-medium text-cyan-300">
            Live Agent Activity
          </span>
        </div>
        <span className="text-[10px] text-gray-600 font-mono">powered by TinyFish</span>
      </div>

      <div ref={feedRef} className="max-h-48 overflow-y-auto p-3 space-y-1.5 font-mono text-xs">
        {activities.map((entry, i) => (
          <div key={i} className="flex gap-2 animate-fade-in">
            <span className="text-cyan-600 shrink-0">[{entry.testName}]</span>
            <span className="text-gray-300">{entry.message}</span>
          </div>
        ))}
        {activities.length > 0 && (
          <div className="flex gap-2">
            <span className="text-cyan-400 animate-pulse">_</span>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function Home() {
  const [url, setUrl] = useState("");
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditId, setAuditId] = useState<string | null>(null);
  const [tests, setTests] = useState<TestState[]>([]);
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());
  const [finalScore, setFinalScore] = useState<{ score: number; grade: string; gradeColor: string } | null>(null);
  const [topFixes, setTopFixes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [auditDomain, setAuditDomain] = useState<string>("");
  const [agentActivities, setAgentActivities] = useState<ActivityEntry[]>([]);
  const [justCompleted, setJustCompleted] = useState<Set<string>>(new Set());
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [previousScore, setPreviousScore] = useState<number | null>(null);
  const [apiError, setApiError] = useState(false);
  const eventSourceRef = useRef<(() => void) | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) eventSourceRef.current();
    };
  }, []);

  const startAudit = useCallback(async () => {
    if (!url.trim()) return;

    setIsAuditing(true);
    setError(null);
    setFinalScore(null);
    setTopFixes([]);
    setExpandedTests(new Set());
    setAgentActivities([]);
    setPreviousScore(null);
    setApiError(false);

    try {
      // Start the audit
      const response = await fetch("/api/audit/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to start audit");
      }

      const data = await response.json();
      setAuditId(data.auditId);
      setAuditDomain(data.domain);

      // Initialize test states
      const initialTests: TestState[] = data.tests.map((t: TestInfo) => ({
        ...t,
        status: "queued" as const,
        message: "Waiting...",
        passed: [],
        failed: [],
        fixes: [],
      }));
      setTests(initialTests);

      // Connect to SSE stream
      const controller = new AbortController();
      eventSourceRef.current = () => controller.abort();

      const sseResponse = await fetch(`/api/audit/status?auditId=${data.auditId}`, {
        signal: controller.signal,
      });

      if (!sseResponse.body) throw new Error("No SSE stream");

      const reader = sseResponse.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const processStream = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const block of lines) {
            for (const line of block.split("\n")) {
              if (line.startsWith("data: ")) {
                try {
                  const event: AuditEvent = JSON.parse(line.slice(6));
                  handleEvent(event);
                } catch {
                  // Skip unparseable events
                }
              }
            }
          }
        }
      };

      processStream().catch((err) => {
        if (err.name !== "AbortError") {
          console.error("SSE stream error:", err);
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start audit");
      setIsAuditing(false);
    }
  }, [url]);

  const handleEvent = useCallback((event: AuditEvent) => {
    if (event.testId === "complete") {
      // Audit is done!
      setIsAuditing(false);
      if (event.data) {
        setFinalScore({
          score: (event.data.score as number) || 0,
          grade: (event.data.grade as string) || "Unknown",
          gradeColor: (event.data.gradeColor as string) || "#666",
        });
        setTopFixes((event.data.topFixes as string[]) || []);
        if (event.data.previousScore != null) {
          setPreviousScore(event.data.previousScore as number);
        }
      }
      return;
    }

    if (event.testId === "system") {
      if (event.status === "error") {
        setError(event.message);
        setIsAuditing(false);
      }
      return;
    }

    // Add running messages to the live activity feed
    if (event.status === "running" && event.message) {
      setTests((prev) => {
        const test = prev.find((t) => t.id === event.testId);
        const testName = test?.name || event.testId;
        setAgentActivities((a) => [...a, { testName, message: event.message, timestamp: event.timestamp }]);
        return prev;
      });
    }

    // Update the specific test
    setTests((prev) =>
      prev.map((t) => {
        if (t.id !== event.testId) return t;
        return {
          ...t,
          status: event.status,
          message: event.message,
          subscore: event.subscore ?? t.subscore,
          startedAt: event.status === "running" && !t.startedAt ? Date.now() : t.startedAt,
          passed: (event.data?.passed as string[]) || t.passed,
          failed: (event.data?.failed as string[]) || t.failed,
          fixes: (event.data?.fixes as string[]) || t.fixes,
        };
      })
    );

    // Track justCompleted for flash animation
    if (event.status === "pass" || event.status === "fail" || event.status === "error") {
      setJustCompleted((prev) => new Set(prev).add(event.testId));
      setTimeout(() => {
        setJustCompleted((prev) => {
          const next = new Set(prev);
          next.delete(event.testId);
          return next;
        });
      }, 600);
    }

    // Detect API errors
    if (event.data?.isApiError) {
      setApiError(true);
    }

    // Auto-expand failing tests
    if (event.status === "fail" || event.status === "error") {
      setExpandedTests((prev) => new Set(prev).add(event.testId));
    }
  }, []);

  const handleDownloadReport = async () => {
    if (!finalScore || !auditDomain) return;
    setIsGeneratingPDF(true);
    try {
      const { generateAuditPDF } = await import("@/app/lib/pdf-report");
      await generateAuditPDF({
        domain: auditDomain,
        score: finalScore.score,
        grade: finalScore.grade,
        gradeColor: finalScore.gradeColor,
        tests: tests.map((t) => ({
          name: t.name,
          icon: t.icon,
          status: t.status,
          subscore: t.subscore,
          passed: t.passed,
          failed: t.failed,
          fixes: t.fixes,
        })),
        topFixes,
      });
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleExportJSON = () => {
    if (!finalScore || !auditDomain) return;
    const exportData = {
      domain: auditDomain,
      score: finalScore.score,
      grade: finalScore.grade,
      tests: Object.fromEntries(
        tests.map((t) => [t.id, {
          name: t.name,
          status: t.status,
          subscore: t.subscore,
          passed: t.passed,
          failed: t.failed,
          fixes: t.fixes,
        }])
      ),
      topFixes,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agentready-${auditDomain}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const isIdle = !isAuditing && !finalScore;
  const completedTests = tests.filter((t) => t.status === "pass" || t.status === "fail" || t.status === "error").length;

  return (
    <div className="min-h-screen grid-bg">
      {/* Header */}
      <header className="border-b border-gray-800/50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center">
              <span className="text-cyan-400 text-lg">◈</span>
            </div>
            <span className="font-semibold text-white tracking-tight">
              Agent<span className="text-cyan-400">Ready</span>
            </span>
          </div>
          <a
            href="/leaderboard"
            className="text-sm text-gray-400 hover:text-cyan-400 transition-colors"
          >
            Leaderboard →
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* Hero Section */}
        {isIdle && (
          <div className="text-center mb-12 animate-fade-in">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
              Is your store ready for
              <br />
              <span className="text-cyan-400">AI shopping agents?</span>
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-2">
              AI agents from Amazon, ChatGPT, and Google are trying to buy from your store right now.
              Find out if they can.
            </p>
            <p className="text-gray-500 text-sm">
              We deploy 5 real AI agents that simulate shopping your site and report exactly where they fail.
            </p>
          </div>
        )}

        {/* URL Input */}
        <div className="max-w-2xl mx-auto mb-10">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !isAuditing && startAudit()}
                placeholder="Enter your store URL (e.g., store.example.com)"
                disabled={isAuditing}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 font-mono text-sm disabled:opacity-50 transition-colors"
              />
              {isAuditing && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <button
              onClick={startAudit}
              disabled={isAuditing || !url.trim()}
              className="px-6 py-3.5 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm shrink-0"
            >
              {isAuditing ? "Auditing..." : "Run Audit"}
            </button>
          </div>

          {error && (
            <div className="mt-3 px-4 py-2 bg-red-950/30 border border-red-800/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Progress indicator */}
        {isAuditing && tests.length > 0 && (
          <div className="max-w-2xl mx-auto mb-6">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
              <span>Auditing {auditDomain}</span>
              <span>{completedTests} / {tests.length} tests complete</span>
            </div>
            <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-500 rounded-full transition-all duration-700"
                style={{ width: `${(completedTests / tests.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Live Agent Activity Feed */}
        {agentActivities.length > 0 && isAuditing && (
          <div className="max-w-2xl mx-auto mb-6">
            <LiveActivityFeed activities={agentActivities} />
          </div>
        )}

        {/* Final Score */}
        {finalScore && (
          <div className="flex flex-col items-center mb-10 animate-slide-up">
            <div className="text-sm text-gray-400 mb-4 font-mono">{auditDomain}</div>
            <ScoreCircle
              score={finalScore.score}
              grade={finalScore.grade}
              gradeColor={finalScore.gradeColor}
            />
            <div className="mt-4 text-sm text-gray-400">Agent Readiness Score</div>

            {/* Before/After Delta */}
            {previousScore !== null && (
              <div className="mt-2 text-sm font-mono">
                <span className="text-gray-500">Previous: {previousScore}</span>
                <span className="text-gray-600 mx-1">&rarr;</span>
                <span className="text-gray-500">Current: {finalScore.score}</span>
                {" "}
                <span
                  className="font-bold"
                  style={{
                    color: finalScore.score >= previousScore ? "#00E676" : "#FF1744",
                  }}
                >
                  ({finalScore.score >= previousScore ? "+" : ""}{finalScore.score - previousScore})
                </span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
              <button
                onClick={handleDownloadReport}
                disabled={isGeneratingPDF}
                className="px-4 py-2 border border-gray-600 hover:border-cyan-500 text-gray-300 hover:text-cyan-400 rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isGeneratingPDF ? (
                  <>
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M8 2v8m0 0l-3-3m3 3l3-3M3 12h10" />
                    </svg>
                    Download Report
                  </>
                )}
              </button>

              <button
                onClick={handleExportJSON}
                className="px-4 py-2 border border-gray-600 hover:border-cyan-500 text-gray-300 hover:text-cyan-400 rounded-lg text-sm transition-colors flex items-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 2h5l4 4v8a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" />
                  <path d="M9 2v4h4" />
                </svg>
                Export JSON
              </button>

              <button
                onClick={() => {
                  const link = `${window.location.origin}/report/${encodeURIComponent(auditDomain)}`;
                  navigator.clipboard.writeText(link);
                }}
                className="px-4 py-2 border border-gray-600 hover:border-cyan-500 text-gray-300 hover:text-cyan-400 rounded-lg text-sm transition-colors flex items-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="5" width="8" height="8" rx="1" />
                  <path d="M3 11V3h8" />
                </svg>
                Copy Link
              </button>

              <a
                href={`/report/${encodeURIComponent(auditDomain)}`}
                className="px-4 py-2 border border-cyan-600 hover:border-cyan-400 text-cyan-400 hover:text-cyan-300 rounded-lg text-sm transition-colors flex items-center gap-2"
              >
                View Report &rarr;
              </a>
            </div>
          </div>
        )}

        {/* API Error Banner */}
        {apiError && (
          <div className="max-w-2xl mx-auto mb-4 px-4 py-3 bg-amber-950/30 border border-amber-700/50 rounded-lg animate-fade-in">
            <div className="flex items-start gap-3">
              <span className="text-amber-400 text-lg shrink-0">&#9888;</span>
              <div>
                <div className="text-sm font-semibold text-amber-300">API Configuration Issue</div>
                <div className="text-xs text-amber-400/80 mt-0.5">
                  Tests failed due to a TinyFish API error, not a site issue. Check your API key and credits.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Test Cards */}
        {tests.length > 0 && (
          <div className="max-w-2xl mx-auto space-y-3 mb-10">
            {tests.map((test, index) => (
              <TestCard
                key={test.id}
                test={test}
                isExpanded={expandedTests.has(test.id)}
                onToggle={() => setExpandedTests((prev) => {
                  const next = new Set(prev);
                  if (next.has(test.id)) next.delete(test.id);
                  else next.add(test.id);
                  return next;
                })}
                index={index}
                justCompleted={justCompleted.has(test.id)}
              />
            ))}
          </div>
        )}

        {/* Top Fixes */}
        {topFixes.length > 0 && (
          <div className="max-w-2xl mx-auto mt-8 animate-fade-in">
            <div className="border border-gray-800 rounded-lg overflow-hidden">
              <div className="px-5 py-3 bg-gray-800/50 border-b border-gray-800 flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Priority Fixes ({topFixes.length})
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Fix these issues to improve your Agent Readiness Score
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0 mt-0.5">
                  <button
                    onClick={handleDownloadReport}
                    disabled={isGeneratingPDF}
                    className="text-xs text-gray-500 hover:text-cyan-400 transition-colors disabled:opacity-50"
                  >
                    {isGeneratingPDF ? "Generating..." : "Download PDF"}
                  </button>
                  <span className="text-gray-700">|</span>
                  <button
                    onClick={handleExportJSON}
                    className="text-xs text-gray-500 hover:text-cyan-400 transition-colors"
                  >
                    Export JSON
                  </button>
                </div>
              </div>
              <div className="divide-y divide-gray-800/50">
                {topFixes.map((fix, i) => (
                  <div key={i} className="px-5 py-3 flex items-start gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center text-xs font-mono font-bold mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-sm text-gray-300">{fix}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Run Again */}
            <div className="text-center mt-8">
              <button
                onClick={() => {
                  setFinalScore(null);
                  setTests([]);
                  setTopFixes([]);
                  setError(null);
                  setAuditId(null);
                  setAgentActivities([]);
                  setPreviousScore(null);
                  setApiError(false);
                }}
                className="text-sm text-gray-400 hover:text-cyan-400 transition-colors"
              >
                ← Audit another site
              </button>
            </div>
          </div>
        )}

        {/* How It Works (shown on idle) */}
        {isIdle && (
          <div className="max-w-3xl mx-auto mt-16 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  icon: "🤖",
                  title: "5 Real AI Agents",
                  description:
                    "We deploy actual web agents that navigate your store — not static code analysis.",
                },
                {
                  icon: "🔬",
                  title: "Behavioral Testing",
                  description:
                    "Agents try to search, extract prices, add to cart, and reach checkout. Just like real AI shoppers.",
                },
                {
                  icon: "📊",
                  title: "Actionable Score",
                  description:
                    "Get a 0-100 score with specific, prioritized fixes. Know exactly what breaks for AI agents.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="border border-gray-800 rounded-lg p-5 bg-gray-900/30"
                >
                  <span className="text-2xl mb-3 block">{item.icon}</span>
                  <h3 className="text-sm font-semibold text-white mb-1">{item.title}</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>

            <div className="text-center mt-12 text-xs text-gray-600">
              Powered by{" "}
              <a href="https://tinyfish.ai" className="text-gray-500 hover:text-cyan-400 transition-colors">
                TinyFish
              </a>{" "}
              web agents +{" "}
              <a href="https://upstash.com" className="text-gray-500 hover:text-cyan-400 transition-colors">
                Redis
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
