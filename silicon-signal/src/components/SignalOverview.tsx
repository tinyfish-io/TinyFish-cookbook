import clsx from 'clsx';
import { ScanResult } from '../types';

export default function SignalOverview({ result }: { result: ScanResult | null }) {
    const metrics = result ? [
        { label: 'Supply Chain Index', value: 100 - result.risk.score, status: 'Active', color: (100 - result.risk.score) > 70 ? 'bg-success' : 'bg-signal' },
        { label: 'Lead Time Risk', value: result.risk.score, status: result.risk.level, color: result.risk.level === 'HIGH' ? 'bg-critical' : 'bg-signal' },
        { label: 'Data Confidence', value: 95, status: 'Verified', color: 'bg-success' },
    ] : [];

    return (
        <div className="glass-panel p-6 h-full rounded-sm">
            <div className="flex justify-between items-center mb-6">
                <h3 className="heading-technical tracking-widest text-[10px]">REAL-TIME METRICS</h3>
                <span className={clsx("flex items-center gap-2 text-[10px] animate-pulse", result ? "text-accent" : "text-foreground-subtle")}>
                    <span className={clsx("w-1.5 h-1.5 rounded-full", result ? "bg-accent" : "bg-border")} />
                    {result ? "LIVE TELEMETRY" : "SYSTEM IDLE"}
                </span>
            </div>

            <div className="space-y-8">
                {metrics.length > 0 ? metrics.map((m) => (
                    <div key={m.label}>
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-foreground-muted">{m.label}</span>
                            <span className="font-mono text-foreground">{m.value}%</span>
                        </div>
                        <div className="w-full h-1 bg-border rounded-full overflow-hidden">
                            <div
                                className={clsx("h-full rounded-full relative transition-all duration-1000", m.color)}
                                style={{ width: `${m.value}%` }}
                            >
                                <div className="absolute right-0 top-0 bottom-0 w-px bg-white/50" />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                            <div className={clsx("w-1.5 h-1.5 rounded-full", m.color)} />
                            <span className="text-[10px] text-foreground-subtle uppercase tracking-wider">{m.status}</span>
                        </div>
                    </div>
                )) : (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 py-12">
                        <div className="w-full h-px bg-border mb-4" />
                        <p className="text-[10px] tracking-[0.3em] font-light uppercase">Awaiting Scan Data</p>
                    </div>
                )}
            </div>
        </div>
    );
}
