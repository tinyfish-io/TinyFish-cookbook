'use client';

import { useState } from 'react';
import { Search, Mic, MessageSquare, Sparkles } from 'lucide-react';
import VoiceRecorder from './VoiceRecorder';
import { SourceType } from '@/lib/types';

interface SearchInterfaceProps {
    onTextSearch: (query: string, sources: SourceType[]) => void;
    onVoiceSearch: (audioBlob: Blob) => void;
    loading?: boolean;
}

const SOURCES: { value: SourceType; label: string }[] = [
    { value: 'arxiv', label: 'ArXiv' },
    { value: 'pubmed', label: 'PubMed' },
    { value: 'semantic_scholar', label: 'Semantic Scholar' },
    { value: 'google_scholar', label: 'Google Scholar' },
    { value: 'ieee', label: 'IEEE Xplore' },
    { value: 'ssrn', label: 'SSRN' },
    { value: 'core', label: 'CORE' },
    { value: 'doaj', label: 'DOAJ' },
];

export default function SearchInterface({ onTextSearch, onVoiceSearch, loading }: SearchInterfaceProps) {
    const [mode, setMode] = useState<'text' | 'voice'>('text');
    const [query, setQuery] = useState('');
    const [selectedSources, setSelectedSources] = useState<SourceType[]>(['arxiv', 'semantic_scholar']);

    const handleTextSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim() && !loading) {
            onTextSearch(query, selectedSources);
        }
    };

    const toggleSource = (source: SourceType) => {
        setSelectedSources(prev =>
            prev.includes(source)
                ? prev.filter(s => s !== source)
                : [...prev, source]
        );
    };

    return (
        <div className="w-full max-w-4xl mx-auto">
            {/* Mode Toggle */}
            <div className="flex justify-center gap-2 mb-6">
                <button
                    onClick={() => setMode('text')}
                    className={`
            flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all
            ${mode === 'text'
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/30'
                            : 'bg-slate-800/50 text-slate-400 hover:text-slate-200 border border-slate-700'
                        }
          `}
                >
                    <MessageSquare className="w-5 h-5" />
                    Text Search
                </button>
                <button
                    onClick={() => setMode('voice')}
                    className={`
            flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all
            ${mode === 'voice'
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/30'
                            : 'bg-slate-800/50 text-slate-400 hover:text-slate-200 border border-slate-700'
                        }
          `}
                >
                    <Mic className="w-5 h-5" />
                    Voice Search
                </button>
            </div>

            {/* Search Area */}
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 shadow-xl relative overflow-hidden group">
                {/* Agentic Glow Effect */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-500/20 transition-all duration-700" />

                {mode === 'text' ? (
                    <form onSubmit={handleTextSearch} className="space-y-6 relative z-10">
                        <div className="relative">
                            <div className="absolute left-4 top-4 w-5 h-5 text-emerald-400">
                                <Sparkles className="w-full h-full animate-pulse" />
                            </div>
                            <textarea
                                value={query}
                                onChange={(e) => {
                                    setQuery(e.target.value);
                                    e.target.style.height = 'auto';
                                    e.target.style.height = e.target.scrollHeight + 'px';
                                }}
                                placeholder="Describe your research goal in detail (e.g., 'Find papers on LLM hallucination and provide a summary of their methodologies')..."
                                className="w-full pl-12 pr-4 py-4 bg-slate-800/30 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all resize-none min-h-[120px]"
                                disabled={loading}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleTextSearch(e as any);
                                    }
                                }}
                            />
                            <div className="absolute bottom-3 right-3 flex items-center gap-2 px-2 py-1 bg-emerald-500/10 rounded-md border border-emerald-500/20">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-300">Agentic Discovery</span>
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <p className="text-slate-300 text-sm font-semibold tracking-wide">Target Discovery Sources</p>
                                    {selectedSources.length > 3 && (
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-bold animate-pulse">
                                            <Sparkles className="w-3 h-3" />
                                            RECOMMEND 2-3 FOR SPEED
                                        </div>
                                    )}
                                </div>
                                <span className="text-[10px] text-slate-500 font-mono">MULTI-SOURCE SCAN ENABLED</span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {SOURCES.map(source => (
                                    <label
                                        key={source.value}
                                        className={`
                                            flex items-center gap-2 px-4 py-3 rounded-xl cursor-pointer transition-all duration-300
                                            ${selectedSources.includes(source.value)
                                                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200 shadow-inner'
                                                : 'bg-slate-800/20 border-slate-700/30 text-slate-500 hover:border-slate-600 hover:text-slate-300'
                                            }
                                            border
                                        `}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedSources.includes(source.value)}
                                            onChange={() => toggleSource(source.value)}
                                            className="w-4 h-4 rounded border-slate-600 text-emerald-600 focus:ring-emerald-500 bg-transparent"
                                        />
                                        <span className="text-xs font-medium">{source.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !query.trim()}
                            className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-700 disabled:to-slate-700 text-white rounded-xl font-bold tracking-wider transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 disabled:shadow-none disabled:cursor-not-allowed uppercase"
                        >
                            {loading ? 'Processing Intent...' : 'Initiate Agentic Discovery'}
                        </button>
                    </form>
                ) : (
                    <div className="py-8">
                        <VoiceRecorder
                            onRecordingComplete={onVoiceSearch}
                            disabled={loading}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
