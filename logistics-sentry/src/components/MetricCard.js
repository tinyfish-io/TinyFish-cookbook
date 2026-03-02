import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

export function MetricCard({ title, value, subtitle, icon: Icon, trend, variant = "default" }) {
    const variants = {
        default: "border-white/5 bg-white/[0.02]",
        success: "border-success/20 bg-success/5",
        warning: "border-warning/20 bg-warning/5",
        info: "border-info/10 bg-info/5",
    };

    const iconColors = {
        default: "text-muted-foreground",
        success: "text-success",
        warning: "text-warning",
        info: "text-info",
    };

    return (
        <div className={cn(
            "p-4 rounded-xl border transition-all hover:bg-primary/[0.03] shadow-sm hover:shadow-md",
            variants[variant]
        )}>
            <div className="flex items-start justify-between mb-2">
                <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">{title}</p>
                    <h3 className="text-2xl font-black font-mono tracking-tighter">{value}</h3>
                </div>
                <div className={cn(
                    "p-2 rounded-lg bg-background border border-primary/10 shadow-sm",
                    iconColors[variant]
                )}>
                    {Icon && <Icon className="h-5 w-5" />}
                </div>
            </div>
            <div className="flex items-center gap-2">
                <p className="text-[10px] text-muted-foreground font-bold tracking-tight">{subtitle}</p>
                {trend && (
                    <div className={cn(
                        "flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-full border shadow-sm",
                        trend.isPositive ? "text-success bg-success/10 border-success/20" : "text-destructive bg-destructive/10 border-destructive/20"
                    )}>
                        {trend.isPositive ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                        {trend.value ?? 0}%
                    </div>
                )}
            </div>
        </div>
    );
}
