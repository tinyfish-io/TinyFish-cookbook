import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  ArrowLeft, Share2, Download, CheckCircle2, XCircle, AlertTriangle,
  Info, ChevronDown, ChevronUp, Zap, Eye, Search, Shield, Lock,
  CheckCircle, Gauge, ExternalLink, Copy, FileJson, FileText as FileHtml
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AuditItem {
  id: string;
  title: string;
  description: string;
  result: "pass" | "fail" | "warn" | "info";
  details?: string;
}

interface AuditCategory {
  id: string;
  title: string;
  description: string;
  score: number;
  items: AuditItem[];
}

interface AuditResults {
  url: string;
  auditedAt: string;
  statusCode: number;
  pageInfo: { title: string; lang: string; description: string };
  overallScore: number;
  screenshot?: string;
  categories: Record<string, AuditCategory>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const CATEGORY_META: Record<string, { icon: any; color: string; bg: string }> = {
  performance:     { icon: Zap,          color: "oklch(0.78 0.18 75)",  bg: "oklch(0.78 0.18 75 / 0.12)" },
  accessibility:   { icon: Eye,          color: "oklch(0.72 0.19 145)", bg: "oklch(0.72 0.19 145 / 0.12)" },
  seo:             { icon: Search,       color: "oklch(0.65 0.18 210)", bg: "oklch(0.65 0.18 210 / 0.12)" },
  "best-practices":{ icon: CheckCircle,  color: "oklch(0.70 0.18 290)", bg: "oklch(0.70 0.18 290 / 0.12)" },
  security:        { icon: Shield,       color: "oklch(0.90 0.22 155)", bg: "oklch(0.90 0.22 155 / 0.10)" },
  compliance:      { icon: Lock,         color: "oklch(0.72 0.19 320)", bg: "oklch(0.72 0.19 320 / 0.12)" },
};

function scoreColor(score: number) {
  if (score >= 90) return "oklch(0.90 0.22 155)"; /* spring green */
  if (score >= 75) return "oklch(0.80 0.18 155)"; /* lighter green */
  if (score >= 50) return "oklch(0.80 0.18 85)";  /* amber */
  return "oklch(0.63 0.22 25)";                   /* red */
}

function scoreGrade(score: number) {
  if (score >= 90) return { grade: "A", label: "Excellent", cls: "border" , style: { color: "oklch(0.90 0.22 155)", background: "oklch(0.90 0.22 155 / 0.12)", borderColor: "oklch(0.90 0.22 155 / 0.30)" } };
  if (score >= 75) return { grade: "B", label: "Good",      cls: "border", style: { color: "oklch(0.80 0.18 155)", background: "oklch(0.80 0.18 155 / 0.12)", borderColor: "oklch(0.80 0.18 155 / 0.30)" } };
  if (score >= 50) return { grade: "C", label: "Needs Work",cls: "border", style: { color: "oklch(0.80 0.18 85)",  background: "oklch(0.80 0.18 85 / 0.12)",  borderColor: "oklch(0.80 0.18 85 / 0.30)"  } };
  return                  { grade: "D", label: "Poor",      cls: "border", style: { color: "oklch(0.63 0.22 25)",  background: "oklch(0.63 0.22 25 / 0.12)",  borderColor: "oklch(0.63 0.22 25 / 0.30)"  } };
}

function GaugeCircle({ score, size = 120, strokeWidth = 10 }: { score: number; size?: number; strokeWidth?: number }) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = scoreColor(score);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="oklch(0.14 0.010 155)" strokeWidth={strokeWidth} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        className="gauge-arc"
        style={{ "--gauge-offset": offset } as any}
      />
    </svg>
  );
}

const AUDIT_STAGES = [
  "Launching headless browser...",
  "Loading page resources...",
  "Measuring performance metrics...",
  "Running accessibility checks...",
  "Analysing SEO signals...",
  "Checking security headers...",
  "Evaluating compliance...",
  "Generating report...",
];

// ── Main Component ────────────────────────────────────────────────────────────

export default function AuditResults() {
  const { slug } = useParams<{ slug: string }>();
  const [, navigate] = useLocation();
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [stageIdx, setStageIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data, refetch } = trpc.audit.getBySlug.useQuery(
    { slug: slug! },
    { enabled: !!slug, refetchInterval: false }
  );

  // Poll while pending/running
  useEffect(() => {
    if (!data) return;
    if (data.status === "completed" || data.status === "failed") {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(() => { refetch(); }, 2500);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [data?.status]);

  // Stage cycling
  useEffect(() => {
    if (data?.status !== "running" && data?.status !== "pending") return;
    const t = setInterval(() => {
      setStageIdx((i) => (i + 1) % AUDIT_STAGES.length);
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 3500);
    return () => clearInterval(t);
  }, [data?.status]);

  const toggleCat = (id: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard!");
  };

  const downloadJSON = () => {
    if (!data?.results) return;
    const blob = new Blob([JSON.stringify(data.results, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `webaudit-${slug}.json`; a.click();
  };

  const downloadHTML = () => {
    if (!data?.results) return;
    const results = data.results as AuditResults;
    // Build a simple self-contained HTML report
    const html = buildHTMLReport(results, slug!);
    const blob = new Blob([html], { type: "text/html" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `webaudit-${slug}.html`; a.click();
  };

  // ── Loading / Pending ──────────────────────────────────────────────────────

  if (!data || data.status === "pending" || data.status === "running") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md text-center">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6 relative">
            <Gauge className="w-9 h-9 text-primary animate-pulse" />
            <div className="absolute inset-0 rounded-2xl border border-primary/30 animate-ping opacity-30" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Auditing Your Site</h2>
          <p className="text-muted-foreground text-sm mb-2 font-mono truncate max-w-full">{data?.url || "Loading..."}</p>
          <p className="text-xs text-muted-foreground mb-8">Estimated time: ~30–60 seconds · {elapsed}s elapsed</p>

          <div className="bg-card/60 border border-border/50 rounded-2xl p-6 mb-6">
            <AnimatePresence mode="wait">
              <motion.p
                key={stageIdx}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="text-sm text-primary font-medium mb-4"
              >
                {AUDIT_STAGES[stageIdx]}
              </motion.p>
            </AnimatePresence>
            <div className="space-y-2">
              {AUDIT_STAGES.map((stage, i) => (
                <div key={stage} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 transition-all duration-500 ${i < stageIdx ? "bg-primary" : i === stageIdx ? "bg-primary animate-pulse" : "bg-border"}`} />
                  <span className={`text-xs transition-colors duration-300 ${i < stageIdx ? "text-muted-foreground line-through" : i === stageIdx ? "text-foreground" : "text-muted-foreground/40"}`}>{stage}</span>
                </div>
              ))}
            </div>
          </div>

          <Progress value={(stageIdx / AUDIT_STAGES.length) * 100} className="h-1.5 bg-border" />
        </motion.div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────

  if (data.status === "failed") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Audit Failed</h2>
          <p className="text-muted-foreground text-sm mb-6">{data.errorMessage || "The audit could not be completed. The site may be unreachable or blocked."}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate("/")} className="gap-2"><ArrowLeft className="w-4 h-4" /> Try Again</Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Results ────────────────────────────────────────────────────────────────

  const results = data.results as AuditResults;
  if (!results) return null;
  const overall = scoreGrade(results.overallScore);
  const cats = Object.values(results.categories);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <div className="sticky top-0 z-40 border-b border-border/50 bg-background/90 backdrop-blur-xl">
        <div className="container flex items-center justify-between h-14 gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="flex-shrink-0 -ml-2">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2 min-w-0">
              <Gauge className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="font-bold text-sm hidden sm:block">WebAudit</span>
              <span className="text-border hidden sm:block">/</span>
              <span className="text-sm text-muted-foreground truncate font-mono">{results.url}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={copyShareLink} className="gap-1.5 hidden sm:flex">
              <Share2 className="w-3.5 h-3.5" /> Share
            </Button>
            <Button variant="outline" size="sm" onClick={downloadJSON} className="gap-1.5 hidden sm:flex">
              <FileJson className="w-3.5 h-3.5" /> JSON
            </Button>
            <Button variant="outline" size="sm" onClick={downloadHTML} className="gap-1.5">
              <FileHtml className="w-3.5 h-3.5" /> <span className="hidden sm:inline">HTML</span> Report
            </Button>
          </div>
        </div>
      </div>

      <div className="container py-8 space-y-8">
        {/* Overall score hero */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border/50 bg-card/50 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Big gauge */}
            <div className="relative flex-shrink-0">
              <GaugeCircle score={results.overallScore} size={140} strokeWidth={12} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black" style={{ color: scoreColor(results.overallScore) }}>{results.overallScore}</span>
                <span className="text-xs text-muted-foreground">/ 100</span>
              </div>
            </div>
            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                <h1 className="text-2xl font-bold">Overall Score</h1>
                <Badge variant="outline" className={`text-xs font-bold px-2 py-0.5 ${overall.cls}`} style={overall.style}>{overall.grade} — {overall.label}</Badge>
              </div>
              <p className="text-muted-foreground text-sm mb-1 font-mono">{results.url}</p>
              <p className="text-xs text-muted-foreground mb-4">
                Audited {new Date(results.auditedAt).toLocaleString()} · HTTP {results.statusCode} · {results.pageInfo.title || "No title"}
              </p>
              {/* Summary stats */}
              <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                {[
                  { label: "Passed", count: cats.reduce((s, c) => s + c.items.filter(i => i.result === "pass").length, 0), cls: "", style: { color: "oklch(0.90 0.22 155)", background: "oklch(0.90 0.22 155 / 0.10)", borderColor: "oklch(0.90 0.22 155 / 0.25)" } },
                  { label: "Failed", count: cats.reduce((s, c) => s + c.items.filter(i => i.result === "fail").length, 0), cls: "text-red-400 bg-red-400/10 border-red-400/20" },
                  { label: "Warnings", count: cats.reduce((s, c) => s + c.items.filter(i => i.result === "warn").length, 0), cls: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
                  { label: "Total Checks", count: cats.reduce((s, c) => s + c.items.length, 0), cls: "text-muted-foreground bg-muted/50 border-border" },
                ].map(({ label, count, cls, style: s }: any) => (
                  <div key={label} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${cls}`} style={s}>
                    <span className="text-base font-bold">{count}</span> {label}
                  </div>
                ))}
              </div>
            </div>
            {/* Screenshot */}
            {results.screenshot && (
              <div className="flex-shrink-0 hidden lg:block">
                <img src={`data:image/jpeg;base64,${results.screenshot}`} alt="Page screenshot" className="w-48 h-32 object-cover rounded-xl border border-border/50 shadow-lg" />
              </div>
            )}
          </div>
        </motion.div>

        {/* Category score cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {cats.map((cat, i) => {
            const meta = CATEGORY_META[cat.id] || CATEGORY_META["performance"];
            const Icon = meta.icon;
            const grade = scoreGrade(cat.score);
            return (
              <motion.button
                key={cat.id}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                onClick={() => { toggleCat(cat.id); document.getElementById(`cat-${cat.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
                className="group p-4 rounded-2xl border border-border/50 bg-card/40 hover:bg-card/70 hover:border-border transition-all duration-200 text-center cursor-pointer"
              >
                <div className="relative w-14 h-14 mx-auto mb-3">
                  <GaugeCircle score={cat.score} size={56} strokeWidth={5} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold" style={{ color: scoreColor(cat.score) }}>{cat.score}</span>
                  </div>
                </div>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center mx-auto mb-2" style={{ background: meta.bg }}>
                  <Icon className="w-3.5 h-3.5" style={{ color: meta.color }} />
                </div>
                <p className="text-xs font-semibold truncate">{cat.title}</p>
                <Badge variant="outline" className={`mt-1 text-[10px] px-1.5 py-0 ${grade.cls}`} style={grade.style}>{grade.grade}</Badge>
              </motion.button>
            );
          })}
        </div>

        {/* Category detail panels */}
        <div className="space-y-4">
          {cats.map((cat, ci) => {
            const meta = CATEGORY_META[cat.id] || CATEGORY_META["performance"];
            const Icon = meta.icon;
            const grade = scoreGrade(cat.score);
            const isOpen = expandedCats.has(cat.id);
            const failCount = cat.items.filter(i => i.result === "fail").length;
            const warnCount = cat.items.filter(i => i.result === "warn").length;
            const passCount = cat.items.filter(i => i.result === "pass").length;

            return (
              <motion.div
                key={cat.id} id={`cat-${cat.id}`}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + ci * 0.06 }}
                className="rounded-2xl border border-border/50 bg-card/40 overflow-hidden"
              >
                {/* Header */}
                <button
                  onClick={() => toggleCat(cat.id)}
                  className="w-full flex items-center gap-4 p-5 hover:bg-card/70 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: meta.bg }}>
                    <Icon className="w-5 h-5" style={{ color: meta.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{cat.title}</h3>
                      <Badge variant="outline" className={`text-xs ${grade.cls}`} style={grade.style}>{cat.score}/100 · {grade.grade}</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      {passCount > 0 && <span className="text-xs text-emerald-400">{passCount} passed</span>}
                      {failCount > 0 && <span className="text-xs text-red-400">{failCount} failed</span>}
                      {warnCount > 0 && <span className="text-xs text-amber-400">{warnCount} warnings</span>}
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-muted-foreground">
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {/* Items */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-border/40 divide-y divide-border/30">
                        {cat.items.map((item) => (
                          <AuditItemRow key={item.id} item={item} />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* Mobile action buttons */}
        <div className="flex gap-3 sm:hidden pb-4">
          <Button variant="outline" onClick={copyShareLink} className="flex-1 gap-2"><Share2 className="w-4 h-4" /> Share</Button>
          <Button variant="outline" onClick={downloadJSON} className="flex-1 gap-2"><FileJson className="w-4 h-4" /> JSON</Button>
          <Button variant="outline" onClick={downloadHTML} className="flex-1 gap-2"><FileHtml className="w-4 h-4" /> HTML</Button>
        </div>
      </div>
    </div>
  );
}

// ── Audit Item Row ─────────────────────────────────────────────────────────────

function AuditItemRow({ item }: { item: AuditItem }) {
  const [expanded, setExpanded] = useState(false);

  const icons = {
    pass: <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />,
    fail: <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />,
    warn: <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />,
    info: <Info className="w-4 h-4 text-sky-400 flex-shrink-0" />,
  };

  const badgeCls = {
    pass: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    fail: "text-red-400 bg-red-400/10 border-red-400/20",
    warn: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    info: "text-sky-400 bg-sky-400/10 border-sky-400/20",
  };

  const rowBg = {
    pass: "",
    fail: "bg-red-500/3",
    warn: "bg-amber-500/3",
    info: "",
  };

  return (
    <div className={`${rowBg[item.result]}`}>
      <button
        onClick={() => item.details && setExpanded(!expanded)}
        className={`w-full flex items-start gap-3 px-5 py-3.5 text-left transition-colors ${item.details ? "hover:bg-card/50 cursor-pointer" : "cursor-default"}`}
      >
        {icons[item.result]}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{item.title}</span>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${badgeCls[item.result]}`}>{item.result.toUpperCase()}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.description}</p>
        </div>
        {item.details && (
          <div className="flex-shrink-0 text-muted-foreground/50 mt-0.5">
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        )}
      </button>
      <AnimatePresence>
        {expanded && item.details && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 ml-7">
              <div className="bg-background/60 border border-border/40 rounded-xl p-3">
                <p className="text-xs font-mono text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">{item.details}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── HTML Report Builder ───────────────────────────────────────────────────────

function buildHTMLReport(results: AuditResults, slug: string): string {
  const cats = Object.values(results.categories);
  const overall = scoreGrade(results.overallScore);

  const catRows = cats.map(cat => {
    const items = cat.items.map(item => {
      const icon = { pass: "✅", fail: "❌", warn: "⚠️", info: "ℹ️" }[item.result];
      return `<tr style="border-bottom:1px solid #2a2a3a">
        <td style="padding:10px 12px;width:32px;text-align:center">${icon}</td>
        <td style="padding:10px 12px"><strong style="font-size:13px">${item.title}</strong><br><span style="font-size:12px;color:#888">${item.description}</span></td>
        <td style="padding:10px 12px;font-size:12px;color:#aaa;font-family:monospace;max-width:300px;word-break:break-word">${item.details || ""}</td>
        <td style="padding:10px 12px;font-size:11px;font-weight:700;text-transform:uppercase;color:${{ pass:"#4ade80", fail:"#f87171", warn:"#fbbf24", info:"#38bdf8" }[item.result]}">${item.result}</td>
      </tr>`;
    }).join("");
    return `<section style="margin-bottom:32px;background:#13131f;border:1px solid #2a2a3a;border-radius:12px;overflow:hidden">
      <div style="padding:20px 24px;border-bottom:1px solid #2a2a3a;display:flex;align-items:center;justify-content:space-between">
        <h2 style="margin:0;font-size:16px;font-weight:700">${cat.title}</h2>
        <span style="font-size:13px;font-weight:700;padding:4px 12px;border-radius:20px;background:#1e1e2e;color:#a78bfa">${cat.score}/100</span>
      </div>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="background:#0f0f1a">
          <th style="padding:8px 12px;text-align:left;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.5px"></th>
          <th style="padding:8px 12px;text-align:left;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.5px">Audit</th>
          <th style="padding:8px 12px;text-align:left;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.5px">Details</th>
          <th style="padding:8px 12px;text-align:left;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.5px">Result</th>
        </tr></thead>
        <tbody>${items}</tbody>
      </table>
    </section>`;
  }).join("");

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>WebAudit Report — ${results.url}</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0a14;color:#e8e8f0;line-height:1.6}a{color:#818cf8}</style>
</head><body>
<div style="max-width:960px;margin:0 auto;padding:32px 16px">
  <div style="background:linear-gradient(135deg,#1a1a2e,#16213e);border-radius:16px;padding:32px;margin-bottom:32px">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
      <span style="font-size:24px;font-weight:900;letter-spacing:-1px">Web<span style="color:#818cf8">Audit</span></span>
    </div>
    <h1 style="font-size:14px;font-weight:400;opacity:.8;word-break:break-all">${results.url}</h1>
    <div style="margin-top:12px;font-size:12px;opacity:.6;display:flex;gap:24px;flex-wrap:wrap">
      <span>Audited: ${new Date(results.auditedAt).toLocaleString()}</span>
      <span>HTTP ${results.statusCode}</span>
      <span>Score: ${results.overallScore}/100 — ${overall.grade} (${overall.label})</span>
    </div>
  </div>
  ${catRows}
  <div style="text-align:center;padding:24px;color:#555;font-size:12px;border-top:1px solid #2a2a3a;margin-top:16px">Generated by WebAudit — ${new Date().toUTCString()}</div>
</div></body></html>`;
}
