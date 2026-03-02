import {
    CheckCircle2,
    PauseCircle,
    AlertCircle,
    RefreshCw,
    Clock
} from "lucide-react";
import { cn } from "@/lib/utils";

export function ActivityFeed({ activities }) {
    const icons = {
        proceed: <CheckCircle2 className="h-4 w-4 text-success" />,
        pause: <PauseCircle className="h-4 w-4 text-warning" />,
        escalate: <AlertCircle className="h-4 w-4 text-destructive" />,
        update: <RefreshCw className="h-4 w-4 text-info" />,
        alert: <AlertCircle className="h-4 w-4 text-warning" />,
    };

    const colors = {
        proceed: "border-success/20 bg-success/5",
        pause: "border-warning/20 bg-warning/5",
        escalate: "border-destructive/20 bg-destructive/5",
        update: "border-info/20 bg-info/5",
        alert: "border-warning/20 bg-warning/5",
    };

    return (
        <div className="space-y-3">
            {activities.map((activity) => (
                <div
                    key={activity.id}
                    className={cn(
                        "p-4 rounded-xl border transition-all hover:translate-x-1 duration-300",
                        colors[activity.type]
                    )}
                >
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex gap-4">
                            <div className="mt-1">{icons[activity.type]}</div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-black uppercase tracking-tighter opacity-70 italic">{activity.type}</span>
                                    <span className="text-[10px] text-muted-foreground">•</span>
                                    <span className="text-[10px] text-muted-foreground font-mono">{activity.timestamp}</span>
                                </div>
                                <h4 className="text-sm font-bold tracking-tight mb-1">{activity.item}</h4>
                                <p className="text-xs text-muted-foreground">{activity.message}</p>

                                {activity.confidence && (
                                    <div className="mt-3">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Confidence</span>
                                            <span className="text-[10px] font-mono font-bold">{activity.confidence}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                            <div
                                                className={cn(
                                                    "h-full rounded-full transition-all duration-1000",
                                                    activity.confidence > 80 ? "bg-success" :
                                                        activity.confidence > 40 ? "bg-warning" : "bg-destructive"
                                                )}
                                                style={{ width: `${activity.confidence}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
