import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft, Globe, Clock, ChevronRight, Gauge,
  Search, TrendingUp, BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

function scoreGrade(score: number) {
  if (score >= 90) return { grade: "A", label: "Excellent", style: { color: "oklch(0.90 0.22 155)", background: "oklch(0.90 0.22 155 / 0.12)", borderColor: "oklch(0.90 0.22 155 / 0.30)" } };
  if (score >= 75) return { grade: "B", label: "Good",      style: { color: "oklch(0.80 0.18 155)", background: "oklch(0.80 0.18 155 / 0.12)", borderColor: "oklch(0.80 0.18 155 / 0.30)" } };
  if (score >= 50) return { grade: "C", label: "Needs Work",style: { color: "oklch(0.80 0.18 85)",  background: "oklch(0.80 0.18 85 / 0.12)",  borderColor: "oklch(0.80 0.18 85 / 0.30)"  } };
  return                  { grade: "D", label: "Poor",      style: { color: "oklch(0.63 0.22 25)",  background: "oklch(0.63 0.22 25 / 0.12)",  borderColor: "oklch(0.63 0.22 25 / 0.30)"  } };
}

function scoreColor(score: number) {
  if (score >= 90) return "oklch(0.90 0.22 155)";
  if (score >= 75) return "oklch(0.80 0.18 155)";
  if (score >= 50) return "oklch(0.80 0.18 85)";
  return "oklch(0.63 0.22 25)";
}

function ScoreMini({ score }: { score: number }) {
  const r = 18; const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="relative w-12 h-12 flex-shrink-0">
      <svg width="48" height="48" viewBox="0 0 48 48" className="-rotate-90">
        <circle cx="24" cy="24" r={r} fill="none" stroke="oklch(0.14 0.010 155)" strokeWidth="4" />
        <circle cx="24" cy="24" r={r} fill="none" stroke={scoreColor(score)} strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="gauge-arc" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[11px] font-bold" style={{ color: scoreColor(score) }}>{score}</span>
      </div>
    </div>
  );
}

export default function History() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");

  const { data: audits, isLoading } = trpc.audit.recent.useQuery({ limit: 50 });

  const filtered = (audits || []).filter(a =>
    a.url.toLowerCase().includes(search.toLowerCase())
  );

  const avgScore = audits && audits.length > 0
    ? Math.round(audits.reduce((s, a) => s + (a.overallScore ?? 0), 0) / audits.length)
    : 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <div className="sticky top-0 z-40 border-b border-border/50 bg-background/90 backdrop-blur-xl">
        <div className="container flex items-center gap-3 h-14">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="-ml-2">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-primary" />
            <span className="font-bold text-sm">WebAudit</span>
            <span className="text-border">/</span>
            <span className="text-sm text-muted-foreground">Recent Audits</span>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Recent Audits</h1>
          <p className="text-muted-foreground">Browse the latest completed website audits. Click any result to view the full report.</p>
        </motion.div>

        {/* Stats */}
        {audits && audits.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
            {[
              { icon: BarChart3, label: "Total Audits", value: audits.length },
              { icon: TrendingUp, label: "Average Score", value: `${avgScore}/100` },
              { icon: Globe, label: "Unique Sites", value: new Set(audits.map(a => new URL(a.url).hostname)).size },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-xl border border-border/50 bg-card/40 p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Icon className="w-4 h-4" />
                  <span className="text-xs">{label}</span>
                </div>
                <p className="text-2xl font-bold">{value}</p>
              </div>
            ))}
          </motion.div>
        )}

        {/* Search */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Filter by URL..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-card/40 border-border/50"
            />
          </div>
        </motion.div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-20 rounded-2xl shimmer" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <Globe className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-semibold mb-2">{search ? "No matching audits" : "No audits yet"}</h3>
            <p className="text-muted-foreground text-sm mb-6">{search ? "Try a different search term." : "Be the first to audit a website!"}</p>
            <Button onClick={() => navigate("/")} className="gap-2">Start an Audit <ChevronRight className="w-4 h-4" /></Button>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {filtered.map((audit, i) => {
              const grade = scoreGrade(audit.overallScore ?? 0);
              let hostname = "";
              try { hostname = new URL(audit.url).hostname; } catch {}
              return (
                <motion.button
                  key={audit.id}
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  onClick={() => navigate(`/audit/${audit.slug}`)}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border/50 bg-card/40 hover:bg-card/70 hover:border-border transition-all duration-200 text-left group"
                >
                  <ScoreMini score={audit.overallScore ?? 0} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="font-semibold text-sm truncate">{hostname}</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border" style={grade.style}>{grade.grade} — {grade.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate font-mono">{audit.url}</p>
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground/60">
                      <Clock className="w-3 h-3" />
                      {audit.completedAt
                        ? new Date(audit.completedAt).toLocaleString()
                        : new Date(audit.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
