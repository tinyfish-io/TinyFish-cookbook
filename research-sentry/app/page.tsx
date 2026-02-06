'use client';

import { useState } from 'react';
import { Sparkles, Github, Zap, Mic, MessageSquare } from 'lucide-react';
import SearchInterface from '@/components/SearchInterface';
import ResultsGrid from '@/components/ResultsGrid';
import ConversationInterface from '@/components/ConversationInterface';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';
import CoPilotMode from '@/components/CoPilotMode';
import WorkflowSelector from '@/components/WorkflowSelector';
import CitationTracker from '@/components/CitationTracker';
import TinyFishAgentTerminal from '@/components/TinyFishAgentTerminal';
import { SearchResult, SourceType } from '@/lib/types';

export default function Home() {
    const [results, setResults] = useState<SearchResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedPapers, setSelectedPapers] = useState<Set<string>>(new Set());
    const [activeTab, setActiveTab] = useState<'search' | 'assistant' | 'workflows'>('search');
    const [coPilotActive, setCoPilotActive] = useState(false);
    const [trackingPaperId, setTrackingPaperId] = useState<string | null>(null);
    const [searchTopic, setSearchTopic] = useState<string>('');
    const [searchSources, setSearchSources] = useState<SourceType[]>([]);
    const [voiceTranscript, setVoiceTranscript] = useState<string | null>(null);
    const [voicePreviewResults, setVoicePreviewResults] = useState<SearchResult | null>(null);

    const handleTextSearch = async (query: string, sources: SourceType[]) => {
        setLoading(true);
        setError(null);
        setSelectedPapers(new Set());
        setSearchTopic(query);
        setSearchSources(sources);

        try {
            const response = await fetch('/api/search/text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, sources }),
            });

            if (!response.ok) {
                throw new Error(`Search failed: ${response.statusText}`);
            }

            const data = await response.json();
            setResults(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred during search');
        } finally {
            setLoading(false);
        }
    };

    const handleVoiceSearch = async (audioBlob: Blob) => {
        setLoading(true);
        setError(null);
        setSelectedPapers(new Set());
        setSearchTopic('Voice Discovery Pattern');
        setSearchSources(['arxiv', 'pubmed', 'semantic_scholar']);
        setVoiceTranscript(null);
        setVoicePreviewResults(null);

        try {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');

            const response = await fetch('/api/search/voice', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`Voice search failed: ${response.statusText}`);
            }

            const data = await response.json();
            const transcript = typeof data?.transcript === 'string' ? data.transcript.trim() : '';
            if (transcript) {
                setVoiceTranscript(transcript);
                setVoicePreviewResults(data);
            } else {
                setResults(data);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred during voice search');
        } finally {
            setLoading(false);
        }
    };

    const togglePaperSelection = (paperId: string) => {
        setSelectedPapers(prev => {
            const next = new Set(prev);
            if (next.has(paperId)) {
                next.delete(paperId);
            } else {
                next.add(paperId);
            }
            return next;
        });
    };

    const handleExport = async () => {
        if (!results || selectedPapers.size === 0) return;

        const papersToExport = results.papers.filter(p => selectedPapers.has(p.id));

        try {
            const response = await fetch('/api/export/bibtex', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ papers: papersToExport }),
            });

            if (!response.ok) {
                throw new Error('Export failed');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'papers.bib';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            setError('Failed to export papers');
        }
    };

    const retrySearch = () => {
        setError(null);
    };

    return (
        <div className="min-h-screen px-4 py-8 md:py-16 relative">
            {/* Header */}
            <header className="max-w-5xl mx-auto text-center mb-16 animate-fade-in relative z-10">
                <div className="flex items-center justify-center gap-4 mb-6">
                    <div className="relative">
                        <Sparkles className="w-12 h-12 md:w-14 md:h-14 text-emerald-400 float animate-pulse" />
                        <div className="absolute inset-0 blur-xl bg-emerald-500/30 animate-pulse" />
                    </div>
                    <h1 className="text-6xl md:text-7xl font-black text-shimmer">
                        Research Sentry
                    </h1>
                </div>
                <p className="text-2xl md:text-3xl font-semibold mb-3 bg-gradient-to-r from-slate-200 via-emerald-200 to-slate-200 bg-clip-text text-transparent">
                    Your AI Research Co-Pilot
                </p>
                <p className="text-slate-400 max-w-2xl mx-auto text-lg leading-relaxed">
                    Search academic papers using your voice or text. Powered by <span className="text-emerald-400 font-semibold">OpenAI</span>, <span className="text-teal-400 font-semibold">GPT-4</span>, and <span className="text-amber-400 font-semibold">TinyFish Web Agent</span>.
                </p>

                {/* Features badges */}
                <div className="flex flex-wrap justify-center gap-3 mt-10">
                    <div className="group flex items-center gap-2 px-5 py-2.5 glass rounded-full text-slate-200 text-sm font-medium hover:bg-slate-800/60 transition-all duration-300 hover:scale-105">
                        <Zap className="w-4 h-4 text-yellow-400 group-hover:animate-pulse" />
                        8+ Sources
                    </div>
                    <div className="group flex items-center gap-2 px-5 py-2.5 glass rounded-full text-slate-200 text-sm font-medium hover:bg-slate-800/60 transition-all duration-300 hover:scale-105">
                        <Sparkles className="w-4 h-4 text-emerald-400 group-hover:animate-pulse" />
                        AI Powered
                    </div>
                    <div className="group flex items-center gap-2 px-5 py-2.5 glass rounded-full text-slate-200 text-sm font-medium hover:bg-slate-800/60 transition-all duration-300 hover:scale-105">
                        <Mic className="w-4 h-4 text-emerald-400 group-hover:animate-pulse" />
                        Voice First
                    </div>
                    <div className="group flex items-center gap-2 px-5 py-2.5 glass rounded-full text-slate-200 text-sm font-medium hover:bg-slate-800/60 transition-all duration-300 hover:scale-105">
                        <Github className="w-4 h-4 text-slate-400 group-hover:animate-pulse" />
                        Export Ready
                    </div>
                </div>
            </header>

            {/* Tabs */}
            <div className="max-w-3xl mx-auto mb-12 bg-slate-900/50 p-1 rounded-full border border-slate-700/50 flex flex-wrap gap-2 justify-center sm:justify-start overflow-hidden">
                <button
                    onClick={() => setActiveTab('search')}
                    className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2 px-4 rounded-full transition-all ${activeTab === 'search'
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                        : 'text-slate-400 hover:text-white'
                        }`}
                >
                    <Sparkles className="w-4 h-4" />
                    Search
                </button>
                <button
                    onClick={() => setActiveTab('assistant')}
                    className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2 px-4 rounded-full transition-all ${activeTab === 'assistant'
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                        : 'text-slate-400 hover:text-white'
                        }`}
                >
                    <MessageSquare className="w-4 h-4" />
                    Assistant
                </button>
                <button
                    onClick={() => setActiveTab('workflows')}
                    className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2 px-4 rounded-full transition-all ${activeTab === 'workflows'
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                        : 'text-slate-400 hover:text-white'
                        }`}
                >
                    <Zap className="w-4 h-4" />
                    Workflows
                </button>
                <button
                    onClick={() => setCoPilotActive(true)}
                    className="flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2 px-4 rounded-full text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 border border-emerald-500/30 transition-all font-medium"
                >
                    <Mic className="w-4 h-4" />
                    Co-Pilot
                </button>
            </div>

            {coPilotActive && results && (
                <CoPilotMode
                    papers={results.papers}
                    onExit={() => setCoPilotActive(false)}
                />
            )}

            {/* Citation Tracker Modal */}
            {trackingPaperId && results && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
                    <div className="w-full max-w-2xl relative">
                        <button
                            onClick={() => setTrackingPaperId(null)}
                            className="absolute -top-12 right-0 text-white/70 hover:text-white transition-colors flex items-center gap-2 group"
                        >
                            <span className="text-sm font-medium group-hover:underline">Close Preview</span>
                            <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center">✕</div>
                        </button>
                        <CitationTracker
                            paper={results.papers.find(p => p.id === trackingPaperId)!}
                        />
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto min-h-[600px]">
                {activeTab === 'workflows' ? (
                    <div className="animate-fade-in">
                        <WorkflowSelector />
                    </div>
                ) : activeTab === 'search' ? (
                    <div className="animate-slide-up space-y-16">
                        {/* Search Interface */}
                        <div className="max-w-4xl mx-auto">
                            <SearchInterface
                                onTextSearch={handleTextSearch}
                                onVoiceSearch={handleVoiceSearch}
                                loading={loading}
                            />
                        </div>

                        {/* Loading State */}
                        {loading && (
                            <div className="max-w-4xl mx-auto py-8">
                                <div className="text-center mb-8 animate-fade-in">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold tracking-[0.2em] mb-4">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse glow-emerald" />
                                        AGENTIC DISCOVERY IN PROGRESS
                                    </div>
                                    <h2 className="text-3xl font-black text-white mb-2 tracking-tighter uppercase">TinyFish Agent Operation</h2>
                                    <p className="text-slate-500 text-sm">Real-time browser automation & cross-portal evidence extraction</p>
                                </div>

                                <TinyFishAgentTerminal topic={searchTopic} sources={searchSources} />

                                <div className="mt-12 text-center animate-pulse">
                                    <LoadingSpinner size="md" />
                                    <p className="text-slate-500 text-[10px] font-bold tracking-[0.3em] mt-6 uppercase">Compiling findings from 8 research nodes</p>
                                </div>
                            </div>
                        )}

                        {/* Error State */}
                        {error && !loading && (
                            <div className="max-w-4xl mx-auto mb-8">
                                <ErrorMessage message={error} onRetry={retrySearch} />
                            </div>
                        )}

                        {!loading && voiceTranscript && voicePreviewResults && !results && (
                            <div className="max-w-4xl mx-auto animate-fade-in">
                                <div className="bg-slate-900/60 border border-slate-700/60 rounded-2xl p-6 shadow-xl">
                                    <div className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-2">
                                        Voice Transcript
                                    </div>
                                    <div className="text-white text-lg leading-relaxed mb-4">
                                        “{voiceTranscript}”
                                    </div>
                                    <div className="flex items-center justify-end gap-3">
                                        <button
                                            onClick={() => {
                                                setVoiceTranscript(null);
                                                setVoicePreviewResults(null);
                                            }}
                                            className="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => {
                                                setResults(voicePreviewResults);
                                                setVoicePreviewResults(null);
                                            }}
                                            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors"
                                        >
                                            Continue to Results
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Results */}
                        {!loading && results && (
                            <div className="animate-fade-in">
                                <ResultsGrid
                                    results={results}
                                    selectedPapers={selectedPapers}
                                    onToggleSelect={togglePaperSelection}
                                    onExport={handleExport}
                                    onTrackCitation={(id) => setTrackingPaperId(id)}
                                />
                            </div>
                        )}

                        {!loading && !results && !error && (
                            <div className="text-center py-20 opacity-30">
                                <p className="text-slate-500 text-lg">Perform a search to begin your discovery</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="animate-fade-in max-w-4xl mx-auto">
                        <ConversationInterface
                            initialContext={{
                                papers: results?.papers.slice(0, 5),
                                query: results?.query
                            }}
                        />
                    </div>
                )}
            </div>

            {/* Footer */}
            <footer className="max-w-4xl mx-auto text-center mt-24 pb-12 border-t border-slate-800/30 pt-12">
                <div className="mt-4 flex justify-center gap-6 text-slate-600">
                    <Github className="w-5 h-5 hover:text-white transition-colors cursor-pointer" />
                    <Sparkles className="w-5 h-5 hover:text-emerald-400 transition-colors cursor-pointer" />
                </div>
            </footer>
        </div>
    );
}
