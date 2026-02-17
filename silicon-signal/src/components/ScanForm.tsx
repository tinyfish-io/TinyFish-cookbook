'use client';

import { useState, type FormEvent } from 'react';
import { Search, Loader2 } from 'lucide-react';

interface ScanFormProps {
    onScan: (partNumber: string, manufacturer?: string) => void;
    isLoading: boolean;
}

const sampleParts = [
    { part: 'LM358', manufacturer: 'Texas Instruments' },
    { part: 'NE555', manufacturer: 'Texas Instruments' },
    { part: 'ATmega328P', manufacturer: 'Microchip' },
    { part: 'STM32F103C8T6', manufacturer: 'STMicroelectronics' },
    { part: 'ESP32-WROOM-32', manufacturer: 'Espressif' },
];

export function ScanForm({ onScan, isLoading }: ScanFormProps) {
    const [part, setPart] = useState('');
    const [mfr, setMfr] = useState('');

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (part) onScan(part, mfr);
    };

    return (
        <div className="w-full max-w-3xl mx-auto space-y-4" role="region" aria-label="Part scan form">
            <form onSubmit={handleSubmit} className="glass p-6 rounded-2xl w-full flex flex-col md:flex-row gap-4 items-end border-t border-white/10 shadow-2xl shadow-blue-900/20" aria-label="Scan part number and manufacturer">
                <div className="flex-1 w-full">
                    <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider" htmlFor="scan-part-number">Part Number</label>
                    <input
                        id="scan-part-number"
                        type="text"
                        value={part}
                        onChange={e => setPart(e.target.value)}
                        placeholder="e.g. STM32F103C8T6"
                        className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
                        required
                        aria-label="Part number"
                    />
                </div>
                <div className="flex-1 w-full">
                    <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider" htmlFor="scan-manufacturer">Manufacturer (Optional)</label>
                    <input
                        id="scan-manufacturer"
                        type="text"
                        value={mfr}
                        onChange={e => setMfr(e.target.value)}
                        placeholder="e.g. STMicroelectronics"
                        className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all"
                        aria-label="Manufacturer optional"
                    />
                </div>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium px-8 py-3 rounded-lg flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-900/20"
                    aria-label={isLoading ? 'Scanning…' : 'Scan part'}
                >
                    {isLoading ? <Loader2 className="animate-spin w-4 h-4" aria-hidden /> : <Search className="w-4 h-4" aria-hidden />}
                    Scan
                </button>
            </form>
            <div className="glass p-4 rounded-xl border border-white/10 text-xs text-slate-400">
                <div className="flex flex-col gap-2">
                    <span className="uppercase tracking-wider text-[10px] text-slate-500">Commonly checked parts</span>
                    <p className="text-[11px] text-slate-400">
                        Click a part to fill the form. NE555, ATmega328P, and STM32F103C8T6 typically return lifecycle and availability from distributor scans.
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {sampleParts.map((sample) => (
                            <button
                                key={`${sample.part}-${sample.manufacturer}`}
                                type="button"
                                onClick={() => {
                                    setPart(sample.part);
                                    setMfr(sample.manufacturer);
                                }}
                                className="px-2.5 py-1.5 rounded-md border border-slate-700/40 bg-slate-900/40 text-slate-200 hover:text-white hover:border-cyan-500/50 transition-all font-mono text-[11px]"
                                aria-label={`Use sample part ${sample.part}`}
                            >
                                {sample.part}
                            </button>
                        ))}
                    </div>
                    <p className="text-[11px] text-slate-500">
                        Use Traceability Evidence links in the result for price and lead time when not shown. Adding the manufacturer (e.g. Texas Instruments) can improve results.
                    </p>
                </div>
            </div>
        </div>
    );
}
