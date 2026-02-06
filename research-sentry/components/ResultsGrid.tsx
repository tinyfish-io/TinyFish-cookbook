'use client';

import { useState } from 'react';
import { ResearchPaper, SearchResult } from '@/lib/types';
import PaperCard from './PaperCard';
import { FileDown, BookOpen, GitCompareArrows, Sparkles, Activity } from 'lucide-react';
import PaperComparison from './PaperComparison';

interface ResultsGridProps {
    results: SearchResult | null;
    selectedPapers: Set<string>;
    onToggleSelect: (paperId: string) => void;
    onExport: () => void;
    onTrackCitation?: (paperId: string) => void;
}

export default function ResultsGrid({ results, selectedPapers, onToggleSelect, onExport, onTrackCitation }: ResultsGridProps) {
    const [showComparison, setShowComparison] = useState(false);

    if (!results) return null;

    const { papers, query, transcript } = results;
    const selectedPaperObjects = papers.filter(p => selectedPapers.has(p.id));

    if (papers.length === 0) {
        return (
            <div className="max-w-4xl mx-auto text-center py-16">
                <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-12">
                    <BookOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-300 mb-2">No papers found</h3>
                    <p className="text-slate-400">
                        Try adjusting your search query or selecting different sources
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse glow-emerald" />
                            <h2 className="text-2xl font-bold text-white">Agentic Discovery Results</h2>
                        </div>
                        {transcript && (
                            <p className="text-slate-400 text-sm mb-1 bg-slate-800/20 p-2 rounded-lg border border-slate-700/50">
                                <span className="text-emerald-400 font-bold uppercase text-[10px] tracking-widest mr-2">Parsed Intent:</span>
                                <span className="italic">"{transcript}"</span>
                            </p>
                        )}
                        <p className="text-slate-400 text-sm">
                            Successfully retrieved <span className="text-emerald-400 font-bold">{papers.length}</span> high-relevance papers
                            {query && <span> for <span className="text-slate-200 font-medium">"{query}"</span></span>}
                        </p>
                    </div>

                    <div className="flex gap-3">
                        {selectedPapers.size >= 2 && (
                            <button
                                onClick={() => setShowComparison(true)}
                                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-emerald-500/30 animate-scale-in"
                            >
                                <GitCompareArrows className="w-5 h-5" />
                                Compare {selectedPapers.size}
                            </button>
                        )}

                        {selectedPapers.size > 0 && (
                            <button
                                onClick={onExport}
                                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-teal-500/30 animate-scale-in"
                            >
                                <FileDown className="w-5 h-5" />
                                Export citation <span className="text-white/80">({selectedPapers.size})</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* TinyFish Discovery Summary */}
                <div className="glass p-4 rounded-2xl border border-emerald-500/10 flex flex-wrap gap-8 items-center justify-between mb-8 animate-fade-in">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                            <Sparkles className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Agent Performance</p>
                            <p className="text-white font-bold text-sm">Cross-Portal Discovery Complete</p>
                        </div>
                    </div>

                    <div className="flex gap-8">
                        <div className="text-center">
                            <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Scanned</p>
                            <p className="text-white font-mono text-lg font-bold">8 Portals</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Yield</p>
                            <p className="text-emerald-400 font-mono text-lg font-bold">{papers.length} Papers</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Engine</p>
                            <p className="text-amber-400 font-mono text-lg font-bold">TinyFish-SSE</p>
                        </div>
                    </div>

                    <div className="hidden lg:block h-8 w-[1px] bg-slate-800" />

                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-[10px] font-bold text-emerald-500/80">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        100% AGENTIC EXTRACTION
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {papers.map((paper) => (
                    <PaperCard
                        key={paper.id}
                        paper={paper}
                        selected={selectedPapers.has(paper.id)}
                        onSelect={(selected) => onToggleSelect(paper.id)}
                        onTrack={() => onTrackCitation?.(paper.id)}
                    />
                ))}
            </div>

            {showComparison && (
                <PaperComparison
                    papers={selectedPaperObjects}
                    onClose={() => setShowComparison(false)}
                />
            )}
        </div>
    );
}
