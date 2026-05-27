import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, Loader2, Clock, ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AppLayout from "@/components/layout/AppLayout";
import { fetchExecutions, DbExecution } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  success: { icon: CheckCircle2, color: "text-success", label: "Success" },
  failed: { icon: AlertCircle, color: "text-destructive", label: "Failed" },
  running: { icon: Loader2, color: "text-primary", label: "Running" },
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function ExecutionRow({ exec }: { exec: DbExecution }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[exec.status] || STATUS_CONFIG.running;
  const Icon = cfg.icon;

  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-secondary/30 transition-colors">
        <Icon className={cn("h-4 w-4 shrink-0", cfg.color, exec.status === "running" && "animate-spin")} />
        <span className="font-medium text-sm flex-1">{exec.action_name}</span>
        <Badge variant="secondary" className="text-[10px] font-mono">{cfg.label}</Badge>
        {exec.duration && <span className="text-xs font-mono text-muted-foreground">{(exec.duration / 1000).toFixed(1)}s</span>}
        <span className="text-xs font-mono text-muted-foreground">{formatTime(exec.started_at)}</span>
        {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border overflow-hidden"
          >
            <div className="p-4 space-y-2">
              {exec.steps.map((step, i) => (
                <div key={step.stepId} className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-xs",
                  step.status === "success" && "bg-success/5",
                  step.status === "failed" && "bg-destructive/5",
                  step.status === "running" && "bg-primary/5",
                )}>
                  {step.status === "success" && <CheckCircle2 className="h-3 w-3 text-success" />}
                  {step.status === "failed" && <AlertCircle className="h-3 w-3 text-destructive" />}
                  {step.status === "running" && <Loader2 className="h-3 w-3 text-primary animate-spin" />}
                  {step.status === "pending" && <Clock className="h-3 w-3 text-muted-foreground" />}
                  <span className="font-mono text-muted-foreground">Step {i + 1}</span>
                  <span className="flex-1" />
                  {step.duration && <span className="font-mono text-muted-foreground">{step.duration}ms</span>}
                  {step.error && <span className="text-destructive truncate max-w-xs">{step.error}</span>}
                </div>
              ))}
              {exec.result && (
                <div className="mt-2 rounded-md bg-success/5 border border-success/20 p-3">
                  <pre className="text-xs font-mono text-foreground">{JSON.stringify(exec.result, null, 2)}</pre>
                </div>
              )}
              {exec.error && (
                <div className="mt-2 rounded-md bg-destructive/5 border border-destructive/20 p-3">
                  <p className="text-xs font-mono text-destructive">{exec.error}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ExecutionMonitor() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [executions, setExecutions] = useState<DbExecution[]>([]);
  const [loading, setLoading] = useState(true);

  const loadExecutions = async () => {
    setLoading(true);
    try {
      const data = await fetchExecutions();
      setExecutions(data);
    } catch {
      toast.error("Failed to load executions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExecutions();
  }, []);

  const filtered = executions.filter((e) => statusFilter === "all" || e.status === statusFilter);

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">Execution Monitor</h1>
            <p className="text-sm text-muted-foreground">Real-time feed of action executions.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadExecutions} disabled={loading} className="gap-1.5">
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              Refresh
            </Button>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] h-9 bg-secondary border-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="running">Running</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((exec, i) => (
              <motion.div key={exec.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <ExecutionRow exec={exec} />
              </motion.div>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-16 text-muted-foreground text-sm">
                {executions.length === 0 ? "No executions yet. Run an action from the Playground." : "No executions match your filter."}
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
