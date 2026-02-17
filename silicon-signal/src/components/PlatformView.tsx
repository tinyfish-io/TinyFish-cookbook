'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { ScanForm } from './ScanForm';
import { ScanResultCard } from './ScanResultCard';
import { ScanResult } from '../types';
import SignalOverview from './SignalOverview';
import VendorIntelligence from './VendorIntelligence';
import HistoricalTrend from './HistoricalTrend';
import SystemArchitecture from './SystemArchitecture';

export default function PlatformView() {
    const [result, setResult] = useState<ScanResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [lastPart, setLastPart] = useState('');
    const [lastMfr, setLastMfr] = useState('');

    const handleScan = async (part: string, mfr?: string) => {
        setLastPart(part);
        setLastMfr(mfr ?? '');
        setLoading(true);
        setError('');
        setResult(null);

        try {
            const res = await fetch('/api/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ part_number: part, manufacturer: mfr }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.error || 'Scan failed');
            }
            setResult(data);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Scan failed';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const handleRetry = () => {
        if (lastPart) handleScan(lastPart, lastMfr || undefined);
    };

    return (
        <div className="min-h-screen pt-24 pb-12 px-6">
            <div className="max-w-7xl mx-auto space-y-8">
                <div id="overview" className="flex flex-col items-center justify-center mb-12 scroll-mt-24">
                    <h2 className="heading-technical mb-4 text-center">Active Data Scan</h2>
                    <ScanForm onScan={handleScan} isLoading={loading} />
                    {loading && (
                        <p className="mt-4 text-accent text-sm font-mono animate-pulse" role="status" aria-live="polite">
                            Scanning distributors…
                        </p>
                    )}
                    {error && (
                        <div className="mt-4 p-4 bg-critical/20 border border-critical text-critical text-sm font-mono rounded-sm space-y-3">
                            <p>[!ERROR] {error}</p>
                            <p className="text-slate-300 text-xs">Try a sample part (e.g. NE555, ATmega328P) or add the manufacturer.</p>
                            {lastPart && (
                                <button
                                    type="button"
                                    onClick={handleRetry}
                                    className="px-3 py-1.5 bg-critical/30 hover:bg-critical/50 border border-critical rounded text-xs font-medium transition-colors"
                                >
                                    Retry scan
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        {result && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <ScanResultCard result={result} />
                            </div>
                        )}
                    </div>

                    <div id="logs" className="glass-panel p-4 rounded-sm h-[600px] flex flex-col border-accent/20 scroll-mt-24">
                        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/5">
                            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                            <h3 className="heading-technical text-[9px]">SYSTEM SCAN LOGS</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto font-mono text-[10px] space-y-2 text-foreground-muted">
                            {loading && (
                                <p className="text-accent animate-pulse">
                                    [Tinyfish] Scanning distributors…
                                </p>
                            )}
                            {result?.agent_logs?.map((log, i) => (
                                <p key={i} className={clsx(
                                    "leading-relaxed",
                                    log.includes('ERROR') ? 'text-critical' :
                                        log.includes('CRITICAL') ? 'text-signal' : 'text-foreground-muted'
                                )}>
                                    {log}
                                </p>
                            ))}
                            {!loading && !result && (
                                <p className="opacity-30 italic">Awaiting telemetry request...</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-12 border-t border-border-subtle">
                    <div className="h-[300px]">
                        <SignalOverview result={result} />
                    </div>
                    <div id="vendors" className="h-[300px] scroll-mt-24">
                        <VendorIntelligence result={result} />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-12">
                    <div id="analytics" className="h-[400px] scroll-mt-24">
                        <HistoricalTrend result={result} />
                    </div>
                    <div className="h-[400px]">
                        <SystemArchitecture active={loading} />
                    </div>
                </div>
            </div>
        </div>
    );
}
