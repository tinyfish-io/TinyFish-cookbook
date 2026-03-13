import { useState, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Play, Copy, Check, Trash2, GripVertical, Globe, MousePointerClick, Keyboard, Download, Clock, AlertCircle, CheckCircle2, Loader2, Save, FlaskConical, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AppLayout from "@/components/layout/AppLayout";
import { ActionStep, StepType, STEP_LABELS, ExecutionStep, StepStatus } from "@/types/action";
import { ActionDefinitionSchema } from "@/types/action";
import { cn } from "@/lib/utils";
import { createAction, updateAction, fetchAction, executeAction, getOrCreateApiKey } from "@/lib/api";
import { toast } from "sonner";

const STEP_ICON_MAP: Record<StepType, React.ElementType> = {
  navigate: Globe,
  click: MousePointerClick,
  type: Keyboard,
  extract: Download,
  wait: Clock,
};

const generateId = () => Math.random().toString(36).slice(2, 10);

const createStep = (type: StepType): ActionStep => ({
  id: generateId(),
  type,
  config: {
    ...(type === "navigate" && { url: "" }),
    ...(type === "click" && { selector: "" }),
    ...(type === "type" && { selector: "", text: "" }),
    ...(type === "extract" && { selector: "", extractKey: "" }),
    ...(type === "wait" && { selector: "", timeout: 5000 }),
  },
});

export default function Playground() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("id");

  const [actionId, setActionId] = useState<string | null>(editId);
  const [actionName, setActionName] = useState("My Action");
  const [steps, setSteps] = useState<ActionStep[]>([createStep("navigate")]);

  const loadDemo = () => {
    setActionId(null);
    setActionName("Scrape Hacker News");
    setSteps([
      { id: generateId(), type: "navigate", config: { url: "https://news.ycombinator.com" } },
      { id: generateId(), type: "wait", config: { selector: ".itemlist", timeout: 5000 } },
      { id: generateId(), type: "extract", config: { selector: ".titleline > a", extractKey: "top_stories" } },
      { id: generateId(), type: "extract", config: { selector: ".score", extractKey: "scores" } },
    ]);
    setExecutionSteps([]);
    setExecutionResult(null);
    setExecutionError(null);
    toast.success("Demo action loaded — click Run Action to execute");
  };
  const [copied, setCopied] = useState(false);
  const [apiKeyCopied, setApiKeyCopied] = useState(false);
  const [codeView, setCodeView] = useState<"json" | "typescript">("json");
  const [executing, setExecuting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>([]);
  const [executionResult, setExecutionResult] = useState<Record<string, unknown> | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);

  // Load action if editing
  useEffect(() => {
    if (editId) {
      fetchAction(editId).then((a) => {
        setActionId(a.id);
        setActionName(a.name);
        setSteps(a.steps.length > 0 ? a.steps : [createStep("navigate")]);
        // Load existing API key
        getOrCreateApiKey(a.id).then(setApiKey).catch(() => {});
      }).catch(() => {
        toast.error("Failed to load action");
      });
    }
  }, [editId]);

  const addStep = (type: StepType) => {
    setSteps((prev) => [...prev, createStep(type)]);
  };

  const removeStep = (id: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  };

  const updateStepConfig = (id: string, key: string, value: string | number) => {
    setSteps((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, config: { ...s.config, [key]: value } } : s
      )
    );
  };

  const actionDef = {
    id: actionId || "action_draft",
    name: actionName,
    steps,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const validation = ActionDefinitionSchema.safeParse(actionDef);

  const jsonOutput = JSON.stringify(actionDef, null, 2);

  const tsOutput = `import { SynapseAction } from "@synapse/sdk";

const ${actionName.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()} = new SynapseAction({
  name: "${actionName}",
  steps: [
${steps.map((s) => `    { type: "${s.type}", ${Object.entries(s.config).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(", ")} }`).join(",\n")}
  ],
});

const result = await ${actionName.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()}.execute();
console.log(result);`;

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(codeView === "json" ? jsonOutput : tsOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [codeView, jsonOutput, tsOutput]);

  const handleSave = async () => {
    setSaving(true);
    try {
      let savedId = actionId;
      if (actionId) {
        await updateAction(actionId, { name: actionName, steps });
        toast.success("Action updated");
      } else {
        const saved = await createAction({ name: actionName, steps });
        savedId = saved.id;
        setActionId(saved.id);
        toast.success("Action saved");
        navigate(`/playground?id=${saved.id}`, { replace: true });
      }
      // Generate API key
      if (savedId) {
        const key = await getOrCreateApiKey(savedId);
        setApiKey(key);
      }
    } catch (err: unknown) {
      toast.error("Failed to save: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const handleExecute = async () => {
    setExecuting(true);
    setExecutionResult(null);
    setExecutionError(null);
    setExecutionSteps(steps.map((s) => ({ stepId: s.id, status: "running" as StepStatus })));

    try {
      const result = await executeAction({
        actionId: actionId || undefined,
        actionName,
        steps,
      });

      if (result.status === "success") {
        setExecutionSteps(steps.map((s) => ({ stepId: s.id, status: "success" as StepStatus, duration: result.duration ? Math.round(result.duration / steps.length) : undefined })));
        setExecutionResult(result.result || { status: "success" });
        toast.success("Action executed successfully");
      } else {
        setExecutionSteps(steps.map((s, i) => ({
          stepId: s.id,
          status: (i === steps.length - 1 ? "failed" : "success") as StepStatus,
          duration: result.duration ? Math.round(result.duration / steps.length) : undefined,
          ...(i === steps.length - 1 ? { error: result.error } : {}),
        })));
        setExecutionError(result.error || "Execution failed");
        toast.error("Action execution failed");
      }
    } catch (err: unknown) {
      setExecutionSteps(steps.map((s) => ({ stepId: s.id, status: "failed" as StepStatus })));
      setExecutionError(err instanceof Error ? err.message : "Unknown error");
      toast.error("Execution error");
    } finally {
      setExecuting(false);
    }
  };

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-3.5rem)] flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-border px-6 py-3">
          <div className="flex items-center gap-3">
            <Input
              value={actionName}
              onChange={(e) => setActionName(e.target.value)}
              className="h-8 w-60 bg-secondary border-none font-medium text-sm"
            />
            <Badge variant={validation.success ? "default" : "destructive"} className="text-xs font-mono gap-1">
              {validation.success ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
              {validation.success ? "Valid" : "Invalid"}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={loadDemo} className="gap-2 text-muted-foreground">
              <FlaskConical className="h-4 w-4" />
              Load Demo
            </Button>
            <Button variant="outline" onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {actionId ? "Update" : "Save"}
            </Button>
            <Button onClick={handleExecute} disabled={executing || steps.length === 0} className="gap-2">
              {executing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Run Action
            </Button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left: Step Builder */}
          <div className="w-[400px] shrink-0 border-r border-border overflow-y-auto p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Steps</h2>
              <span className="text-xs text-muted-foreground font-mono">{steps.length} step{steps.length !== 1 ? "s" : ""}</span>
            </div>

            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {steps.map((step, index) => {
                  const Icon = STEP_ICON_MAP[step.type];
                  return (
                    <motion.div
                      key={step.id}
                      layout
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="rounded-lg border border-border bg-card p-3"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <GripVertical className="h-4 w-4 text-muted-foreground/40 cursor-grab" />
                        <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-[10px] font-mono text-primary font-bold">{index + 1}</span>
                        <Icon className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium flex-1">{STEP_LABELS[step.type]}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeStep(step.id)}>
                          <Trash2 className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      </div>
                      <div className="space-y-2 pl-7">
                        {step.type === "navigate" && (
                          <Input placeholder="https://example.com" value={step.config.url || ""} onChange={(e) => updateStepConfig(step.id, "url", e.target.value)} className="h-7 text-xs font-mono bg-secondary border-none" />
                        )}
                        {(step.type === "click" || step.type === "wait") && (
                          <Input placeholder="CSS selector or description" value={step.config.selector || ""} onChange={(e) => updateStepConfig(step.id, "selector", e.target.value)} className="h-7 text-xs font-mono bg-secondary border-none" />
                        )}
                        {step.type === "type" && (
                          <>
                            <Input placeholder="CSS selector" value={step.config.selector || ""} onChange={(e) => updateStepConfig(step.id, "selector", e.target.value)} className="h-7 text-xs font-mono bg-secondary border-none" />
                            <Input placeholder="Text to type" value={step.config.text || ""} onChange={(e) => updateStepConfig(step.id, "text", e.target.value)} className="h-7 text-xs font-mono bg-secondary border-none" />
                          </>
                        )}
                        {step.type === "extract" && (
                          <>
                            <Input placeholder="CSS selector" value={step.config.selector || ""} onChange={(e) => updateStepConfig(step.id, "selector", e.target.value)} className="h-7 text-xs font-mono bg-secondary border-none" />
                            <Input placeholder="Key name (e.g. cart_total)" value={step.config.extractKey || ""} onChange={(e) => updateStepConfig(step.id, "extractKey", e.target.value)} className="h-7 text-xs font-mono bg-secondary border-none" />
                          </>
                        )}
                        {step.type === "wait" && (
                          <Input type="number" placeholder="Timeout (ms)" value={step.config.timeout || 5000} onChange={(e) => updateStepConfig(step.id, "timeout", parseInt(e.target.value))} className="h-7 text-xs font-mono bg-secondary border-none w-32" />
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Add Step */}
            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-2 font-medium">Add Step</p>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(STEP_LABELS) as StepType[]).map((type) => {
                  const Icon = STEP_ICON_MAP[type];
                  return (
                    <Button key={type} variant="outline" size="sm" className="justify-start gap-2 text-xs h-8" onClick={() => addStep(type)}>
                      <Icon className="h-3.5 w-3.5" />
                      {STEP_LABELS[type].replace(/ .*/, "")}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Code + Execution */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Code Output */}
            <div className="flex-1 overflow-hidden flex flex-col border-b border-border">
              <div className="flex items-center justify-between border-b border-border px-4 py-2">
                <Tabs value={codeView} onValueChange={(v) => setCodeView(v as "json" | "typescript")}>
                  <TabsList className="h-7 bg-secondary">
                    <TabsTrigger value="json" className="text-xs h-5 px-3">JSON</TabsTrigger>
                    <TabsTrigger value="typescript" className="text-xs h-5 px-3">TypeScript</TabsTrigger>
                  </TabsList>
                </Tabs>
                <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-1.5 text-xs h-7">
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <pre className="flex-1 overflow-auto p-4 text-xs font-mono text-muted-foreground leading-relaxed">
                <code>{codeView === "json" ? jsonOutput : tsOutput}</code>
              </pre>
              {/* API Key Panel */}
              {apiKey && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="border-t border-border px-4 py-3 bg-primary/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Key className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-semibold text-primary">Your API Endpoint</span>
                  </div>
                  <div className="rounded-md bg-secondary p-2.5 font-mono text-xs text-muted-foreground space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5">GET</Badge>
                      <code className="flex-1 truncate">{`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/run-action`}</code>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground/60">X-API-Key:</span>
                      <code className="flex-1 truncate">{apiKey}</code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 shrink-0"
                        onClick={() => {
                          navigator.clipboard.writeText(apiKey);
                          setApiKeyCopied(true);
                          setTimeout(() => setApiKeyCopied(false), 2000);
                        }}
                      >
                        {apiKeyCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                    <div className="pt-1 border-t border-border/50">
                      <p className="text-[10px] text-muted-foreground/60">
                        curl -H "X-API-Key: {apiKey.slice(0, 8)}..." {`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/run-action`}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Execution Panel */}
            <div className="h-[240px] shrink-0 overflow-y-auto p-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Execution Timeline</h3>
              {executionSteps.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                  Click "Run Action" to execute via TinyFish
                </div>
              ) : (
                <div className="space-y-2">
                  {executionSteps.map((es, i) => {
                    const step = steps.find((s) => s.id === es.stepId);
                    return (
                      <div key={es.stepId} className={cn(
                        "flex items-center gap-3 rounded-md border px-3 py-2 text-xs",
                        es.status === "success" && "border-success/30 bg-success/5",
                        es.status === "failed" && "border-destructive/30 bg-destructive/5",
                        es.status === "running" && "border-primary/30 bg-primary/5",
                        es.status === "pending" && "border-border bg-card",
                      )}>
                        {es.status === "success" && <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />}
                        {es.status === "failed" && <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                        {es.status === "running" && <Loader2 className="h-3.5 w-3.5 text-primary animate-spin shrink-0" />}
                        {es.status === "pending" && <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                        <span className="font-mono text-muted-foreground w-4">{i + 1}</span>
                        <span className="font-medium flex-1">{step ? STEP_LABELS[step.type] : "Unknown"}</span>
                        {es.duration && <span className="font-mono text-muted-foreground">{es.duration}ms</span>}
                        {es.error && <span className="text-destructive truncate max-w-[200px]">{es.error}</span>}
                      </div>
                    );
                  })}
                  {executionResult && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 rounded-lg border border-success/30 bg-success/5 p-3">
                      <p className="text-xs font-semibold text-success mb-1">Response</p>
                      <pre className="text-xs font-mono text-foreground">{JSON.stringify(executionResult, null, 2)}</pre>
                    </motion.div>
                  )}
                  {executionError && !executionResult && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                      <p className="text-xs font-semibold text-destructive mb-1">Error</p>
                      <p className="text-xs font-mono text-foreground">{executionError}</p>
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
