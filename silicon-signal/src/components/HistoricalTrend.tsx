import { motion } from 'framer-motion';
import { ScanResult } from '../types';

export default function HistoricalTrend({ result }: { result: ScanResult | null }) {

    const history = result?.history || [];

    const points = history.length > 1 ? history.map((h, i) => {
        const x = (i / (history.length - 1)) * 240 + 20;
        const y = 90 - (h.score / 100) * 80;
        return { x, y };
    }) : [];

    const pathData = points.length > 0
        ? `M ${points[0].x},${points[0].y} ` + points.slice(1).map(p => `L ${p.x},${p.y}`).join(' ')
        : "";

    return (
        <div className="glass-panel p-6 h-full rounded-sm relative overflow-hidden">
            <div className="flex justify-between items-center mb-6">
                <h3 className="heading-technical tracking-widest text-[10px]">SUPPLY RISK TREND</h3>
                <span className="text-[10px] text-foreground-subtle uppercase">
                    {history.length} DATA POINTS
                </span>
            </div>

            <div className="relative h-[200px] w-full flex items-center justify-center">
                {points.length > 0 ? (
                    <svg className="w-full h-full" viewBox="0 0 280 100" preserveAspectRatio="none">
                        <defs>
                            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="hsl(190, 40%, 45%)" stopOpacity="0.5" />
                                <stop offset="100%" stopColor="hsl(190, 40%, 45%)" stopOpacity="0" />
                            </linearGradient>
                        </defs>

                        <line x1="0" y1="25" x2="280" y2="25" stroke="hsl(0 0% 14%)" strokeWidth="1" strokeDasharray="4 4" />
                        <line x1="0" y1="50" x2="280" y2="50" stroke="hsl(0 0% 14%)" strokeWidth="1" strokeDasharray="4 4" />
                        <line x1="0" y1="75" x2="280" y2="75" stroke="hsl(0 0% 14%)" strokeWidth="1" strokeDasharray="4 4" />

                        <motion.path
                            d={pathData}
                            fill="none"
                            stroke="hsl(190, 40%, 45%)"
                            strokeWidth="2"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 1.5, ease: "easeInOut" }}
                            style={{ filter: "drop-shadow(0 0 4px hsl(190 50% 50%))" }}
                        />

                        <path d={`${pathData} L ${points[points.length - 1].x},100 L ${points[0].x},100 Z`} fill="url(#chartGradient)" className="opacity-20" />

                        <circle
                            cx={points[points.length - 1].x}
                            cy={points[points.length - 1].y}
                            r="4"
                            fill="hsl(190, 40%, 45%)"
                            className="animate-pulse"
                        />
                    </svg>
                ) : (
                    <div className="flex flex-col items-center opacity-20 text-center">
                        <div className="w-full h-px bg-border mb-4" />
                        <p className="text-[10px] tracking-widest uppercase mb-2">Insufficient Time-Series Data</p>
                        <p className="text-[8px] text-foreground-muted">Trends will generate after multiple scans of this part.</p>
                    </div>
                )}
            </div>

            <div className="flex justify-between px-2 text-[8px] text-foreground-subtle font-mono mt-4 uppercase tracking-tighter">
                {history.length > 1 ? (
                    <>
                        <span>{history[0].timestamp}</span>
                        <span>{history[history.length - 1].timestamp}</span>
                    </>
                ) : (
                    <span className="w-full text-center">T-MINUS 00:00:00</span>
                )}
            </div>

            <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-border">
                <div>
                    <p className="text-[10px] text-foreground-subtle mb-1 uppercase">Peak Risk</p>
                    <p className="text-lg font-light text-foreground">{history.length > 0 ? Math.max(...history.map(h => h.score)) : '--'}</p>
                </div>
                <div>
                    <p className="text-[10px] text-foreground-subtle mb-1 uppercase">Floor</p>
                    <p className="text-lg font-light text-foreground">{history.length > 0 ? Math.min(...history.map(h => h.score)) : '--'}</p>
                </div>
                <div>
                    <p className="text-[10px] text-foreground-subtle mb-1 uppercase">Avg</p>
                    <p className="text-lg font-light text-foreground">
                        {history.length > 0 ? Math.round(history.reduce((a, b) => a + b.score, 0) / history.length) : '--'}
                    </p>
                </div>
            </div>
        </div>
    );
}
