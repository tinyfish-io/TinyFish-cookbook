"use client";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, MousePointer2, Keyboard, Search, ShieldCheck, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export function TinyFishAgentAesthetics({ currentAction, targetUrl, isActive }) {
    return (
        <div className="p-6 rounded-2xl border border-primary/20 bg-background/40 backdrop-blur-xl relative overflow-hidden h-full flex flex-col justify-between shadow-2xl shadow-primary/5">
            {/* Scanned Grid Background */}
            <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />

            {/* Header: Target URL */}
            <div className="relative z-10 flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500",
                        isActive ? "bg-primary shadow-[0_0_20px_rgba(250,204,21,0.3)] animate-pulse" : "bg-muted"
                    )}>
                        <Globe className={cn("h-5 w-5", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black tracking-[0.2em] text-muted-foreground uppercase">Target Context</p>
                        <p className="text-sm font-mono font-bold truncate max-w-[240px] italic underline decoration-primary/50">
                            {targetUrl || "Waiting for mission..."}
                        </p>
                    </div>
                </div>
                {isActive && (
                    <div className="flex gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-success animate-ping" />
                        <span className="text-[9px] font-black uppercase text-success tracking-tighter">AI Browsing Live</span>
                    </div>
                )}
            </div>

            {/* Core Visualization: The Agent "Eyes" */}
            <div className="relative flex-1 flex flex-col items-center justify-center py-12">
                <AnimatePresence mode="wait">
                    {isActive ? (
                        <motion.div
                            key="active"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="relative"
                        >
                            {/* Scanning Rings */}
                            <div className="absolute inset-0 w-32 h-32 -m-4 rounded-full border border-primary/30 animate-[ping_3s_linear_infinite]" />
                            <div className="absolute inset-0 w-32 h-32 -m-4 rounded-full border border-primary/20 animate-[ping_2s_linear_infinite]" />

                            <div className="w-24 h-24 rounded-[2rem] bg-background border-2 border-primary/50 shadow-2xl flex items-center justify-center relative">
                                <Zap className="h-10 w-10 text-primary fill-primary animate-pulse" />

                                {/* Orbiting Tokens */}
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                    className="absolute inset-0 -m-8"
                                >
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-6 rounded-lg bg-info/20 border border-info/40 flex items-center justify-center shadow-lg">
                                        <Search className="h-3 w-3 text-info" />
                                    </div>
                                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-6 rounded-lg bg-success/20 border border-success/40 flex items-center justify-center shadow-lg">
                                        <MousePointer2 className="h-3 w-3 text-success" />
                                    </div>
                                </motion.div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="idle"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center gap-4 text-muted-foreground/40"
                        >
                            <ShieldCheck className="h-16 w-16" />
                            <p className="text-[10px] font-black uppercase tracking-[0.3em]">Guardian Standby</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Footer: Current Action Description */}
            <div className="mt-8 relative z-10">
                <div className="p-4 rounded-xl bg-black/[0.03] border border-primary/10 shadow-inner">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2">
                        <Keyboard className="h-3 w-3" /> Agent Action
                    </p>
                    <div className="min-h-[2.5rem] flex items-center">
                        {isActive ? (
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-sm font-bold text-foreground leading-snug"
                            >
                                {currentAction || "Analyzing environment for DOM nodes..."}
                                <span className="animate-pulse">_</span>
                            </motion.p>
                        ) : (
                            <p className="text-xs text-muted-foreground italic font-medium">
                                Ready to deploy autonomous agent.
                            </p>
                        )}
                    </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-muted-foreground/40 px-2">
                    <span>TinyFish Kernel v4.0</span>
                    <span className="flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-success" /> Connection Stable</span>
                </div>
            </div>
        </div>
    );
}
