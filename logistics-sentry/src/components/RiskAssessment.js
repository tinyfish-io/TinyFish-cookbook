import { Shield, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function RiskAssessment({ items }) {
    return (
        <div className="space-y-4">
            {items.map((item) => (
                <div
                    key={item.id}
                    className="p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all group"
                >
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{item.category}</span>
                                <span className={cn(
                                    "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter",
                                    item.riskScore > 75 ? "bg-destructive text-destructive-foreground" :
                                        item.riskScore > 50 ? "bg-warning text-warning-foreground" : "bg-success text-success-foreground"
                                )}>
                                    {item.riskScore > 75 ? "High Risk" : item.riskScore > 50 ? "Med Risk" : "Low Risk"}
                                </span>
                            </div>
                            <h4 className="font-bold tracking-tight text-sm">{item.name}</h4>
                        </div>
                        <div className={cn(
                            "p-2 rounded-lg",
                            item.riskScore > 75 ? "text-destructive" :
                                item.riskScore > 50 ? "text-warning" : "text-success"
                        )}>
                            <Shield className="h-4 w-4" />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Risk Score</span>
                                <span className="text-[10px] font-mono font-bold">{item.riskScore}</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className={cn(
                                        "h-full rounded-full transition-all duration-1000",
                                        item.riskScore > 75 ? "bg-destructive" :
                                            item.riskScore > 50 ? "bg-warning" : "bg-success"
                                    )}
                                    style={{ width: `${item.riskScore}%` }}
                                />
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5 pt-1">
                            {item.factors.map((factor, i) => (
                                <span key={i} className="text-[8px] font-bold uppercase tracking-widest bg-white/5 border border-white/5 px-1.5 py-0.5 rounded text-muted-foreground">
                                    {factor}
                                </span>
                            ))}
                        </div>

                        <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                            <span className="text-[10px] font-medium text-muted-foreground italic uppercase">Rec: {item.recommendation}</span>
                            <button className="text-[10px] font-bold text-primary flex items-center gap-0.5 hover:gap-1 transition-all">
                                Details <ChevronRight className="h-3 w-3" />
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
