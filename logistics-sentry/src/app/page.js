"use client";
import { useState, useEffect } from "react";
import {
    Ship,
    Anchor,
    MapPin,
    Wind,
    AlertTriangle,
    CheckCircle2,
    Loader2,
    ArrowRight,
    Search,
    Globe,
    Zap,
    Navigation,
    Container,
    TrendingUp
} from "lucide-react";
import { AgentHeader } from "../components/AgentHeader";
import { TinyFishAgentAesthetics } from "../components/TinyFishAgentAesthetics";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "../hooks/use-toast";
import { cn } from "../lib/utils";

export default function LogisticsDashboard() {
    const [isMounted, setIsMounted] = useState(false);
    const [isRunning, setIsRunning] = useState(false);

    // Inputs
    const [origin, setOrigin] = useState("Port of Los Angeles");
    const [isCustomOrigin, setIsCustomOrigin] = useState(false);
    const [customOrigin, setCustomOrigin] = useState("");

    const [carrier, setCarrier] = useState("Maersk");
    const [isCustomCarrier, setIsCustomCarrier] = useState(false);
    const [customCarrier, setCustomCarrier] = useState("");

    const [mode, setMode] = useState("Sea Freight");

    // Output
    const [result, setResult] = useState(null);
    const [activeScoutMsg, setActiveScoutMsg] = useState("");
    const [activeTarget, setActiveTarget] = useState("");

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const buildSignalTrend = (signals) => {
        const buckets = Array(7).fill(0);
        if (!Array.isArray(signals)) return null;
        const now = Date.now();
        let hasDatedSignals = false;

        signals.forEach((signal) => {
            if (!signal?.date) return;
            const parsed = Date.parse(signal.date);
            if (!Number.isFinite(parsed)) return;
            const daysAgo = Math.floor((now - parsed) / (1000 * 60 * 60 * 24));
            if (daysAgo < 0 || daysAgo > 6) return;
            hasDatedSignals = true;
            const index = 6 - daysAgo;
            buckets[index] += 1;
        });

        if (!hasDatedSignals) return null;

        return {
            buckets,
            max: Math.max(...buckets)
        };
    };

    // Simulation of "Swarm" visuals while waiting for API
    useEffect(() => {
        if (isRunning) {
            const targets = [
                "portoflosangeles.org",
                "maersk.com/advisories",
                "marinetraffic.com/congestion",
                "weather.gov/marine"
            ];
            let i = 0;
            const interval = setInterval(() => {
                setActiveTarget(targets[i % targets.length]);
                setActiveScoutMsg(`Agent ${i + 1} analyzing ${targets[i % targets.length]}...`);
                i++;
            }, 1200);
            return () => clearInterval(interval);
        }
    }, [isRunning]);

    const handleRankCheck = async (e) => {
        e.preventDefault();
        setIsRunning(true);
        setResult(null);
        try {
            const finalOrigin = isCustomOrigin ? customOrigin : origin;
            const finalCarrier = isCustomCarrier ? customCarrier : carrier;

            toast({ title: "Initiating Network Scan", description: `Checking status for ${finalOrigin} / ${finalCarrier}...` });

            const response = await fetch("/api/logistics/risk-assessment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    origin_port: finalOrigin,
                    carrier: finalCarrier,
                    mode: mode
                })
            });

            if (!response.ok) throw new Error("Intelligence gathering failed");

            const data = await response.json();
            setResult(data);
            setIsRunning(false);
            toast({ title: "Risk Assessment Complete", description: "All signals synthesized." });

        } catch (err) {
            setIsRunning(false);
            toast({ title: "Analysis Error", description: err.message, variant: "destructive" });
        }
    };

    if (!isMounted) return null;
    const signalTrend = buildSignalTrend(result?.signals_detected);

    return (
        <div className="min-h-screen bg-background relative selection:bg-primary/30">
            {/* Background Effects */}
            <div className="fixed inset-0 bg-grid-pattern pointer-events-none opacity-[0.03]" />
            <div className="fixed inset-0 bg-gradient-to-b from-background via-transparent to-primary/5 pointer-events-none" />

            <AgentHeader
                status={isRunning ? "active" : "standby"}
                onToggleStatus={() => { }}
                lastSync="Live Network"
            />

            <main className="container mx-auto px-4 md:px-6 py-10 relative">

                <div className="flex flex-col lg:flex-row gap-12 items-start">

                    {/* LEFT PANEL: Context & Swarm View */}
                    <div className="w-full lg:w-1/2 space-y-8">

                        {/* 1. Context Input Card */}
                        <section className="p-8 rounded-[2rem] border border-primary/20 bg-background/50 backdrop-blur-md shadow-2xl relative overflow-hidden">
                            <div className="relative z-10">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                                        <Anchor className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                        <h1 className="text-2xl font-black tracking-tight">Supply Chain Monitor</h1>
                                        <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">Real-time Delay Detection</p>
                                    </div>
                                </div>

                                <form onSubmit={handleRankCheck} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest ml-1">Origin Port</label>
                                        <div className="relative group">
                                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                            {!isCustomOrigin ? (
                                                <>
                                                    <select
                                                        value={origin}
                                                        onChange={(e) => {
                                                            if (e.target.value === "CUSTOM") {
                                                                setIsCustomOrigin(true);
                                                            } else {
                                                                setOrigin(e.target.value);
                                                            }
                                                        }}
                                                        disabled={isRunning}
                                                        className="w-full pl-12 pr-10 py-4 rounded-xl border border-primary/10 bg-background/50 text-base font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 hover:bg-background/80 transition-all appearance-none cursor-pointer"
                                                    >
                                                        <option value="Port of Los Angeles">Port of Los Angeles (USA)</option>
                                                        <option value="Shanghai">Port of Shanghai (CN)</option>
                                                        <option value="Rotterdam">Port of Rotterdam (EU)</option>
                                                        <option value="CUSTOM">+ Specify Custom Port</option>
                                                    </select>
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                                        <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-muted-foreground/50" />
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="flex gap-2">
                                                    <input
                                                        autoFocus
                                                        type="text"
                                                        placeholder="Enter Port Name..."
                                                        value={customOrigin}
                                                        onChange={(e) => setCustomOrigin(e.target.value)}
                                                        disabled={isRunning}
                                                        className="w-full pl-12 pr-4 py-4 rounded-xl border border-primary/20 bg-background/80 text-base font-bold focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsCustomOrigin(false)}
                                                        className="px-4 text-xs font-bold text-muted-foreground hover:text-primary transition-colors"
                                                    >
                                                        Reset
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest ml-1">Carrier</label>
                                            <div className="relative group">
                                                <Ship className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                                {!isCustomCarrier ? (
                                                    <>
                                                        <select
                                                            value={carrier}
                                                            onChange={(e) => {
                                                                if (e.target.value === "CUSTOM") {
                                                                    setIsCustomCarrier(true);
                                                                } else {
                                                                    setCarrier(e.target.value);
                                                                }
                                                            }}
                                                            disabled={isRunning}
                                                            className="w-full pl-12 pr-10 py-4 rounded-xl border border-primary/10 bg-background/50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
                                                        >
                                                            <option value="Maersk">Maersk</option>
                                                            <option value="MSC">MSC</option>
                                                            <option value="CMA CGM">CMA CGM</option>
                                                            <option value="CUSTOM">+ Other</option>
                                                        </select>
                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                                            <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-muted-foreground/50" />
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="flex flex-col gap-1 w-full">
                                                        <input
                                                            autoFocus
                                                            type="text"
                                                            placeholder="Carrier Name"
                                                            value={customCarrier}
                                                            onChange={(e) => setCustomCarrier(e.target.value)}
                                                            disabled={isRunning}
                                                            className="w-full pl-12 pr-4 py-4 rounded-xl border border-primary/20 bg-background/80 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setIsCustomCarrier(false)}
                                                            className="text-[10px] font-bold text-muted-foreground hover:text-primary text-left ml-1"
                                                        >
                                                            Back to list
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest ml-1">Mode</label>
                                            <div className="relative group">
                                                <Container className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                                <select
                                                    value={mode}
                                                    onChange={(e) => setMode(e.target.value)}
                                                    disabled={isRunning}
                                                    className="w-full pl-12 pr-4 py-4 rounded-xl border border-primary/10 bg-background/50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
                                                >
                                                    <option value="Sea Freight">Sea Freight</option>
                                                    <option value="Air Freight">Air Freight</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        disabled={isRunning}
                                        type="submit"
                                        className={cn(
                                            "w-full py-4 rounded-xl font-black text-base uppercase tracking-widest flex items-center justify-center gap-3 transition-all transform active:scale-[0.98]",
                                            isRunning
                                                ? "bg-muted text-muted-foreground cursor-wait"
                                                : "bg-primary text-primary-foreground hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-1"
                                        )}
                                    >
                                        {isRunning ? (
                                            <>
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                                Scanning Network...
                                            </>
                                        ) : (
                                            <>
                                                <Zap className="h-5 w-5 fill-current" />
                                                Scan For Risks
                                            </>
                                        )}
                                    </button>
                                </form>
                            </div>
                        </section>

                        {/* 2. Swarm Visualizer */}
                        <div className="h-80">
                            <TinyFishAgentAesthetics
                                isActive={isRunning}
                                targetUrl={activeTarget || "Waiting for command"}
                                currentAction={activeScoutMsg || "TinyFish agents on standby."}
                            />
                        </div>

                        {/* 3. System Explanation */}
                        <section className="space-y-4 pt-4 border-t border-primary/10">
                            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">System Architecture</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 rounded-xl bg-background border border-primary/5 shadow-sm">
                                    <h4 className="font-bold text-sm mb-1 flex items-center gap-2">
                                        <Globe className="h-3 w-3 text-primary" /> Global Scouting
                                    </h4>
                                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                                        The system deploys autonomous web agents to visit disparate public data sources (Carrier Advisories, Terminal Status Pages, Weather Bureaus) in real-time.
                                    </p>
                                </div>
                                <div className="p-4 rounded-xl bg-background border border-primary/5 shadow-sm">
                                    <h4 className="font-bold text-sm mb-1 flex items-center gap-2">
                                        <Zap className="h-3 w-3 text-primary" /> TinyFish Engine
                                    </h4>
                                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                                        TinyFish orchestrates this distributed potential, managing parallel execution and ensuring agents extract "Deep Metrics" rather than just surface-level keywords.
                                    </p>
                                </div>
                                <div className="p-4 rounded-xl bg-background border border-primary/5 shadow-sm">
                                    <h4 className="font-bold text-sm mb-1 flex items-center gap-2">
                                        <TrendingUp className="h-3 w-3 text-primary" /> Risk Synthesis
                                    </h4>
                                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                                        Raw unstructured signals are normalized into a coherent risk profile, providing a confidence-scored assessment for supply chain managers.
                                    </p>
                                </div>
                            </div>
                        </section>
                    </div>


                    {/* RIGHT PANEL: Risk Assessment Output */}
                    <div className="w-full lg:w-1/2">
                        <AnimatePresence mode="wait">
                            {result ? (
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="space-y-6"
                                >
                                    {/* Risk Score Card */}
                                    {result.error ? (
                                        <div className="p-8 rounded-[2rem] border border-destructive/30 bg-destructive/5 shadow-2xl relative overflow-hidden">
                                            <div className="flex items-center gap-4 mb-4 text-destructive">
                                                <AlertTriangle className="h-8 w-8" />
                                                <h3 className="text-xl font-black uppercase tracking-tight">Intelligence Offline</h3>
                                            </div>
                                            <p className="text-sm font-medium leading-relaxed opacity-80 mb-6">
                                                {result.error}
                                            </p>
                                            {result.supported_origins && (
                                                <div className="space-y-4">
                                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Verified Support Matrix:</p>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="p-3 rounded-xl bg-background/50 border border-primary/10">
                                                            <p className="text-[10px] uppercase font-bold text-muted-foreground mb-2">Ports</p>
                                                            <div className="flex flex-wrap gap-2 text-[10px] font-bold">
                                                                {result.supported_origins.map(o => <span key={o} className="px-2 py-1 bg-primary/5 rounded">{o}</span>)}
                                                            </div>
                                                        </div>
                                                        <div className="p-3 rounded-xl bg-background/50 border border-primary/10">
                                                            <p className="text-[10px] uppercase font-bold text-muted-foreground mb-2">Carriers</p>
                                                            <div className="flex flex-wrap gap-2 text-[10px] font-bold">
                                                                {result.supported_carriers.map(c => <span key={c} className="px-2 py-1 bg-primary/5 rounded">{c}</span>)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            <div className={cn(
                                                "p-8 rounded-[2rem] border-2 shadow-2xl overflow-hidden relative",
                                                result.risk_assessment?.delay_risk === "HIGH" ? "border-destructive/50 bg-destructive/5" :
                                                    result.risk_assessment?.delay_risk === "MEDIUM" ? "border-warning/50 bg-warning/5" :
                                                        "border-success/50 bg-success/5"
                                            )}>
                                                <div className="flex items-center justify-between relative z-10">
                                                    <div>
                                                        <p className="text-sm font-black uppercase tracking-widest opacity-60 mb-2">Estimated Risk Level</p>
                                                        <h2 className={cn(
                                                            "text-6xl font-black tracking-tighter",
                                                            result.risk_assessment?.delay_risk === "HIGH" ? "text-destructive" :
                                                                result.risk_assessment?.delay_risk === "MEDIUM" ? "text-warning" :
                                                                    "text-success"
                                                        )}>
                                                            {result.risk_assessment?.delay_risk || "UNKNOWN"}
                                                        </h2>
                                                    </div>
                                                    <div className={cn(
                                                        "w-24 h-24 rounded-full flex items-center justify-center border-4",
                                                        result.risk_assessment?.delay_risk === "HIGH" ? "border-destructive/20 bg-destructive/10" :
                                                            result.risk_assessment?.delay_risk === "MEDIUM" ? "border-warning/20 bg-warning/10" :
                                                                "border-success/20 bg-success/10"
                                                    )}>
                                                        {result.risk_assessment?.delay_risk === "HIGH" ? <AlertTriangle className="h-10 w-10 text-destructive" /> :
                                                            result.risk_assessment?.delay_risk === "MEDIUM" ? <AlertTriangle className="h-10 w-10 text-warning" /> :
                                                                <CheckCircle2 className="h-10 w-10 text-success" />}
                                                    </div>
                                                </div>

                                                <div className="mt-8 pt-8 border-t border-black/5 dark:border-white/5 relative z-10">
                                                    <div className="flex items-start gap-3">
                                                        <Navigation className="h-5 w-5 mt-1 opacity-50" />
                                                        <div>
                                                            <p className="text-xs font-bold uppercase opacity-50 mb-1">Primary Root Cause</p>
                                                            <p className="text-lg font-bold leading-tight">{result.risk_assessment?.primary_cause || "Analyzing signals..."}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Analysis Overview */}
                                            <div className="bg-background/60 border border-primary/10 rounded-3xl p-6 backdrop-blur-sm">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                                        <TrendingUp className="h-4 w-4 text-primary" /> Analysis Overview
                                                    </h3>
                                                    {result.shipment_context?.discovery_used && (
                                                        <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                                                            Discovery Mode
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm font-semibold leading-relaxed">
                                                    {result.analysis?.summary || "Signals synthesized into a unified risk profile."}
                                                </p>
                                                <div className="grid grid-cols-2 gap-4 mt-5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                                    <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                                                        <p className="mb-2">Risk Score</p>
                                                        <p className="text-base font-black text-foreground">
                                                            {result.analysis?.risk_score ?? "N/A"}
                                                        </p>
                                                    </div>
                                                    <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                                                        <p className="mb-2">Signal Density</p>
                                                        <p className="text-base font-black text-foreground">
                                                            {result.analysis?.signal_density ?? "N/A"}
                                                        </p>
                                                    </div>
                                                    <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                                                        <p className="mb-2">Recent Signals</p>
                                                        <p className="text-base font-black text-foreground">
                                                            {result.analysis?.recency?.buckets?.recent ?? 0}
                                                        </p>
                                                    </div>
                                                    <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                                                        <p className="mb-2">Stale Signals</p>
                                                        <p className="text-base font-black text-foreground">
                                                            {result.analysis?.recency?.buckets?.stale ?? 0}
                                                        </p>
                                                    </div>
                                                    <div className="p-3 rounded-2xl bg-white/5 border border-white/10 col-span-2">
                                                        <p className="mb-2">Latest Signal Date</p>
                                                        <p className="text-sm font-black text-foreground">
                                                            {result.analysis?.recency?.latest_signal_date || "Unknown"}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="mt-5 p-4 rounded-2xl bg-white/5 border border-white/10">
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Confidence Breakdown</p>
                                                    <div className="flex flex-wrap gap-3 text-xs font-bold">
                                                        <span className="px-2 py-1 rounded-full bg-primary/10 text-primary">
                                                            Weighted: {((result.analysis?.confidence_breakdown?.weighted_confidence ?? 0) * 100).toFixed(0)}%
                                                        </span>
                                                        <span className="px-2 py-1 rounded-full bg-white/5 text-muted-foreground">
                                                            Severity: {result.analysis?.confidence_breakdown?.severity_weight ?? 0}
                                                        </span>
                                                        <span className="px-2 py-1 rounded-full bg-white/5 text-muted-foreground">
                                                            Recency: {result.analysis?.confidence_breakdown?.recency_weight ?? 0}
                                                        </span>
                                                        <span className="px-2 py-1 rounded-full bg-white/5 text-muted-foreground">
                                                            Coverage: {result.analysis?.confidence_breakdown?.coverage_weight ?? 0}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="mt-5 p-4 rounded-2xl bg-white/5 border border-white/10">
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Source Timings</p>
                                                    {result.analysis?.source_timings?.length ? (
                                                        <div className="space-y-2 text-xs font-semibold">
                                                            {result.analysis.source_timings.map((entry, idx) => (
                                                                <div key={`${entry.source}-${idx}`} className="flex items-center justify-between text-muted-foreground">
                                                                    <span className="truncate max-w-[65%]">{entry.source}</span>
                                                                    <span className="text-foreground">{entry.duration_ms} ms</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-xs text-muted-foreground">No timing data reported.</p>
                                                    )}
                                                </div>
                                                <div className="mt-5 p-4 rounded-2xl bg-white/5 border border-white/10">
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Signal Density (Last 7 Days)</p>
                                                    {signalTrend ? (
                                                        <div className="flex items-end gap-2 h-16">
                                                            {signalTrend.buckets.map((count, idx) => (
                                                                <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                                                                    <div
                                                                        className="w-full rounded-md bg-primary/60"
                                                                        style={{
                                                                            height: `${Math.max(4, (count / Math.max(1, signalTrend.max)) * 56)}px`
                                                                        }}
                                                                    />
                                                                    <span className="text-[9px] text-muted-foreground">{count}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-xs text-muted-foreground">No dated signals yet.</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Signals Feed */}
                                            <div className="bg-background/50 border border-primary/10 rounded-3xl p-6 backdrop-blur-sm">
                                                <h3 className="text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                                                    <Search className="h-4 w-4 text-primary" /> Operational Signals
                                                </h3>

                                                {result.signals_detected?.length > 0 ? (
                                                    <div className="space-y-4">
                                                        {result.signals_detected.map((signal, idx) => (
                                                            <div key={idx} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex gap-4 transition-all hover:bg-white/10">
                                                                <div className={cn(
                                                                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                                                                    signal.severity === "HIGH" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                                                                )}>
                                                                    <Globe className="h-5 w-5" />
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <span className="text-[10px] font-bold uppercase opacity-50">{signal.source}</span>
                                                                        <span className="w-1 h-1 rounded-full bg-white/20" />
                                                                        <span className="text-[10px] font-mono opacity-50">{signal.date || "Recent"}</span>
                                                                    </div>
                                                                    <p className="text-sm font-medium leading-relaxed">{signal.signal}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="py-12 text-center border-2 border-dashed border-primary/10 rounded-2xl">
                                                        <p className="text-sm text-muted-foreground italic">No negative signals detected across monitored nodes.</p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Recommendation */}
                                            <div className="p-6 rounded-3xl bg-primary text-primary-foreground shadow-xl shadow-primary/20">
                                                <h3 className="text-xs font-black uppercase tracking-widest opacity-80 mb-3 flex items-center gap-2">
                                                    <Zap className="h-4 w-4 fill-current" /> Recommended Action
                                                </h3>
                                                <p className="text-lg font-bold leading-relaxed">
                                                    "{result.recommended_action || "Continue monitoring."}"
                                                </p>
                                            </div>

                                            <p className="text-center text-[10px] uppercase font-bold text-muted-foreground tracking-[0.2em] opacity-50">
                                                Confidence: {(result.risk_assessment?.confidence * 100 || 0).toFixed(0)}% • Sources: {result.signals_detected?.length || 0} Analyzed
                                            </p>
                                        </>
                                    )}

                                </motion.div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center p-12 opacity-30 select-none">
                                    <div className="w-64 h-64 rounded-full border-4 border-dashed border-primary animate-[spin_60s_linear_infinite] flex items-center justify-center mb-8">
                                        <div className="w-48 h-48 rounded-full border-2 border-dashed border-primary/50 animate-[spin_40s_linear_infinite_reverse]" />
                                    </div>
                                    <p className="text-2xl font-black tracking-tighter mb-2">READY TO SCAN</p>
                                    <p className="text-sm font-medium max-w-xs mx-auto">Select a route context to begin assessment.</p>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>

                </div>
            </main>
        </div>
    );
}
