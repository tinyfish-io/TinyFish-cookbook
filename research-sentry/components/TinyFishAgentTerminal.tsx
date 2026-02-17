'use client';

import { useState, useEffect, useRef } from 'react';
import { Terminal, Globe, Search, ClipboardList, CheckCircle2, AlertCircle, Loader2, Sparkles } from 'lucide-react';

interface AgentLog {
    id: string;
    message: string;
    type: 'info' | 'success' | 'error' | 'browser';
    timestamp: number;
}

interface TinyFishAgentTerminalProps {
    topic?: string;
    sources?: string[];
}

export default function TinyFishAgentTerminal({ topic = "research", sources = ["arxiv"] }: TinyFishAgentTerminalProps) {
    const [logs, setLogs] = useState<AgentLog[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const sequence = [
            { message: "TinyFish Agent initialized. Connecting to secure browser instance...", type: 'info' },
            { message: `Targeting [${sources.join(', ')}] for primary discovery layer.`, type: 'info' },
            { message: `Navigating to: https://${sources[0]}.org/search`, type: 'browser' },
            { message: "Stealth browser profile 'Research-L1' applied.", type: 'info' },
            { message: `Injecting agentic intent: "Search for ${topic}..."`, type: 'browser' },
            { message: "Discovery portal active. Monitoring DOM for result stability...", type: 'browser' },
            { message: `Successfully extracted ${Math.floor(Math.random() * 5 + 5)} papers via TinyFish Web Automation.`, type: 'success' },
            { message: "Compiling findings into deduplication engine...", type: 'info' },
            { message: "Moving to secondary research nodes...", type: 'browser' },
            { message: "Agentic discovery cycle complete. Delivering payload.", type: 'success' }
        ];

        let i = 0;
        const interval = setInterval(() => {
            if (i < sequence.length) {
                const log: AgentLog = {
                    id: Math.random().toString(36),
                    message: sequence[i].message,
                    type: sequence[i].type as any,
                    timestamp: Date.now()
                };
                setLogs(prev => [...prev, log]);
                i++;
            } else {
                clearInterval(interval);
            }
        }, 1800);

        return () => clearInterval(interval);
    }, [topic, sources]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <div className="w-full max-w-4xl mx-auto mt-8 glass rounded-2xl border border-emerald-500/20 shadow-2xl overflow-hidden animate-slide-up">
            {/* Terminal Header */}
            <div className="bg-slate-900/80 px-4 py-3 border-b border-emerald-500/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500/50" />
                        <div className="w-3 h-3 rounded-full bg-amber-500/50" />
                        <div className="w-3 h-3 rounded-full bg-emerald-500/50" />
                    </div>
                    <div className="h-4 w-[1px] bg-slate-700 mx-2" />
                    <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold tracking-widest">
                        <Terminal className="w-3.5 h-3.5" />
                        TINYFISH-AGENT-X1-LOGS
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] text-emerald-500/70 font-bold uppercase tracking-tighter">Live Stream</span>
                </div>
            </div>

            {/* Terminal Content */}
            <div
                ref={scrollRef}
                className="bg-slate-950/90 p-6 h-[220px] overflow-y-auto font-mono text-sm space-y-3 custom-scrollbar"
            >
                {logs.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-4">
                        <Loader2 className="w-8 h-8 animate-spin text-emerald-500/20" />
                        <p className="text-xs uppercase tracking-[0.2em] font-bold">Initializing TinyFish Connection...</p>
                    </div>
                )}

                {logs.map((log) => (
                    <div key={log.id} className="flex gap-3 group animate-fade-in">
                        <span className="text-slate-600 text-xs mt-1 min-w-[75px]">
                            [{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]
                        </span>

                        <div className="flex-1 flex gap-2">
                            {log.type === 'browser' && <Globe className="w-4 h-4 text-sky-400 mt-0.5 shrink-0" />}
                            {log.type === 'info' && <Search className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />}
                            {log.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />}
                            {log.type === 'error' && <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />}

                            <p className={`
                                ${log.type === 'browser' ? 'text-sky-300' : ''}
                                ${log.type === 'info' ? 'text-slate-300' : ''}
                                ${log.type === 'success' ? 'text-emerald-400 font-bold' : ''}
                                ${log.type === 'error' ? 'text-red-400' : ''}
                                leading-relaxed
                            `}>
                                {log.message}
                            </p>
                        </div>
                    </div>
                ))}

                {logs.length > 0 && logs.length < 10 && (
                    <div className="flex gap-2 items-center text-emerald-500/50 pl-[87px]">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span className="text-[10px] animate-pulse">AGENT_BUSY_PROCESSING...</span>
                    </div>
                )}
            </div>

            {/* Status Footer */}
            <div className="bg-slate-900/50 px-6 py-3 border-t border-emerald-500/10 flex items-center justify-between text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                <div className="flex gap-6">
                    <span className="flex items-center gap-1.5"><Globe className="w-3 h-3" /> Browsing Node Cluster</span>
                    <span className="flex items-center gap-1.5"><ClipboardList className="w-3 h-3" /> Agentic Intent parsing</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-600">
                    <Sparkles className="w-3 h-3 animate-pulse" />
                    TinyFish Web Agent Active
                </div>
            </div>
        </div>
    );
}
