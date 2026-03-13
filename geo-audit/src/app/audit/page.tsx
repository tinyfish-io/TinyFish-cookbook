"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Download,
  Loader2,
  Search,
  FileBarChart,
  CircleCheck,
  CircleAlert,
  CircleX,
  BarChart3,
  Layers,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ScoreTrendChart } from "@/components/charts/ScoreTrendChart";
import { QuestionAnalytics } from "@/components/charts/QuestionAnalytics";
import { ScoreRadarChart } from "@/components/charts/ScoreRadarChart";
import { Recommendations } from "@/components/recommendations/Recommendations";
import { AuditHistory } from "@/components/history/AuditHistory";
import { LlmCitationCheck } from "@/components/llm-citations/LlmCitationCheck";
import type { LlmCitationCheckResult } from "@/lib/llm-citations";
import { LiveProgress } from "@/components/interactive/LiveProgress";
import { ScoreSimulator } from "@/components/interactive/ScoreSimulator";
import { QuestionNetwork } from "@/components/interactive/QuestionNetwork";
import { Checkbox } from "@/components/ui/checkbox";
import type { LlmoBreakdown, LlmoFinding } from "@/lib/llmo-types";

function ScoreDisplay({ score }: { score: number }) {
  const getScoreColor = (score: number) => {
    if (score >= 75) return "text-success";
    if (score >= 50) return "text-warning";
    return "text-destructive";
  };

  return (
    <div className="flex flex-col items-center justify-center py-4">
      <div className={`text-5xl font-bold ${getScoreColor(score)}`}>
        {score}
      </div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground mt-1">
        GEO Score
      </div>
    </div>
  );
}

type AuditQuestion = {
  id: string;
  question: string;
  answeredInDocs: "YES" | "NO" | "PARTIAL";
  partialAnswer: string | null;
  importance: "HIGH" | "MEDIUM";
};

type ImportanceStats = {
  score: number;
  clarityIndex: number;
  total: number;
  answered: number;
  partial: number;
  missing: number;
};

type ImportanceBreakdown = {
  high: ImportanceStats;
  medium: ImportanceStats;
};

type RedditPostEntry = {
  url: string;
  title?: string;
  summary?: string;
  sentiment?: string;
};

type RedditDiscoveryPayload = {
  redditPostUrls: RedditPostEntry[];
  error?: string;
};

type SingleAuditResponse = {
  mode: "single";
  id: string;
  url: string;
  createdAt: string;
  score: number;
  overallLlmoScore: number;
  clarityIndex?: number;
  importanceBreakdown: ImportanceBreakdown;
  llmoBreakdown: LlmoBreakdown;
  llmoFindings: LlmoFinding[];
  questions: AuditQuestion[];
  reddit?: RedditDiscoveryPayload;
  llmCitations?: LlmCitationCheckResult | { error: string };
};

type MultiPage = {
  url: string;
  score: number;
  overallLlmoScore: number;
  clarityIndex: number;
  createdAt: string;
  importanceBreakdown: ImportanceBreakdown;
  llmoBreakdown: LlmoBreakdown;
  llmoFindings: LlmoFinding[];
  questions: AuditQuestion[];
};

type ConsistencyFinding = {
  question: string;
  delta: number;
  severity: "HIGH" | "MEDIUM";
  pages: Array<{
    url: string;
    answeredInDocs: "YES" | "NO" | "PARTIAL";
    partialAnswer: string | null;
  }>;
};

type MultiAuditResponse = {
  mode: "multi";
  sessionId: string;
  baseUrl: string;
  overallScore: number;
  overallLlmoScore: number;
  clarityIndex: number;
  pages: MultiPage[];
  consistency: {
    consistencyScore: number;
    totalQuestions: number;
    inconsistencies: ConsistencyFinding[];
  };
  sitemapInfo: {
    totalUrlsFound: number;
    urlsAudited: number;
    urlsTruncated: boolean;
    urls: string[];
  };
  reddit?: RedditDiscoveryPayload;
  llmCitations?: LlmCitationCheckResult | { error: string };
};

type AuditResponse = SingleAuditResponse | MultiAuditResponse;

const STATUS_LABELS: Record<AuditQuestion["answeredInDocs"], string> = {
  YES: "Answered",
  PARTIAL: "Partial",
  NO: "Missing",
};

const STATUS_COLOR: Record<AuditQuestion["answeredInDocs"], string> = {
  YES: "border-0 bg-success/10 text-success shadow-sm dark:bg-success/20",
  PARTIAL: "border-0 bg-warning/10 text-warning shadow-sm dark:bg-warning/20",
  NO: "border-0 bg-destructive/10 text-destructive shadow-sm dark:bg-destructive/20",
};

const IMPORTANCE_COLOR: Record<AuditQuestion["importance"], string> = {
  HIGH: "bg-primary text-primary-foreground",
  MEDIUM: "bg-secondary text-secondary-foreground",
};

const LLMO_DIMENSION_STYLE: Record<string, string> = {
  "Coverage & Clarity": "bg-primary",
  "Structured Data": "bg-indigo-500",
  Extractability: "bg-cyan-500",
  Authority: "bg-emerald-500",
  "Machine Readability": "bg-amber-500",
};

function stableImpact(id: string | undefined | null, importance: AuditQuestion["importance"]): number {
  const s = id ?? "";
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const n = h % 100;
  return importance === "HIGH" ? 5 + (n % 8) : 2 + (n % 4);
}

function AuditPageInner() {
  const searchParams = useSearchParams();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<AuditResponse | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [importanceFilter, setImportanceFilter] = useState("all");
  const [useSitemap, setUseSitemap] = useState(false);
  const [includeReddit, setIncludeReddit] = useState(false);
  const [includeLlmCitations, setIncludeLlmCitations] = useState(false);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showLiveProgress, setShowLiveProgress] = useState(false);
  const resultsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const auditRunIdRef = useRef(0);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const hasAutoRun = useRef(false);

  const isMulti = data?.mode === "multi";
  const selectedPage = isMulti ? data.pages[activePageIndex] : null;
  const clarityIndex = isMulti
    ? data?.clarityIndex ?? 0
    : data?.clarityIndex ?? 0;
  const scoreValue = isMulti ? data?.overallScore ?? 0 : data?.score ?? 0;
  const llmoScore = isMulti
    ? data?.overallLlmoScore ?? 0
    : data?.overallLlmoScore ?? 0;
  const importanceBreakdown = isMulti
    ? selectedPage?.importanceBreakdown
    : data?.mode === "single"
      ? data.importanceBreakdown
      : undefined;
  const llmoBreakdown = isMulti
    ? selectedPage?.llmoBreakdown
    : data?.mode === "single"
      ? data.llmoBreakdown
      : undefined;
  const summary = useMemo(() => {
    const questions = isMulti
      ? selectedPage?.questions ?? []
      : data?.mode === "single"
        ? data.questions
        : [];
    const total = questions.length;
    const answered = questions.filter((q) => q.answeredInDocs === "YES").length;
    const partial = questions.filter((q) => q.answeredInDocs === "PARTIAL").length;
    const missing = questions.filter((q) => q.answeredInDocs === "NO").length;
    return { total, answered, partial, missing };
  }, [data, isMulti, selectedPage]);

  const filteredQuestions = useMemo(() => {
    const questions = isMulti
      ? selectedPage?.questions ?? []
      : data?.mode === "single"
        ? data.questions
        : [];
    return questions.filter((q) => {
      if (statusFilter !== "all" && q.answeredInDocs !== statusFilter) {
        return false;
      }
      if (importanceFilter !== "all" && q.importance !== importanceFilter) {
        return false;
      }
      return true;
    });
  }, [data, statusFilter, importanceFilter, isMulti, selectedPage]);

  const simulatorQuestions = useMemo(() => {
    const questions = isMulti ? selectedPage?.questions ?? [] : data?.mode === "single" ? data.questions : [];
    return questions.map((q) => ({
      id: q.id,
      question: q.question,
      currentStatus: q.answeredInDocs,
      importance: q.importance,
      impact: stableImpact(q.id, q.importance),
    }));
  }, [data, isMulti, selectedPage]);

  const networkQuestions = useMemo(() => {
    const questions = isMulti ? selectedPage?.questions ?? [] : data?.mode === "single" ? data.questions : [];
    return questions.map((q) => ({
      id: q.id,
      question: q.question,
      status: q.answeredInDocs,
      importance: q.importance,
      category: q.importance === "HIGH" ? "Core" : "Secondary",
    }));
  }, [data, isMulti, selectedPage]);

  const recommendationsQuestions = useMemo(() => {
    const questions =
      isMulti && data?.mode === "multi"
        ? data.pages[activePageIndex]?.questions ?? []
        : data?.mode === "single"
          ? data.questions ?? []
          : [];
    return questions.map((q) => ({
      question: q.question,
      answeredInDocs: q.answeredInDocs,
      partialAnswer: q.partialAnswer ?? null,
      importance: q.importance,
    }));
  }, [data, isMulti, activePageIndex]);

  const recommendationsFindings = useMemo(() => {
    const findings = isMulti
      ? selectedPage?.llmoFindings ?? []
      : data?.mode === "single"
        ? data.llmoFindings
        : [];
    return findings.map((f) => ({
      category: f.category,
      severity: f.severity,
      title: f.title,
      description: f.description,
      actionItems: f.actionItems,
    }));
  }, [data, isMulti, selectedPage]);

  useEffect(() => {
    return () => {
      if (resultsTimeoutRef.current !== null) {
        clearTimeout(resultsTimeoutRef.current);
        resultsTimeoutRef.current = null;
      }
    };
  }, []);

  async function runAudit() {
    if (resultsTimeoutRef.current !== null) {
      clearTimeout(resultsTimeoutRef.current);
      resultsTimeoutRef.current = null;
    }
    auditRunIdRef.current += 1;
    const thisRunId = auditRunIdRef.current;
    setError("");
    setLoading(true);
    setShowLiveProgress(true);
    setData(null);

    try {
      const response = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, sitemap: useSitemap, includeReddit, includeLlmCitations }),
      });

      // Stale run: user started another audit; ignore this response
      if (thisRunId !== auditRunIdRef.current) return;

      // Read the response body once as text
      const responseText = await response.text();

      if (thisRunId !== auditRunIdRef.current) return;

      if (!response.ok) {
        let errorMessage = "Audit request failed";
        try {
          const json = JSON.parse(responseText);
          errorMessage = json?.error || errorMessage;
        } catch {
          errorMessage = responseText || `Request failed with status ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      const json = JSON.parse(responseText) as AuditResponse;

      if (thisRunId !== auditRunIdRef.current) return;

      // Delay showing results so LiveProgress stays visible; only apply if this run is still current
      resultsTimeoutRef.current = setTimeout(() => {
        resultsTimeoutRef.current = null;
        if (thisRunId !== auditRunIdRef.current) return;
        try {
          setData(json);
          setActivePageIndex(0);
        } finally {
          if (thisRunId === auditRunIdRef.current) {
            setShowLiveProgress(false);
            setLoading(false);
          }
        }
      }, 2000);
    } catch (err) {
      if (thisRunId === auditRunIdRef.current) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setShowLiveProgress(false);
        setLoading(false);
      }
    }
  }

  // Auto-populate URL from query param and trigger audit
  useEffect(() => {
    if (hasAutoRun.current) return;
    const urlParam = searchParams.get("url");
    if (urlParam) {
      hasAutoRun.current = true;
      setUrl(urlParam);
      // Trigger audit on next tick after state is set
      setTimeout(() => {
        auditRunIdRef.current += 1;
        const thisRunId = auditRunIdRef.current;
        setError("");
        setLoading(true);
        setShowLiveProgress(true);
        setData(null);

        fetch("/api/audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: urlParam, sitemap: false }),
        })
          .then(async (response) => {
            if (thisRunId !== auditRunIdRef.current) return;
            const responseText = await response.text();
            if (thisRunId !== auditRunIdRef.current) return;
            if (!response.ok) {
              let errorMessage = "Audit request failed";
              try {
                const json = JSON.parse(responseText);
                errorMessage = json?.error || errorMessage;
              } catch {
                errorMessage =
                  responseText ||
                  `Request failed with status ${response.status}`;
              }
              throw new Error(errorMessage);
            }
            const json = JSON.parse(responseText) as AuditResponse;
            if (thisRunId !== auditRunIdRef.current) return;
            resultsTimeoutRef.current = setTimeout(() => {
              resultsTimeoutRef.current = null;
              if (thisRunId !== auditRunIdRef.current) return;
              try {
                setData(json);
                setActivePageIndex(0);
              } finally {
                if (thisRunId === auditRunIdRef.current) {
                  setShowLiveProgress(false);
                  setLoading(false);
                }
              }
            }, 2000);
          })
          .catch((err) => {
            if (thisRunId === auditRunIdRef.current) {
              setError(
                err instanceof Error ? err.message : "Unknown error"
              );
              setShowLiveProgress(false);
              setLoading(false);
            }
          });
      }, 0);
    }
  }, [searchParams]);

  const toggleRow = (questionId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  function exportCsv(payload: AuditResponse) {
    const rows: string[][] = [];
    const headers = [
      "Audit ID",
      "URL",
      "CreatedAt",
      "Question",
      "Status",
      "Importance",
      "PartialAnswer",
    ];

    if (payload.mode === "single") {
      for (const question of payload.questions) {
        rows.push([
          payload.id,
          payload.url,
          payload.createdAt,
          question.question,
          question.answeredInDocs,
          question.importance,
          question.partialAnswer ?? "",
        ]);
      }
    } else {
      for (const pageResult of payload.pages) {
        for (const question of pageResult.questions) {
          rows.push([
            payload.sessionId,
            pageResult.url,
            pageResult.createdAt,
            question.question,
            question.answeredInDocs,
            question.importance,
            question.partialAnswer ?? "",
          ]);
        }
      }
    }

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download =
      payload.mode === "single"
        ? `geo-audit-${payload.id}.csv`
        : `geo-audit-${payload.sessionId}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-8 px-6 py-8 sm:px-8 lg:px-10 xl:px-12">
        {/* Simple professional header */}
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              GEO Audit Tool
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Evaluate AI engine comprehension of your website content
            </p>
          </div>
          {data && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportCsv(data)}
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          )}
        </div>

        {/* Configure - hero-style when no data, compact when results exist */}
        <section id="configure">
          <p className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Configure
          </p>
          <Card
            className={`rounded-xl border-border bg-card transition-colors ${!data && !loading ? "border-primary/20 bg-primary/5 shadow-sm" : ""
              }`}
          >
            <CardContent className={!data && !loading ? "pt-8 pb-8 sm:pt-10 sm:pb-10" : "pt-6 pb-6"}>
              <div className={!data && !loading ? "mx-auto max-w-2xl" : ""}>
                {!data && !loading ? (
                  <>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                      Enter a URL to audit
                    </h2>
                    <p className="mt-2 text-muted-foreground">
                      We&apos;ll analyze how well AI engines can understand your site&apos;s content and surface gaps.
                    </p>
                    <div className="relative mt-6">
                      <Input
                        ref={urlInputRef}
                        type="url"
                        value={url}
                        onChange={(event) => setUrl(event.target.value)}
                        onKeyDown={(event) => { if (event.key === "Enter" && url.trim() && !loading) runAudit(); }}
                        placeholder="Paste your URL here..."
                        className="min-h-12 rounded-xl border-2 bg-background/80 px-4 py-3 text-base placeholder:text-muted-foreground/70 focus-visible:ring-2"
                      />
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">
                          {url.length} character{url.length !== 1 ? "s" : ""}
                        </span>
                        <Button
                          onClick={runAudit}
                          disabled={loading || !url.trim()}
                          size="lg"
                          className="rounded-xl shadow-sm"
                        >
                          {loading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Analyzing...
                            </>
                          ) : (
                            <>
                              <Search className="mr-2 h-4 w-4" />
                              Run Audit
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="mt-6">
                      <p className="mb-2 text-sm text-muted-foreground">Or try an example:</p>
                      <div className="flex flex-wrap gap-2">
                        {["https://example.com", "https://stripe.com/docs", "https://vercel.com"].map((exampleUrl) => (
                          <button
                            key={exampleUrl}
                            type="button"
                            onClick={() => setUrl(exampleUrl)}
                            className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted hover:border-primary/30"
                          >
                            {exampleUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="mt-6 flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="sitemap"
                          checked={useSitemap}
                          onCheckedChange={(v) => {
                            if (v === "indeterminate") return;
                            setUseSitemap(v === true);
                          }}
                        />
                        <label
                          htmlFor="sitemap"
                          className="cursor-pointer text-sm text-muted-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Use sitemap (max 10 pages)
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="includeReddit"
                          checked={includeReddit}
                          onCheckedChange={(v) => {
                            if (v === "indeterminate") return;
                            setIncludeReddit(v === true);
                          }}
                        />
                        <label
                          htmlFor="includeReddit"
                          className="cursor-pointer text-sm text-muted-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Include Reddit discovery
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="includeLlmCitations"
                          checked={includeLlmCitations}
                          onCheckedChange={(v) => {
                            if (v === "indeterminate") return;
                            setIncludeLlmCitations(v === true);
                          }}
                        />
                        <label
                          htmlFor="includeLlmCitations"
                          className="cursor-pointer text-sm text-muted-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Include LLM citation check
                        </label>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <CardHeader className="p-0">
                      <CardTitle className="text-base">Audit Configuration</CardTitle>
                      <CardDescription className="text-sm">
                        Enter a URL to analyze
                      </CardDescription>
                    </CardHeader>
                    <div>
                      <label className="text-sm font-medium">URL</label>
                      <Input
                        ref={urlInputRef}
                        type="url"
                        value={url}
                        onChange={(event) => setUrl(event.target.value)}
                        onKeyDown={(event) => { if (event.key === "Enter" && url.trim() && !loading) runAudit(); }}
                        placeholder="https://example.com"
                        className="mt-1 rounded-lg"
                      />
                    </div>
                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="sitemap-config"
                          checked={useSitemap}
                          onCheckedChange={(v) => {
                            if (v === "indeterminate") return;
                            setUseSitemap(v === true);
                          }}
                        />
                        <label
                          htmlFor="sitemap-config"
                          className="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Use sitemap (max 10 pages)
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="includeReddit-config"
                          checked={includeReddit}
                          onCheckedChange={(v) => {
                            if (v === "indeterminate") return;
                            setIncludeReddit(v === true);
                          }}
                        />
                        <label
                          htmlFor="includeReddit-config"
                          className="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Include Reddit discovery
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="includeLlmCitations-config"
                          checked={includeLlmCitations}
                          onCheckedChange={(v) => {
                            if (v === "indeterminate") return;
                            setIncludeLlmCitations(v === true);
                          }}
                        />
                        <label
                          htmlFor="includeLlmCitations-config"
                          className="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Include LLM citation check
                        </label>
                      </div>
                    </div>
                    <Button
                      onClick={runAudit}
                      disabled={loading || !url.trim()}
                      className="w-full rounded-lg"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Search className="mr-2 h-4 w-4" />
                          Run Audit
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        {error ? (
          <Card className="border-destructive/30 bg-destructive/10 dark:border-destructive/40 dark:bg-destructive/10">
            <CardContent className="flex items-center gap-3 pt-6">
              <CircleX className="h-5 w-5 shrink-0 text-destructive" />
              <span className="flex-1 text-sm text-destructive">{error}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setError("");
                  urlInputRef.current?.focus();
                }}
              >
                Dismiss
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {data ? (
          <nav
            aria-label="Jump to section"
            className="sticky top-0 z-10 -mx-6 flex flex-wrap items-center gap-2 border-b border-border bg-background/95 px-6 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10 xl:-mx-12 xl:px-12"
          >
            <span className="mr-2 text-xs font-medium text-muted-foreground">Jump to:</span>
            <a
              href="#overview"
              className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Overview
            </a>
            <a
              href="#charts"
              className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Charts
            </a>
            <a
              href="#recommendations"
              className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Recommendations
            </a>
            <a
              href="#llm-citations"
              className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              LLM citations
            </a>
            <a
              href="#details"
              className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Details
            </a>
          </nav>
        ) : null}

        {/* Live Progress View */}
        {showLiveProgress && loading && (
          <LiveProgress
            questions={[
              "What is the company's main product or service?",
              "Who are the key team members?",
              "What pricing plans are available?",
              "What customer support options exist?",
              "What is the company's founding story?",
              "What industries does the company serve?",
              "What are the main features of the product?",
              "What integrations are supported?",
            ]}
            onComplete={() => { }}
          />
        )}

        {data ? (
          <section id="overview">
            <p className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Overview
            </p>
            <div className="grid gap-4 md:grid-cols-[auto_1fr]">
              <Card>
                <CardContent className="flex flex-col items-center py-6">
                  <ScoreDisplay score={scoreValue} />
                </CardContent>
              </Card>
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="flex items-center gap-3 pt-6">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
                      <BarChart3 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-semibold text-primary">{clarityIndex}%</p>
                      <p className="text-xs text-muted-foreground">Clarity Index</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-success/30 bg-success/5">
                  <CardContent className="flex items-center gap-3 pt-6">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-success/15 text-success">
                      <CircleCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-semibold text-success">
                        {summary.answered}<span className="text-sm text-muted-foreground">/{summary.total}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">Answered</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-warning/30 bg-warning/5">
                  <CardContent className="flex items-center gap-3 pt-6">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-warning/15 text-warning">
                      <CircleAlert className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-semibold text-warning">{summary.partial}</p>
                      <p className="text-xs text-muted-foreground">Partial</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-destructive/30 bg-destructive/5">
                  <CardContent className="flex items-center gap-3 pt-6">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-destructive/15 text-destructive">
                      <CircleX className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-semibold text-destructive">{summary.missing}</p>
                      <p className="text-xs text-muted-foreground">Missing</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-indigo-500/25 bg-indigo-500/5">
                  <CardContent className="flex items-center gap-3 pt-6">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-indigo-500/15 text-indigo-500">
                      <Layers className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-semibold text-indigo-500">{llmoScore}</p>
                      <p className="text-xs text-muted-foreground">LLMO Score</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>
        ) : null}

        {llmoBreakdown ? (
          <Card className="border-primary/20 bg-gradient-to-b from-primary/5 to-background">
            <CardHeader>
              <CardTitle className="text-base">LLMO Readiness</CardTitle>
              <CardDescription>
                Structured-data quality, extractability, authority, and machine-readable signals
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(
                [
                  ["Coverage & Clarity", llmoBreakdown.coverageClarity],
                  ["Structured Data", llmoBreakdown.structuredData],
                  ["Extractability", llmoBreakdown.extractability],
                  ["Authority", llmoBreakdown.authority],
                  ["Machine Readability", llmoBreakdown.machineReadability],
                ] as const
              ).map(([label, dim]) => (
                <div key={label} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{label}</span>
                    <span className="text-muted-foreground">
                      {dim.score}/{dim.max}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-md bg-muted">
                    <div
                      className={`h-full ${LLMO_DIMENSION_STYLE[label] ?? "bg-primary"}`}
                      style={{ width: `${dim.percent}%` }}
                    />
                  </div>
                  {dim.failedChecks.length ? (
                    <ul className="space-y-1">
                      {dim.failedChecks.slice(0, 2).map((msg) => (
                        <li key={`${label}-${msg}`} className="text-xs text-muted-foreground">
                          - {msg}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {/* Charts & analysis */}
        {data ? (
          <section id="charts">
            <p className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
              Charts & analysis
            </p>
            <div className="space-y-6">
              <ScoreTrendChart url={data.mode === "single" ? data.url : data.baseUrl} />
              {data && (isMulti ? selectedPage : data.mode === "single") ? (
                <QuestionAnalytics
                  questions={
                    isMulti
                      ? selectedPage?.questions ?? []
                      : data.mode === "single"
                        ? data.questions
                        : []
                  }
                />
              ) : null}
              {importanceBreakdown ? (
                <ScoreRadarChart
                  importanceBreakdown={importanceBreakdown}
                  overallScore={scoreValue}
                  clarityIndex={clarityIndex}
                />
              ) : null}
            </div>
          </section>
        ) : null}

        {importanceBreakdown ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Importance Breakdown</CardTitle>
              <CardDescription>
                Question coverage by priority level
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="rounded-md border border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium">HIGH Priority</span>
                  <Badge variant="destructive" className="text-xs">Critical</Badge>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Score:</span>
                    <span className="font-semibold">{importanceBreakdown.high.score}/100</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Clarity:</span>
                    <span className="font-semibold">{importanceBreakdown.high.clarityIndex}%</span>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge className="bg-success/15 text-success dark:bg-success/20">
                    Answered {importanceBreakdown.high.answered}
                  </Badge>
                  <Badge className="bg-warning/15 text-warning dark:bg-warning/20">
                    Partial {importanceBreakdown.high.partial}
                  </Badge>
                  <Badge className="bg-destructive/15 text-destructive dark:bg-destructive/20">
                    Missing {importanceBreakdown.high.missing}
                  </Badge>
                </div>
              </div>
              <div className="rounded-md border border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium">MEDIUM Priority</span>
                  <Badge variant="outline" className="text-xs">Weight 0.6</Badge>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Score:</span>
                    <span className="font-semibold">{importanceBreakdown.medium.score}/100</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Clarity:</span>
                    <span className="font-semibold">{importanceBreakdown.medium.clarityIndex}%</span>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge className="bg-success/15 text-success dark:bg-success/20">
                    Answered {importanceBreakdown.medium.answered}
                  </Badge>
                  <Badge className="bg-warning/15 text-warning dark:bg-warning/20">
                    Partial {importanceBreakdown.medium.partial}
                  </Badge>
                  <Badge className="bg-destructive/15 text-destructive dark:bg-destructive/20">
                    Missing {importanceBreakdown.medium.missing}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {data ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Coverage Summary</CardTitle>
                  <CardDescription>
                    Overall question coverage
                  </CardDescription>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge className="bg-success/15 text-success dark:bg-success/20">
                  <CircleCheck className="mr-1 h-3 w-3" />
                  Answered: {summary.answered}
                </Badge>
                <Badge className="bg-warning/15 text-warning dark:bg-warning/20">
                  <CircleAlert className="mr-1 h-3 w-3" />
                  Partial: {summary.partial}
                </Badge>
                <Badge className="bg-destructive/15 text-destructive dark:bg-destructive/20">
                  <CircleX className="mr-1 h-3 w-3" />
                  Missing: {summary.missing}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex h-3 w-full overflow-hidden rounded-md bg-muted">
                {summary.total > 0 ? (
                  <>
                    <div
                      className="h-full min-w-0 rounded-l-md bg-success"
                      style={{ width: `${(summary.answered / summary.total) * 100}%` }}
                    />
                    <div
                      className="h-full min-w-0 bg-warning"
                      style={{ width: `${(summary.partial / summary.total) * 100}%` }}
                    />
                    <div
                      className="h-full min-w-0 rounded-r-md bg-destructive"
                      style={{ width: `${(summary.missing / summary.total) * 100}%` }}
                    />
                  </>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Interactive */}
        {data ? (
          <>
            <p className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
              Interactive
            </p>
            <div className="grid gap-6 lg:grid-cols-2">
              <ScoreSimulator currentScore={scoreValue} questions={simulatorQuestions} />
              <QuestionNetwork questions={networkQuestions} />
            </div>
          </>
        ) : null}

        {/* Recommendations */}
        {data ? (
          <section id="recommendations">
            <p className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Recommendations
            </p>
            <Recommendations
              runId={data.mode === "single" ? data.id : undefined}
              sessionId={data.mode === "multi" ? data.sessionId : undefined}
              questions={recommendationsQuestions}
              llmoFindings={recommendationsFindings}
            />
          </section>
        ) : null}

        {/* Reddit discovery */}
        {data && "reddit" in data && data.reddit ? (
          <section id="reddit">
            <p className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
              Reddit
            </p>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Reddit posts about this site</CardTitle>
                <CardDescription>
                  Posts discovered via Reddit search (TinyFish). Important signal for how AI and users perceive your brand.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.reddit.error ? (
                  <p className="text-sm text-destructive">{data.reddit.error}</p>
                ) : data.reddit.redditPostUrls.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No Reddit posts found for this site.</p>
                ) : (
                  <ul className="space-y-2">
                    {data.reddit.redditPostUrls.map((post, i) => {
                      const displayLabel = post.title ?? (() => {
                        try {
                          const u = new URL(post.url);
                          return u.pathname.slice(1) || u.hostname;
                        } catch {
                          return `Post ${i + 1}`;
                        }
                      })();
                      return (
                      <li key={post.url} className="flex flex-col gap-1">
                        <a
                          href={post.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                          {displayLabel}
                        </a>
                        {(post.summary ?? post.sentiment) && (
                          <p className="text-xs text-muted-foreground pl-5">
                            {post.summary}
                            {post.sentiment ? ` (${post.sentiment})` : ""}
                          </p>
                        )}
                      </li>
                    );})}
                  </ul>
                )}
              </CardContent>
            </Card>
          </section>
        ) : null}

        {/* LLM citation check (second layer: do models cite this site?) */}
        {data ? (
          <section id="llm-citations">
            <p className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
              LLM citations
            </p>
            <LlmCitationCheck
              url={data.mode === "single" ? data.url : data.baseUrl}
              initialResult={
                "llmCitations" in data &&
                data.llmCitations &&
                "topics" in data.llmCitations
                  ? (data.llmCitations as LlmCitationCheckResult)
                  : undefined
              }
              initialError={
                "llmCitations" in data &&
                data.llmCitations &&
                "error" in data.llmCitations
                  ? (data.llmCitations as { error: string }).error
                  : undefined
              }
            />
          </section>
        ) : null}

        {/* History */}
        {data ? (
          <>
            <p className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              History
            </p>
            <AuditHistory
              url={data.mode === "single" ? data.url : data.baseUrl}
              limit={5}
            />
          </>
        ) : null}

        {/* Details - only when we have audit data */}
        {data ? (
          <section id="details">
            <p className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/80" />
              Details
            </p>
            <Card>
              <Tabs defaultValue="page">
                <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle className="text-base">Audit Details</CardTitle>
                    <CardDescription>
                      Question-level analysis
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {isMulti ? (
                      <Select
                        value={String(activePageIndex)}
                        onValueChange={(value) => setActivePageIndex(Number(value))}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Select page" />
                        </SelectTrigger>
                        <SelectContent>
                          {data.pages.map((page, index) => (
                            <SelectItem key={page.url} value={String(index)}>
                              {page.url}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : null}
                    <TabsList>
                      <TabsTrigger value="page">
                        Page view
                      </TabsTrigger>
                      <TabsTrigger value="consistency" disabled={!isMulti}>
                        Consistency
                      </TabsTrigger>
                    </TabsList>
                  </div>
                </CardHeader>
                <CardContent>
                  <TabsContent value="page">
                    <div className="mb-4 flex flex-wrap gap-3">
                      <Select
                        value={statusFilter}
                        onValueChange={(value) => setStatusFilter(value)}
                      >
                        <SelectTrigger className="w-[160px]">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All status</SelectItem>
                          <SelectItem value="YES">Answered</SelectItem>
                          <SelectItem value="PARTIAL">Partial</SelectItem>
                          <SelectItem value="NO">Missing</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select
                        value={importanceFilter}
                        onValueChange={(value) => setImportanceFilter(value)}
                      >
                        <SelectTrigger className="w-[160px]">
                          <SelectValue placeholder="Importance" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All importance</SelectItem>
                          <SelectItem value="HIGH">High</SelectItem>
                          <SelectItem value="MEDIUM">Medium</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="overflow-hidden rounded-md border border-border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="font-semibold">
                              Question
                            </TableHead>
                            <TableHead className="font-semibold">
                              Status
                            </TableHead>
                            <TableHead className="font-semibold">
                              Importance
                            </TableHead>
                            <TableHead className="font-semibold">
                              Notes
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {loading ? (
                            <TableRow key="audit-loading" className="hover:bg-transparent">
                              <TableCell colSpan={4} className="py-12 text-center">
                                <div className="flex flex-col items-center gap-4">
                                  <div className="relative">
                                    <div className="absolute inset-0 animate-pulse rounded-full bg-primary/20 blur-xl" />
                                    <Loader2 className="relative size-10 animate-spin text-primary" />
                                  </div>
                                  <div>
                                    <p className="font-bold text-foreground">Analyzing your site...</p>
                                    <p className="text-sm text-muted-foreground">This may take a moment. TinyFish is rendering and evaluating your content.</p>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : filteredQuestions.length ? (
                            filteredQuestions.map((question, index) => {
                              const rowKey = question.id ?? `question-${index}`;
                              const isExpanded = expandedRows.has(rowKey);
                              return (
                                <React.Fragment key={rowKey}>
                                  <TableRow
                                    onClick={() => toggleRow(rowKey)}
                                    className="cursor-pointer transition-colors hover:bg-accent/50"
                                  >
                                    <TableCell className="font-medium">
                                      <div className="flex items-center gap-2">
                                        {isExpanded ? (
                                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                        ) : (
                                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                        )}
                                        <span>{question.question}</span>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <Badge
                                        className={STATUS_COLOR[question.answeredInDocs]}
                                      >
                                        {STATUS_LABELS[question.answeredInDocs]}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <Badge
                                        className={`${IMPORTANCE_COLOR[question.importance]} border-0 shadow-sm`}
                                      >
                                        {question.importance.toLowerCase()}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                      {question.partialAnswer ? (
                                        <span className="line-clamp-1">{question.partialAnswer}</span>
                                      ) : (
                                        "—"
                                      )}
                                    </TableCell>
                                  </TableRow>
                                  {isExpanded && (
                                    <TableRow key={`${rowKey}-expanded`} className="bg-muted/50">
                                      <TableCell colSpan={4} className="p-4">
                                        <div className="space-y-3">
                                          <div>
                                            <p className="text-sm font-semibold mb-1">Full Question</p>
                                            <p className="text-sm text-muted-foreground">{question.question}</p>
                                          </div>
                                          {question.partialAnswer && (
                                            <div>
                                              <p className="text-sm font-semibold mb-1">Extracted Answer</p>
                                              <div className="rounded-md border border-border bg-card p-3">
                                                <p className="text-sm">{question.partialAnswer}</p>
                                              </div>
                                            </div>
                                          )}
                                          <div className="flex items-center gap-4 text-sm">
                                            <div>
                                              <span className="font-semibold">Status:</span>{" "}
                                              <span className={
                                                question.answeredInDocs === "YES"
                                                  ? "text-success"
                                                  : question.answeredInDocs === "PARTIAL"
                                                    ? "text-warning"
                                                    : "text-destructive"
                                              }>
                                                {STATUS_LABELS[question.answeredInDocs]}
                                              </span>
                                            </div>
                                            <div>
                                              <span className="font-semibold">Priority:</span>{" "}
                                              <span>{question.importance}</span>
                                            </div>
                                            <div>
                                              <span className="font-semibold">Impact:</span>{" "}
                                              <span>{question.importance === "HIGH" ? "High (1.0x)" : "Medium (0.6x)"}</span>
                                            </div>
                                          </div>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </React.Fragment>
                              )
                            })
                          ) : (
                            <TableRow key="audit-empty" className="hover:bg-transparent">
                              <TableCell colSpan={4} className="py-16 text-center">
                                {data ? (
                                  <div className="flex flex-col items-center gap-3">
                                    <div className="rounded-full bg-muted/50 p-4">
                                      <Search className="size-10 text-muted-foreground/60" />
                                    </div>
                                    <div>
                                      <p className="font-bold text-foreground">No results match the selected filters.</p>
                                      <p className="text-sm text-muted-foreground/70">Adjust the status or importance filters above to refine your view.</p>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center gap-3">
                                    <div className="rounded-md bg-muted p-4">
                                      <FileBarChart className="h-10 w-10 text-muted-foreground" />
                                    </div>
                                    <div className="text-center">
                                      <p className="font-medium">No audit results yet</p>
                                      <p className="text-sm text-muted-foreground">Enter a URL above and run an audit</p>
                                    </div>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>
                  <TabsContent value="consistency">
                    {isMulti ? (
                      <div className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-3">
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base">Consistency Score</CardTitle>
                              <CardDescription className="text-sm">
                                Cross-page alignment
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="text-3xl font-semibold">
                                {data.consistency.consistencyScore}
                              </div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base">Compared Questions</CardTitle>
                              <CardDescription className="text-sm">
                                Total overlapping questions
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="text-3xl font-semibold">
                                {data.consistency.totalQuestions}
                              </div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base">Inconsistencies</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-3xl font-semibold text-destructive">
                                {data.consistency.inconsistencies.length}
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                        <div className="overflow-hidden rounded-md border border-border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="font-semibold">
                                  Question
                                </TableHead>
                                <TableHead className="font-semibold">
                                  Delta
                                </TableHead>
                                <TableHead className="font-semibold">
                                  Severity
                                </TableHead>
                                <TableHead className="font-semibold">
                                  Page status
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {data.consistency.inconsistencies.length ? (
                                data.consistency.inconsistencies.map((item) => (
                                  <TableRow
                                    key={item.question}
                                    className="transition-colors hover:bg-accent/50"
                                  >
                                    <TableCell className="font-medium">
                                      {item.question}
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="outline" className="shadow-sm">
                                        {item.delta}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <Badge
                                        variant="secondary"
                                        className={`shadow-sm ${item.severity === "HIGH"
                                          ? "border-0 bg-destructive/10 text-destructive dark:bg-destructive/20"
                                          : ""
                                          }`}
                                      >
                                        {item.severity.toLowerCase()}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                      {item.pages.map((page) => (
                                        <div key={`${item.question}-${page.url}`} className="py-1">
                                          <span className="font-medium">{page.url}:</span>{" "}
                                          {STATUS_LABELS[page.answeredInDocs]}
                                        </div>
                                      ))}
                                    </TableCell>
                                  </TableRow>
                                ))
                              ) : (
                                <TableRow key="consistency-empty" className="hover:bg-transparent">
                                  <TableCell colSpan={4} className="py-12 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                      <div className="rounded-full bg-success/10 p-4">
                                        <CircleCheck className="size-10 text-success" />
                                      </div>
                                      <p className="font-bold text-foreground">No inconsistencies detected.</p>
                                      <p className="text-sm text-muted-foreground">Your messaging is consistent across all audited pages.</p>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-border/60 bg-accent/30 p-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="rounded-full bg-muted p-4">
                            <Layers className="size-10 text-muted-foreground/60" />
                          </div>
                          <p className="font-bold text-foreground">Consistency analysis unavailable</p>
                          <p className="text-sm text-muted-foreground">Enable sitemap mode and run an audit to view consistency analysis.</p>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>
          </section>
        ) : null}
      </div>
    </div>
  );
}

export default function AuditPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-lg font-semibold" style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}>Loading audit...</p>
        </div>
      </div>
    }>
      <AuditPageInner />
    </Suspense>
  );
}
