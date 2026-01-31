import { motion } from 'framer-motion';

export default function SystemArchitecture({ active }: { active?: boolean }) {
    return (
        <div className="glass-panel p-6 h-full rounded-sm flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h3 className="heading-technical tracking-widest text-[10px]">DATA PROCESSING PIPELINE</h3>
                <span className={`text-[10px] ${active ? "text-accent animate-pulse" : "text-foreground-subtle"}`}>
                    {active ? "PROCESSING" : "IDLE"}
                </span>
            </div>

            <div className="flex-1 w-full flex items-center justify-center relative min-h-[200px]">
                <svg className="w-full h-full" viewBox="0 0 400 200">
                    {[
                        { x1: 50, y1: 50, x2: 150, y2: 100 },
                        { x1: 50, y1: 150, x2: 150, y2: 100 },
                        { x1: 150, y1: 100, x2: 250, y2: 100 },
                        { x1: 250, y1: 100, x2: 350, y2: 100 },
                    ].map((line, i) => (
                        <motion.line
                            key={i}
                            x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2}
                            className="stroke-border"
                            strokeWidth="1"
                            strokeDasharray="4 4"
                        />
                    ))}

                    {active && [
                        { x1: 50, y1: 50, x2: 150, y2: 100, delay: 0 },
                        { x1: 50, y1: 150, x2: 150, y2: 100, delay: 0 },
                        { x1: 150, y1: 100, x2: 250, y2: 100, delay: 0.5 },
                        { x1: 250, y1: 100, x2: 350, y2: 100, delay: 1 },
                    ].map((line, i) => (
                        <motion.line
                            key={`active-${i}`}
                            x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2}
                            stroke="hsl(var(--accent))"
                            strokeWidth="2"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{
                                repeat: Infinity,
                                duration: 1.5,
                                delay: line.delay,
                                repeatDelay: 0.5
                            }}
                        />
                    ))}

                    <g transform="translate(50, 50)">
                        <circle r="15" fill="hsl(var(--card))" stroke={active ? "hsl(var(--accent))" : "hsl(var(--border))"} />
                        <text x="0" y="25" textAnchor="middle" fontSize="6" fill="hsl(var(--foreground-muted))" className="uppercase tracking-tighter">Web Sources</text>
                    </g>
                    <g transform="translate(50, 150)">
                        <circle r="15" fill="hsl(var(--card))" stroke={active ? "hsl(var(--accent))" : "hsl(var(--border))"} />
                        <text x="0" y="25" textAnchor="middle" fontSize="6" fill="hsl(var(--foreground-muted))" className="uppercase tracking-tighter">Distributors</text>
                    </g>

                    <g transform="translate(150, 100)">
                        <rect x="-20" y="-20" width="40" height="40" rx="4" fill="hsl(var(--card))" stroke={active ? "hsl(var(--accent))" : "hsl(var(--border))"} strokeWidth="2" />
                        <text x="0" y="4" textAnchor="middle" fontSize="6" fill="hsl(var(--foreground))" className="font-bold">MINO</text>
                    </g>

                    <g transform="translate(250, 100)">
                        <polygon points="0,-20 20,0 0,20 -20,0" fill="hsl(var(--card))" stroke={active ? "hsl(var(--accent))" : "hsl(var(--border))"} />
                        <text x="0" y="25" textAnchor="middle" fontSize="6" fill="hsl(var(--foreground-muted))" className="uppercase tracking-tighter">Scoring Engine</text>
                    </g>

                    <g transform="translate(350, 100)">
                        <rect x="-25" y="-15" width="50" height="30" rx="4" fill={active ? "hsl(var(--accent)/0.1)" : "hsl(var(--card))"} stroke={active ? "hsl(var(--accent))" : "hsl(var(--border))"} />
                        <text x="0" y="4" textAnchor="middle" fontSize="6" fill={active ? "hsl(var(--accent))" : "hsl(var(--foreground-muted))"} className="font-mono">REPORT</text>
                    </g>
                </svg>
            </div>

            <p className="text-[9px] text-foreground-muted italic text-center mt-4">
                {active ? "Executing multi-step web navigation & DOM extraction..." : "System standing by for telemetry input."}
            </p>
        </div>
    );
}
