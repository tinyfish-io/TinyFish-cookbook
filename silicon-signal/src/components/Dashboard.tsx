'use client';

import { useState } from 'react';
import { ScanForm } from './ScanForm';
import { ScanResultCard } from './ScanResultCard';
import { ScanResult } from '../types';
import { Layers } from 'lucide-react';

export default function Dashboard() {
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
        <div className="min-h-screen p-6 md:p-12 max-w-7xl mx-auto flex flex-col items-center">
            <div className="mb-12 text-center space-y-4">
                <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 mb-4 shadow-[0_0_40px_-5px_rgba(6,182,212,0.3)]">
                    <Layers className="w-8 h-8 text-cyan-400" />
                </div>
                <h1 className="text-4xl md:text-6xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400 tracking-tight text-glow">
                    SiliconSignal
                </h1>
                <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto font-light">
                    Semiconductor Supply-Chain Analytics. <span className="text-cyan-400 font-normal">Monitor disruptions across the grid.</span>
                </p>
            </div>

            <ScanForm onScan={handleScan} isLoading={loading} />

            {loading && (
                <p className="mt-4 text-cyan-400 text-sm font-mono animate-pulse" role="status" aria-live="polite">
                    Scanning distributors…
                </p>
            )}
            {error && (
                <div className="mt-8 p-4 bg-rose-950/30 border border-rose-900/50 rounded-lg text-rose-300 animate-in fade-in slide-in-from-bottom-2 space-y-3">
                    <p>{error}</p>
                    <p className="text-slate-400 text-xs">Try a sample part (e.g. NE555, ATmega328P) or add the manufacturer.</p>
                    {lastPart && (
                        <button
                            type="button"
                            onClick={handleRetry}
                            className="px-3 py-1.5 bg-rose-900/50 hover:bg-rose-900/70 border border-rose-800 rounded text-xs font-medium transition-colors"
                        >
                            Retry scan
                        </button>
                    )}
                </div>
            )}

            {result && <ScanResultCard result={result} />}
        </div>
    );
}
