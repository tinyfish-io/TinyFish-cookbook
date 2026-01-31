'use client';

import { useState } from 'react';
import { Copy, Loader2, Sparkles } from 'lucide-react';
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

    const generate = async () => {
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
        } catch {
            // ignore
        }
    };

    return (
        <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h4 className="text-sm font-medium text-slate-200 line-clamp-1 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                        {title}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                        Brief, written summary (copyable)
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {summary && (
                        <button
                            onClick={copy}
                            className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-full flex items-center gap-1"
                            title="Copy summary"
                        >
                            <Copy className="w-3 h-3" />
                            {copied ? 'Copied' : 'Copy'}
                        </button>
                    )}
                    <button
                        onClick={generate}
                        disabled={isLoading}
                        className="text-xs bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white px-3 py-1.5 rounded-full flex items-center gap-1"
                    >
                        {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        {isLoading ? 'Generating…' : 'Generate'}
                    </button>
                </div>
            </div>

            {error && <div className="text-xs text-red-300">{error}</div>}

            {summary && (
                <div className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed bg-slate-900/40 border border-slate-700/60 rounded-lg p-3">
                    {summary}
                </div>
            )}
        </div>
    );
}

