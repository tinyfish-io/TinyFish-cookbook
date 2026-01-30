"use client";

import {
    CheckCircle2,
    PauseCircle,
    AlertTriangle,
    RotateCcw
} from "lucide-react";

export function ActionPanel({ pendingActions, onProceed, onPause, onEscalate, onReset }) {
    return (
        <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-sm font-bold tracking-tight">Quick Actions</h2>
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Manual override controls</p>
                </div>
                <div className="bg-warning/10 border border-warning/20 px-2 py-0.5 rounded flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
                    <span className="text-[10px] font-black italic text-warning uppercase">{pendingActions} Pending</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
                <button
                    onClick={() => onProceed?.(pendingActions)}
                    className="p-3 bg-success/10 border border-success/20 hover:bg-success/20 rounded-xl transition-all group flex flex-col items-center gap-2"
                >
                    <CheckCircle2 className="h-5 w-5 text-success group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-success">Proceed All</span>
                </button>
                <button
                    onClick={() => onPause?.()}
                    className="p-3 bg-warning/10 border border-warning/20 hover:bg-warning/20 rounded-xl transition-all group flex flex-col items-center gap-2"
                >
                    <PauseCircle className="h-5 w-5 text-warning group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-warning">Pause All</span>
                </button>
                <button
                    onClick={() => onEscalate?.()}
                    className="p-3 bg-destructive/10 border border-destructive/20 hover:bg-destructive/20 rounded-xl transition-all group flex flex-col items-center gap-2"
                >
                    <AlertTriangle className="h-5 w-5 text-destructive group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-destructive">Escalate</span>
                </button>
                <button
                    onClick={() => onReset?.()}
                    className="p-3 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl transition-all group flex flex-col items-center gap-2"
                >
                    <RotateCcw className="h-5 w-5 text-muted-foreground group-hover:rotate-180 transition-transform duration-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Reset</span>
                </button>
            </div>
        </div>
    );
}
