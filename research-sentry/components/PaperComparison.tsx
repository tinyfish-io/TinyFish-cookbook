'use client';

import { useState, useEffect } from 'react';
import { ResearchPaper } from '@/lib/types';
import { ComparisonResult } from '@/lib/comparator';
import { X, ArrowRight, Table2, Sparkles } from 'lucide-react';

interface PaperComparisonProps {
    papers: ResearchPaper[];
    onClose: () => void;
}

export default function PaperComparison({ papers, onClose }: PaperComparisonProps) {
    const [comparison, setComparison] = useState<ComparisonResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchComparison = async () => {
            setError(null);
            try {
                const res = await fetch('/api/compare', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ papers }),
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                    const message = typeof data?.error === 'string' ? data.error : 'Failed to compare papers.';
                    setComparison(null);
                    setError(message);
                    return;
                }
                if (!data || !Array.isArray(data.points) || typeof data.summary !== 'string') {
                    setComparison(null);
                    setError('Comparison response was invalid.');
                    return;
                }
                setComparison(data);
            } catch (e) {
                console.error(e);
                setComparison(null);
                setError('Failed to load comparison.');
            } finally {
                setLoading(false);
            }
        };

        fetchComparison();
    }, [papers]);

    return (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4 md:p-12">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-6xl h-full max-h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl">
                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <Table2 className="w-6 h-6 text-indigo-400" />
                            Compare Papers
                        </h2>
                        <p className="text-slate-400 text-sm">Comparing {papers.length} selected items</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-8">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4">
                            <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                            <p className="text-slate-300 animate-pulse">Analyzing methodologies and results...</p>
                        </div>
                    ) : comparison ? (
                        <div className="space-y-8 animate-fade-in">
                            {/* Summary Box */}
                            <div className="bg-indigo-900/20 border border-indigo-500/30 p-6 rounded-2xl">
                                <div className="flex items-center gap-2 mb-3 text-indigo-300 font-semibold">
                                    <Sparkles className="w-5 h-5" />
                                    AI Synthesis
                                </div>
                                <p className="text-indigo-100 leading-relaxed text-lg">
                                    {comparison.summary}
                                </p>
                            </div>

                            {/* Comparison Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr>
                                            <th className="p-4 text-left text-slate-400 font-medium border-b border-slate-700 w-48">Metric</th>
                                            {papers.map(p => (
                                                <th key={p.id} className="p-4 text-left text-white font-semibold border-b border-slate-700 min-w-[250px]">
                                                    {p.title}
                                                </th>
                                            ))}
                                            <th className="p-4 text-left text-emerald-400 font-medium border-b border-slate-700 min-w-[200px]">
                                                Insight
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {comparison.points.map((point, i) => (
                                            <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                                                <td className="p-4 border-b border-slate-800 text-slate-300 font-medium">
                                                    {point.metric}
                                                </td>
                                                {papers.map(p => (
                                                    <td key={p.id} className="p-4 border-b border-slate-800 text-slate-400 text-sm leading-relaxed">
                                                        {point.papers[p.id] || '-'}
                                                    </td>
                                                ))}
                                                <td className="p-4 border-b border-slate-800 text-emerald-300/80 text-sm italic">
                                                    {point.insight}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-red-400">{error || 'Failed to load comparison.'}</div>
                    )}
                </div>
            </div>
        </div>
    );
}
