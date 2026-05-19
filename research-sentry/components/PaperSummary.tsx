'use client';

import { useState } from 'react';
import { Copy, Loader2, Sparkles, X } from 'lucide-react';
import { ResearchPaper } from '@/lib/types';

type SummaryLength = 'short' | 'medium' | 'long';

interface PaperSummaryProps {
    paper: ResearchPaper;
    length?: SummaryLength;
    title?: string;
}

export default function PaperSummary({ paper, length = 'medium', title = 'AI Summary' }: PaperSummaryProps) {
    const [summary, setSummary] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [open, setOpen] = useState(false);

    const generate = async () => {
        setOpen(true);
        if (summary) return; // already generated, just reopen
        setIsLoading(true);
        setError(null);
        setCopied(false);

        try {
            const res = await fetch('/api/summarize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paper, length }),
            });
            if (!res.ok) throw new Error('Failed to generate summary');
            const data = (await res.json()) as { summary?: string };
            const s = (data.summary || '').trim();
            setSummary(s);
            if (!s) setError('No summary returned');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to generate summary');
        } finally {
            setIsLoading(false);
        }
    };

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(summary);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1200);
        } catch { }
    };

    return (
        <>
            {/* Trigger button — sits inline in the card */}
            <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <h4 className="text-sm font-medium text-slate-200 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                        {title}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-1">Brief, written summary (copyable)</p>
                </div>
                <button
                    onClick={generate}
                    disabled={isLoading}
                    className="text-xs bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white px-3 py-1.5 rounded-full flex items-center gap-1 shrink-0"
                >
                    {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    {isLoading ? 'Generating…' : 'Generate'}
                </button>
            </div>

            {/* Modal popup */}
            {open && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                    onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
                >
                    <div className="relative w-full max-w-2xl max-h-[80vh] flex flex-col bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl shadow-black/60">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 shrink-0">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-emerald-400" />
                                <span className="text-sm font-semibold text-slate-200">{title}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {summary && (
                                    <button
                                        onClick={copy}
                                        className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-full flex items-center gap-1"
                                    >
                                        <Copy className="w-3 h-3" />
                                        {copied ? 'Copied!' : 'Copy'}
                                    </button>
                                )}
                                <button
                                    onClick={() => setOpen(false)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Paper title */}
                        <div className="px-6 py-3 border-b border-slate-800 shrink-0">
                            <p className="text-xs text-slate-400 font-medium line-clamp-2">{paper.title}</p>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto px-6 py-5">
                            {isLoading && (
                                <div className="flex items-center gap-3 text-slate-400">
                                    <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                                    <span className="text-sm">Generating summary…</span>
                                </div>
                            )}
                            {error && <p className="text-sm text-red-400">{error}</p>}
                            {summary && (
                                <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                                    {summary}
                                </p>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-3 border-t border-slate-800 shrink-0">
                            <button
                                onClick={() => setOpen(false)}
                                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
