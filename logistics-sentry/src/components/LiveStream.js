"use client";
import { useEffect, useRef } from "react";
import { Terminal, Cpu, Info, AlertCircle, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

import { motion, AnimatePresence } from "framer-motion";

const PHASES = [
    { id: "SURFACE_SCAN", label: "Dashboard Scan" },
    { id: "SOURCE_VERIFICATION", label: "Audit Logs" },
    { id: "BUSINESS_CONTEXT", label: "Sales Analysis" },
    { id: "SYNTHESIS", label: "Final Synthesis" }
];

export function LiveStream({ events = [], isRunning, currentPhase }) {
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [events]);

    const getEventIcon = (type) => {
        switch (type) {
            case "observation": return <Info className="h-3 w-3 text-info" />;
            case "action": return <Cpu className="h-3 w-3 text-primary" />;
            case "error": return <AlertCircle className="h-3 w-3 text-destructive" />;
            case "phase_start": return <Bot className="h-3 w-3 text-white" />;
            default: return <Bot className="h-3 w-3 text-muted-foreground" />;
        }
    };

    return (
        <div className="rounded-xl border border-primary/20 bg-background relative overflow-hidden flex flex-col h-[400px] shadow-xl shadow-primary/5">
            <div className="bg-primary/5 border-b border-primary/10 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Terminal className="h-3 w-3 text-primary/70" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Audit Mission Log</span>
                </div>

                <div className="flex gap-1">
                    {phases.map((p) => (
                        <div
                            key={p.id}
                            className={cn(
                                "w-2 h-2 rounded-full transition-colors",
                                currentPhase === p.id ? "bg-primary animate-pulse shadow-[0_0_8px_rgba(250,204,21,0.8)]" :
                                    events.some(e => e.message?.includes(p.id) && e.type === "phase_complete") ? "bg-success" : "bg-primary/10"
                            )}
                            title={p.label}
                        />
                    ))}
                </div>
            </div>

            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 font-mono text-[11px] space-y-2 scrollbar-thin scrollbar-thumb-primary/10 bg-primary/[0.02]"
            >
                <AnimatePresence>
                    {events.map((event, i) => (
                        <motion.div
                            key={event.id || i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex gap-3 px-2 py-1 rounded hover:bg-primary/5 transition-colors"
                        >
                            <div className="shrink-0 mt-0.5 opacity-80">
                                {getEventIcon(event.type)}
                            </div>
                            <div className="flex-1 space-y-0.5">
                                <div className="flex items-center gap-2">
                                    <span className={cn(
                                        "text-[8px] font-black uppercase tracking-tighter px-1 rounded shadow-sm border",
                                        event.type === "observation" ? "bg-info/10 text-info border-info/20" :
                                            event.type === "action" ? "bg-primary/10 text-primary border-primary/20" :
                                                event.type === "error" ? "bg-destructive/10 text-destructive border-destructive/20" :
                                                    event.type === "phase_start" ? "bg-primary text-primary-foreground border-primary/50" : "bg-muted text-muted-foreground border-transparent"
                                    )}>
                                        {event.type}
                                    </span>
                                    <span className="text-[8px] text-muted-foreground font-bold italic opacity-60">{event.timestamp}</span>
                                </div>
                                <p className={cn(
                                    "leading-relaxed break-words font-medium",
                                    event.type === "error" ? "text-destructive" :
                                        event.type === "phase_start" ? "text-foreground font-black border-l-2 border-primary pl-2 my-1" : "text-foreground/80"
                                )}>
                                    {event.message}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {isRunning && events.length > 0 && (
                    <div className="flex gap-3 animate-pulse px-2 opacity-30">
                        <div className="w-3 h-3 rounded-full bg-primary/20" />
                        <div className="h-3 w-24 bg-primary/20 rounded" />
                    </div>
                )}
            </div>
        </div>
    );
}
