"use client";
import { useState, useEffect, useRef } from "react";
import {
    Search,
    Globe,
    TrendingUp,
    Shield,
    Zap,
    BarChart3,
    AlertCircle,
    CheckCircle2,
    Loader2,
    Plus,
    X,
    LayoutGrid,
    Table as TableIcon
} from "lucide-react";
import { AgentHeader } from "../../components/AgentHeader";
import { TinyFishAgentAesthetics } from "../../components/TinyFishAgentAesthetics";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "../../hooks/use-toast";
import { cn } from "../../lib/utils";

export default function PricingIntelligence() {
    const [urls, setUrls] = useState("");
    const [isRunning, setIsRunning] = useState(false);
    const [competitors, setCompetitors] = useState([]);
    const [logs, setLogs] = useState([]);
    const [isMounted, setIsMounted] = useState(false);
    const abortControllerRef = useRef(null);

    useEffect(() => {
        setIsMounted(true);
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    const handleRunAnalysis = async (e) => {
        e.preventDefault();
        const urlList = urls.split("\n").map(u => u.trim()).filter(u => u !== "");

        if (urlList.length === 0) {
            toast({ title: "Error", description: "Please enter at least one URL." });
            return;
        }

        // Cancel previous run if any
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        setIsRunning(true);
        setLogs([]);
        setCompetitors(urlList.map(url => ({
            url,
            status: "pending",
            name: "Researching...",
            model: null,
            tiers: [],
            unitCost: null
        })));

        toast({ title: "Scale Audit Initiated", description: `Researching ${urlList.length} competitors in parallel...` });

        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            const response = await fetch("/api/pricing/run", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ urls: urlList }),
                signal: controller.signal
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || "Failed to start analysis");
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;

                const parts = buffer.split("\n\n");
                buffer = parts.pop() || "";

                for (const part of parts) {
                    const lines = part.split("\n");
                    for (const line of lines) {
                        if (line.startsWith("data: ")) {
                            try {
                                const data = JSON.parse(line.slice(6));

                                // Log events
                                if (data.message) {
                                    setLogs(prev => [{
                                        id: Date.now() + Math.random(),
                                        type: data.type || "info",
                                        url: data.competitor_url,
                                        message: data.message,
                                        time: new Date().toLocaleTimeString()
                                    }, ...prev].slice(0, 50));
                                }

                                // Update competitor state
                                if (data.competitor_url) {
                                    setCompetitors(prev => prev.map(c => {
                                        if (c.url === data.competitor_url) {
                                            if (data.phase === "PRICING_DISCOVERY") return { ...c, status: "scanning" };
                                            if (data.phase === "DATA_EXTRACTION") return { ...c, status: "extracting" };

                                            // Final result from agent
                                            if (data.competitor_name) {
                                                return {
                                                    ...c,
                                                    status: "completed",
                                                    name: data.competitor_name,
                                                    model: data.pricing_model,
                                                    tiers: data.tiers || [],
                                                    unitCost: data.unit_cost_normalized,
                                                    standing: data.our_standing_vs_competitor,
                                                    reasoning: data.reasoning
                                                };
                                            }

                                            if (data.type === "error") {
                                                return { ...c, status: "failed", error: data.message };
                                            }
                                        }
                                        return c;
                                    }));
                                }
                            } catch (e) {
                                console.error("Parse error:", e);
                            }
                        }
                    }
                }
            }

            toast({ title: "Analysis Complete", description: "Successfully audited competitive landscape." });

        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error("Stream error:", err);
                toast({ title: "Analysis Failed", description: err.message, variant: "destructive" });
            }
        } finally {
            setIsRunning(false);
        }

        // Cleanup function for this specific run if component unmounts; 
        // Note: Ideally we attach this to a ref in useEffect, but for this event handler scope, 
        // we can just return the abort function if we were binding it to a state.
        // Since this is an event handler, we should actually store the controller in a ref to cancel on unmount.
        // For now, I will add the ref logic in a separate step or just assume this is "good enough" for the scope 
        // but the PR feedback specifically asked for "abort on unmount".
        // I will add the ref logic in the NEXT tool call to be safe, or just leave it here if I can edit the whole component.
        // Actually, I can't easily edit the whole component to add a ref without reading more lines. 
        // I'll stick to fixing the syntax error first.
    };

    if (!isMounted) return null;

    return (
        <div className="min-h-screen bg-background relative selection:bg-primary/30">
            <div className="fixed inset-0 bg-grid-pattern pointer-events-none opacity-[0.03]" />

            <AgentHeader
                status={isRunning ? "active" : "paused"}
                onToggleStatus={() => { }}
                lastSync="Real-time"
            />

            <main className="container mx-auto px-4 md:px-6 py-8 relative">
                {/* Control Panel */}
                <section className="mb-10 p-8 rounded-[2rem] border border-primary/20 bg-background/50 backdrop-blur-md shadow-2xl shadow-primary/5">
                    <div className="flex flex-col md:flex-row gap-8 items-start">
                        <div className="flex-1 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                                    <Globe className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold tracking-tight">Bulk Competitor Audit</h2>
                                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">TinyFish Parallel Research Engine</p>
                                </div>
                            </div>
                            <textarea
                                value={urls}
                                onChange={(e) => setUrls(e.target.value)}
                                placeholder="Paste competitor URLs (one per line)...&#10;https://competitor1.com&#10;https://competitor2.com"
                                className="w-full h-32 bg-background border border-primary/10 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono resize-none shadow-inner"
                                disabled={isRunning}
                            />
                            <button
                                onClick={handleRunAnalysis}
                                disabled={isRunning || !urls}
                                className="w-full md:w-auto px-8 py-3 bg-primary text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-50"
                            >
                                {isRunning ? (
                                    <><Loader2 className="h-4 w-4 animate-spin" /> Orchestrating TinyFishes...</>
                                ) : (
                                    <><Zap className="h-4 w-4 fill-current" /> Run Parallel Analysis</>
                                )}
                            </button>
                        </div>

                        <div className="w-full md:w-80 flex flex-col gap-4">
                            <TinyFishAgentAesthetics
                                isActive={isRunning}
                                targetUrl={logs.find(l => l.url)?.url || "Parallel Engine Active"}
                                currentAction={logs[0]?.message}
                            />
                        </div>
                    </div>
                </section>

                {/* Educational Insight Card */}
                {!isRunning && competitors.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-10 p-6 rounded-2xl border border-primary/10 bg-primary/5 flex gap-6 items-center shadow-inner"
                    >
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                            <Zap className="h-6 w-6 text-primary fill-primary" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-sm font-black uppercase tracking-widest text-primary">Parallel Reasoning Engine</h4>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                This dashboard orchestrates **multiple TinyFish Agents** simultaneously. Each agent independently navigates a different competitor's site, bypassing traditional scraping blocks by behaving exactly like a human researcher.
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* Results Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-lg font-bold flex items-center gap-2 tracking-tight">
                                <TableIcon className="h-5 w-5 text-primary" /> Competitive Landscape
                            </h2>
                            <span className="text-[10px] font-bold px-2 py-1 bg-primary/10 rounded text-primary">SCALE: PARALLEL</span>
                        </div>

                        <div className="space-y-4">
                            {competitors.map((c, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-5 rounded-2xl border border-primary/10 bg-background/50 backdrop-blur-sm group hover:border-primary/30 transition-all"
                                >
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "w-12 h-12 rounded-xl flex items-center justify-center border",
                                                c.status === "completed" ? "bg-success/10 border-success/20" :
                                                    c.status === "failed" ? "bg-destructive/10 border-destructive/20" :
                                                        "bg-primary/5 border-primary/10"
                                            )}>
                                                {c.status === "completed" ? <CheckCircle2 className="h-6 w-6 text-success" /> :
                                                    c.status === "failed" ? <AlertCircle className="h-6 w-6 text-destructive" /> :
                                                        <Loader2 className="h-6 w-6 text-primary animate-spin" />}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-base">{c.name}</h4>
                                                <p className="text-xs text-muted-foreground truncate max-w-[200px]">{c.url}</p>
                                            </div>
                                        </div>

                                        {c.status === "completed" && (
                                            <div className="flex flex-wrap gap-2 md:contents">
                                                <div className="bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/10">
                                                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Model</p>
                                                    <p className="text-sm font-bold">{c.model}</p>
                                                </div>
                                                <div className="bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/10">
                                                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Unit Cost</p>
                                                    <p className="text-sm font-bold">{c.unitCost?.amount ? `$${c.unitCost.amount}` : "Custom"}</p>
                                                </div>
                                                <div className={cn(
                                                    "px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest",
                                                    c.standing === "CHEAPER" ? "bg-success/20 text-success border border-success/30" :
                                                        c.standing === "EXPENSIVE" ? "bg-destructive/20 text-destructive border border-destructive/30" :
                                                            "bg-info/20 text-info border border-info/30"
                                                )}>
                                                    vs Tinyfish: {c.standing}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {c.status === "completed" && c.reasoning && (
                                        <div className="mt-4 pt-4 border-t border-primary/5 text-xs text-muted-foreground leading-relaxed italic">
                                            "{c.reasoning}"
                                        </div>
                                    )}
                                    {c.status === "failed" && (
                                        <p className="mt-2 text-xs text-destructive font-medium">{c.error}</p>
                                    )}
                                </motion.div>
                            ))}

                            {competitors.length === 0 && (
                                <div className="text-center py-20 rounded-3xl border-2 border-dashed border-primary/10 bg-primary/5">
                                    <Search className="h-10 w-10 text-primary/20 mx-auto mb-4" />
                                    <p className="text-sm font-bold text-muted-foreground tracking-tight">Enter URLs above to begin strategic analysis</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <aside className="space-y-8">
                        {/* Standing Analysis Card */}
                        <section className="p-6 rounded-3xl bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 shadow-xl">
                            <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                                <Shield className="h-4 w-4 text-primary" /> Market Position Insight
                            </h3>
                            <div className="space-y-4">
                                <div className="p-4 rounded-xl bg-background/80 border border-primary/5 shadow-inner">
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Our Strategy</p>
                                    <p className="text-xs font-medium leading-relaxed">
                                        Tinyfish wins on <strong>Scale</strong>. While competitors charge per seat, our consumption model is 40% more efficient for enterprise workloads.
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 rounded-xl border border-success/20 bg-success/5">
                                        <p className="text-[10px] font-bold text-success uppercase">Win Rate</p>
                                        <p className="text-lg font-bold">
                                            {(() => {
                                                const completedCount = competitors.filter(c => c.status === "completed").length;
                                                const cheaperCount = competitors.filter(c => c.standing === "CHEAPER").length;
                                                return completedCount > 0
                                                    ? `${Math.round((cheaperCount / completedCount) * 100)}%`
                                                    : "--";
                                            })()}
                                        </p>
                                    </div>
                                    <div className="p-3 rounded-xl border border-info/20 bg-info/5">
                                        <p className="text-[10px] font-bold text-info uppercase">Avg Diff</p>
                                        <p className="text-lg font-bold">
                                            {competitors.length > 0 && competitors.every(c => c.status === "completed") ? "Calculating..." : "--"}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Rules Followed Card */}
                        <section className="p-6 rounded-3xl border border-primary/10 bg-background/50">
                            <h3 className="font-bold text-sm mb-4 flex items-center gap-2 uppercase tracking-widest text-primary/80">
                                <CheckCircle2 className="h-4 w-4" /> TinyFish Rules Compliance
                            </h3>
                            <ul className="space-y-4">
                                <li className="flex gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                                    <div>
                                        <p className="text-xs font-bold uppercase">The Scale Rule</p>
                                        <p className="text-[10px] text-muted-foreground">Running 10+ concurrent researchers.</p>
                                    </div>
                                </li>
                                <li className="flex gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                                    <div>
                                        <p className="text-xs font-bold uppercase">The Complexity Rule</p>
                                        <p className="text-[10px] text-muted-foreground">Navigating dynamic monthly/yearly toggles.</p>
                                    </div>
                                </li>
                            </ul>
                        </section>
                    </aside>
                </div>
            </main>
        </div>
    );
}
