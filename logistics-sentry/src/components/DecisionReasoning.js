"use client";
import { motion } from "framer-motion";
import { Check, AlertCircle, ShieldAlert, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function DecisionReasoning({ result }) {
    if (!result) return null;

    const steps = [
        { label: "Intended Update", value: "Verified Source", status: "success" },
        { label: "Stock Consistency", value: result.audit_trail_valid ? "Valid Trail" : "Log Mismatch", status: result.audit_trail_valid ? "success" : "error" },
        { label: "Market Velocity", value: result.sales_velocity, status: "success" },
        { label: "Risk Evaluation", value: result.recommended_action, status: result.recommended_action === "PROCEED" ? "success" : "warning" }
    ];

    return (
        <div className="p-6 rounded-2xl border border-primary/20 bg-background/50 mt-6 shadow-xl shadow-primary/[0.02] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <ShieldAlert className="h-24 w-24 text-primary" />
            </div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-8 flex items-center gap-2 relative z-10">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> Agent Reasoning Path
            </h3>

            <div className="relative flex justify-between items-center max-w-2xl mx-auto py-4">
                {/* Connection Lines */}
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-primary/10 -translate-y-1/2 z-0" />

                {steps.map((step, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.2 }}
                        className="relative z-10 flex flex-col items-center gap-3"
                    >
                        <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center border-2 shadow-lg transition-all duration-500 hover:scale-110",
                            step.status === "success" ? "bg-success/5 border-success/30 shadow-success/10" :
                                step.status === "error" ? "bg-destructive/5 border-destructive/30 shadow-destructive/10" :
                                    "bg-warning/5 border-warning/30 shadow-warning/10"
                        )}>
                            {step.status === "success" ? <Check className="h-4 w-4 text-success" /> :
                                step.status === "error" ? <AlertCircle className="h-4 w-4 text-destructive" /> :
                                    <ShieldAlert className="h-4 w-4 text-warning" />}
                        </div>
                        <div className="text-center">
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-0.5 opacity-60">{step.label}</p>
                            <p className="text-[10px] font-mono font-black text-foreground italic bg-primary/5 px-2 py-0.5 rounded border border-primary/10">{step.value}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="mt-8 p-4 rounded-xl bg-primary/5 border border-primary/10 shadow-inner relative z-10"
            >
                <p className="text-xs text-muted-foreground leading-relaxed italic font-medium">
                    <span className="text-primary font-black uppercase mr-2 tracking-tighter not-italic border-r border-primary/20 pr-3">Verdict:</span>
                    {result.reasoning}
                </p>
            </motion.div>
        </div>
    );
}
