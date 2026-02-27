'use client';

import { useState, useEffect, useRef } from 'react';
import { useVoiceCommands, VoiceCommand } from '@/hooks/useVoiceCommands';
import { ResearchPaper } from '@/lib/types';
import { Mic, MicOff, SkipForward, BookOpen, ArrowLeft, X, Zap, Copy, Sparkles } from 'lucide-react';

interface CoPilotModeProps {
    papers: ResearchPaper[];
    onExit: () => void;
}

export default function CoPilotMode({ papers, onExit }: CoPilotModeProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isReading, setIsReading] = useState(false);
    const [summaryText, setSummaryText] = useState<string>('');
    const [summaryCopied, setSummaryCopied] = useState(false);
    const abortRef = useRef<AbortController | null>(null);

    const currentPaper = papers[currentIndex];

    const handleExit = () => {
        abortRef.current?.abort();
        onExit();
    };

    const handleNext = () => {
        abortRef.current?.abort();
        if (currentIndex < papers.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setIsReading(false);
            setSummaryText('');
        }
    };

    const handlePrevious = () => {
        abortRef.current?.abort();
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            setIsReading(false);
            setSummaryText('');
        }
    };

    const handleSummarize = async () => {
        if (!currentPaper || isReading) return;
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        setIsReading(true);
        setSummaryCopied(false);
        try {
            const res = await fetch('/api/summarize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paper: currentPaper, length: 'medium' }),
                signal: controller.signal,
            });
            if (!res.ok) throw new Error('Failed');

            const data = (await res.json()) as { summary?: string };
            if (!controller.signal.aborted) {
                setSummaryText((data.summary || '').trim());
                setIsReading(false);
            }
        } catch (e) {
            if ((e as Error)?.name === 'AbortError') return;
            console.error(e);
            setIsReading(false);
        } finally {
            if (abortRef.current === controller) {
                abortRef.current = null;
            }
        }
    };

    const copySummary = async () => {
        try {
            await navigator.clipboard.writeText(summaryText);
            setSummaryCopied(true);
            window.setTimeout(() => setSummaryCopied(false), 1200);
        } catch {
            // ignore
        }
    };

    const commands: VoiceCommand[] = [
        {
            phrases: ['next paper', 'next', 'skip'],
            action: handleNext,
            description: 'Go to next paper'
        },
        {
            phrases: ['previous paper', 'previous', 'go back'],
            action: handlePrevious,
            description: 'Go to previous paper'
        },
        {
            phrases: ['summarize', 'read summary', 'listen'],
            action: handleSummarize,
            description: 'Generate summary'
        },
        {
            phrases: ['exit co-pilot', 'exit mode', 'stop co-pilot'],
            action: handleExit,
            description: 'Exit Co-Pilot'
        }
    ];

    const { isListening, startListening, stopListening, transcript, lastCommand, isSupported } = useVoiceCommands(commands);

    // Auto-start listening on mount
    useEffect(() => {
        startListening();
        return () => {
            abortRef.current?.abort();
            stopListening();
        };
    }, [startListening, stopListening]);

    if (!currentPaper) return <div className="text-white">No papers to display.</div>;

    return (
        <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col p-8 md:p-16 overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
                <div className="flex items-center gap-4">
                    <div className={`
            w-12 h-12 rounded-full flex items-center justify-center
            ${isListening ? 'bg-red-500 animate-pulse' : 'bg-slate-800'}
          `}>
                        {isListening ? <Mic className="w-6 h-6 text-white" /> : <MicOff className="w-6 h-6 text-slate-400" />}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <BookOpen className="w-6 h-6 text-purple-400" />
                            Research Co-Pilot
                        </h2>
                        <p className="text-slate-400 text-sm">
                            Hands-free mode • Say "Next", "Previous", "Summarize", or "Exit"
                        </p>
                    </div>
                </div>
                <button onClick={handleExit} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
                    <X className="w-8 h-8" />
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex max-w-6xl w-full mx-auto gap-12">
                {/* Paper View */}
                <div className="flex-1 space-y-8 animate-fade-in" key={currentIndex}>
                    <div className="bg-slate-900/50 border border-slate-700 p-8 rounded-3xl backdrop-blur-sm shadow-2xl">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-medium border border-purple-500/30">
                                Paper {currentIndex + 1} of {papers.length}
                            </span>
                            <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-medium border border-indigo-500/30">
                                {currentPaper.source}
                            </span>
                        </div>

                        <h1 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">
                            {currentPaper.title}
                        </h1>
                        <p className="text-xl text-slate-300 leading-relaxed mb-8">
                            {currentPaper.abstract}
                        </p>

                        <div className="flex flex-wrap gap-4 text-slate-400">
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-200">Authors:</span>
                                {currentPaper.authors.join(', ')}
                            </div>
                            {currentPaper.publishedDate && (
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-slate-200">Published:</span>
                                    {currentPaper.publishedDate}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Written summary in Co-Pilot */}
                    {(isReading || summaryText) && (
                        <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-700 animate-slide-up">
                            <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="min-w-0">
                                    <h3 className="text-white font-semibold flex items-center gap-2 line-clamp-1">
                                        <Sparkles className="w-5 h-5 text-emerald-400" />
                                        Summary
                                    </h3>
                                    <p className="text-slate-500 text-xs line-clamp-1">{currentPaper.title}</p>
                                </div>
                                {summaryText && (
                                    <button
                                        onClick={copySummary}
                                        className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-full flex items-center gap-1"
                                    >
                                        <Copy className="w-3 h-3" />
                                        {summaryCopied ? 'Copied' : 'Copy'}
                                    </button>
                                )}
                            </div>

                            {isReading && !summaryText ? (
                                <div className="text-slate-400 text-sm">Generating summary…</div>
                            ) : (
                                <div className="text-slate-200 whitespace-pre-wrap leading-relaxed text-sm bg-slate-950/40 border border-slate-700/60 rounded-xl p-4">
                                    {summaryText || 'No summary generated.'}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Sidebar / Controls */}
                <div className="w-80 hidden lg:flex flex-col gap-6">
                    <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-700">
                        <h3 className="text-slate-400 font-medium mb-4 uppercase tracking-wider text-sm">Voice Command Log</h3>
                        <div className="space-y-3 min-h-[100px]">
                            {transcript && (
                                <div className="text-white text-lg font-medium animate-pulse">
                                    "{transcript}..."
                                </div>
                            )}
                            {lastCommand && (
                                <div className="flex items-center gap-2 text-emerald-400">
                                    <Zap className="w-4 h-4" />
                                    Executed: {lastCommand}
                                </div>
                            )}
                            {!transcript && !lastCommand && (
                                <div className="text-slate-500 italic">Listening for commands...</div>
                            )}
                        </div>
                    </div>

                    <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-700">
                        <h3 className="text-slate-400 font-medium mb-4 uppercase tracking-wider text-sm">Available Commands</h3>
                        <div className="space-y-4">
                            {commands.map((cmd, i) => (
                                <div key={i} className="flex flex-col gap-1">
                                    <span className="text-white font-medium">{cmd.description}</span>
                                    <span className="text-slate-500 text-sm">"{cmd.phrases[0]}"</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Navigation Hints (Visual) */}
            <div className="mt-8 flex justify-between items-center text-slate-500">
                <div className="flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Previous
                </div>
                <div className="flex items-center gap-2">
                    Next <SkipForward className="w-4 h-4" />
                </div>
            </div>
        </div>
    );
}
