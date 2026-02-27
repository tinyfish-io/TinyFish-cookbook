"use client";
import {
    AlertTriangle,
    ArrowUpRight,
    Clock,
    Check,
    Pause,
    ShieldAlert
} from "lucide-react";
import { cn } from "@/lib/utils";

export function InventoryAlert({
    id,
    type,
    severity,
    itemName,
    itemSku,
    message,
    currentStock,
    expectedStock,
    detectedAt,
    onProceed,
    onPause,
    onEscalate
}) {
    const severityColors = {
        critical: "bg-destructive/10 border-destructive/20 text-destructive",
        high: "bg-warning/10 border-warning/20 text-warning",
        medium: "bg-info/10 border-info/20 text-info",
    };

    const variance = expectedStock ? Math.round(((currentStock - expectedStock) / expectedStock) * 100) : 0;
    const isPositive = variance > 0;

    return (
        <div className="group rounded-xl border border-primary/20 bg-background/50 overflow-hidden hover:border-primary/40 transition-all shadow-xl shadow-primary/[0.02]">
            <div className="p-4 flex flex-col gap-4">
                <div className="flex items-start justify-between">
                    <div className="flex gap-4">
                        <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border shadow-sm transition-transform duration-500 group-hover:scale-110",
                            severity === "critical" ? "bg-destructive/15 text-destructive border-destructive/20" :
                                severity === "high" ? "bg-warning/15 text-warning border-warning/20" : "bg-info/15 text-info border-info/20"
                        )}>
                            <ShieldAlert className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className={cn(
                                    "px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter shadow-sm border",
                                    severity === "critical" ? "bg-destructive text-white border-destructive/20" :
                                        severity === "high" ? "bg-warning text-white border-warning/20" : "bg-info text-white border-info/20"
                                )}>
                                    {severity}
                                </span>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-primary/5 px-2 py-0.5 rounded border border-primary/10">{type.replace("-", " ")}</span>
                            </div>
                            <h3 className="text-lg font-black tracking-tight">{itemName}</h3>
                            <p className="text-[10px] font-mono text-muted-foreground uppercase font-bold tracking-widest opacity-60">SKU: {itemSku}</p>
                        </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest font-black opacity-40">Detected At</span>
                        <div className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-primary/5 border border-primary/10">
                            <Clock className="h-3 w-3" />
                            {detectedAt}
                        </div>
                    </div>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed pl-14 font-medium italic">
                    {message}
                </p>

                <div className="pl-14 grid grid-cols-3 gap-4 py-4">
                    <div className="border border-primary/10 bg-primary/[0.02] rounded-lg p-2 text-center shadow-inner">
                        <p className="text-[9px] text-muted-foreground uppercase font-black mb-1 opacity-60">Recorded</p>
                        <p className="text-xl font-black font-mono tracking-tighter">{currentStock}</p>
                    </div>
                    <div className="border border-primary/10 bg-primary/[0.02] rounded-lg p-2 text-center shadow-inner">
                        <p className="text-[9px] text-muted-foreground uppercase font-black mb-1 opacity-60">Audited</p>
                        <p className="text-xl font-black font-mono tracking-tighter">{expectedStock}</p>
                    </div>
                    <div className="border border-primary/10 bg-primary/[0.02] rounded-lg p-2 text-center shadow-inner">
                        <p className="text-[9px] text-muted-foreground uppercase font-black mb-1 opacity-60">Variance</p>
                        <p className={cn(
                            "text-xl font-black font-mono tracking-tighter",
                            isPositive ? "text-success" : "text-destructive"
                        )}>
                            {isPositive ? "+" : ""}{variance}%
                        </p>
                    </div>
                </div>

                <div className="pl-14 flex items-center gap-2 pt-2">
                    <button
                        onClick={() => onProceed?.(id)}
                        className="flex-1 bg-success hover:bg-success/90 text-white font-black py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-success/20 active:scale-95 text-xs uppercase"
                    >
                        <Check className="h-4 w-4" /> Proceed
                    </button>
                    <button
                        onClick={() => onPause?.(id)}
                        className="flex-1 bg-warning hover:bg-warning/90 text-white font-black py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-warning/20 active:scale-95 text-xs uppercase"
                    >
                        <Pause className="h-4 w-4" /> Pause
                    </button>
                    <button
                        onClick={() => onEscalate?.(id)}
                        className="flex-1 bg-destructive hover:bg-destructive/90 text-white font-black py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-destructive/20 active:scale-95 text-xs uppercase"
                    >
                        <ShieldAlert className="h-4 w-4" /> Escalate
                    </button>
                </div>
            </div>
        </div>
    );
}
