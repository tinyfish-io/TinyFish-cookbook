'use client';

import { useState } from 'react';
import { ResearchPaper } from '@/lib/types';
import { ExternalLink, FileText, Award, Calendar, Activity, Sparkles, Copy, Mail } from 'lucide-react';
import PaperSummary from './PaperSummary';

interface AuthorInfo {
    firstName: string;
    lastName: string;
    email: string;
}

interface PaperCardProps {
    paper: ResearchPaper;
    onSelect?: (selected: boolean) => void;
    selected?: boolean;
    onTrack?: () => void;
}

export default function PaperCard({ paper, onSelect, selected, onTrack }: PaperCardProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [authors, setAuthors] = useState<AuthorInfo[]>([]);
    const [isExtractingAuthors, setIsExtractingAuthors] = useState(false);
    const [authorError, setAuthorError] = useState<string | null>(null);
    const [authorsCopied, setAuthorsCopied] = useState(false);

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        } catch {
            return dateStr;
        }
    };

    const extractAuthors = async () => {
        setIsExtractingAuthors(true);
        setAuthorError(null);
        setAuthorsCopied(false);
        try {
            const controller = new AbortController();
            const timeout = window.setTimeout(() => controller.abort(), 5 * 60 * 1000);

            const res = await fetch('/api/emails/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paper }),
                signal: controller.signal,
            });
            window.clearTimeout(timeout);

            const data = (await res.json()) as { authors?: AuthorInfo[]; error?: string };
            if (!res.ok) throw new Error(data?.error || 'Failed to extract author information');
            const nextAuthors = Array.isArray(data?.authors) ? data.authors : [];
            setAuthors(nextAuthors);
            if (data?.error && nextAuthors.length === 0) {
                setAuthorError(data.error);
            } else if (nextAuthors.length === 0) {
                setAuthorError('No author information found.');
            }
        } catch (e) {
            setAuthorError(e instanceof Error ? e.message : 'Failed to extract author information');
            setAuthors([]);
        } finally {
            setIsExtractingAuthors(false);
        }
    };

    const copyAllAuthors = async () => {
        try {
            const text = authors.map(author => {
                const name = [author.firstName, author.lastName].filter(Boolean).join(' ').trim();
                return name ? `${name} <${author.email}>` : author.email;
            }).join('\n');
            await navigator.clipboard.writeText(text);
            setAuthorsCopied(true);
            window.setTimeout(() => setAuthorsCopied(false), 1200);
        } catch {
            // ignore
        }
    };

    return (
        <div
            className={`
        group relative overflow-hidden rounded-2xl p-6
        transition-all duration-500 ease-out
        ${selected
                    ? 'bg-gradient-to-br from-emerald-900/40 via-teal-900/30 to-emerald-900/40 border-2 border-emerald-500/60 shadow-2xl shadow-emerald-500/30 scale-[1.02]'
                    : 'glass border border-slate-700/30 hover:border-emerald-500/40'
                }
        ${isHovered ? 'transform -translate-y-2 shadow-2xl shadow-emerald-900/20' : ''}
      `}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Animated gradient overlay on hover */}
            <div className={`
        absolute inset-0 bg-gradient-to-br from-emerald-600/0 via-teal-600/0 to-emerald-600/0
        group-hover:from-emerald-600/5 group-hover:via-teal-600/10 group-hover:to-emerald-600/5
        transition-all duration-700 pointer-events-none
      `} />

            {/* Checkbox */}
            {onSelect && (
                <input
                    type="checkbox"
                    checked={selected}
                    onChange={(e) => onSelect(e.target.checked)}
                    className="absolute top-5 right-5 w-5 h-5 rounded border-slate-600 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-slate-900 z-10 cursor-pointer transition-transform hover:scale-110"
                />
            )}

            {/* Source badge with glow & TinyFish Provenance */}
            <div className="mb-4 flex items-center justify-between">
                <span className={`
                  inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
                  bg-gradient-to-r from-emerald-600/30 to-teal-600/30 
                  border border-emerald-500/40 text-emerald-200
                  ${isHovered ? 'glow-emerald' : ''}
                  transition-all duration-300
                `}>
                    <Sparkles className="w-3 h-3" />
                    {paper.source}
                </span>

                <div className="flex items-center gap-1.5 text-[9px] font-black text-emerald-500/60 uppercase tracking-widest border border-emerald-500/10 px-2 py-1 rounded bg-emerald-500/5">
                    <Activity className="w-2.5 h-2.5" />
                    TinyFish Verified
                </div>
            </div>

            {/* Title with gradient on hover */}
            <h3 className={`
        text-xl font-bold mb-3 line-clamp-2 relative z-10
        transition-all duration-300
        ${isHovered
                    ? 'text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-200 to-emerald-300'
                    : 'text-white'
                }
      `}>
                {paper.title}
            </h3>

            {/* Authors */}
            <p className="text-slate-400 text-sm mb-3 line-clamp-1 font-medium">
                {paper.authors.join(', ')}
            </p>

            {/* Abstract */}
            <p className="text-slate-300/90 text-sm mb-5 line-clamp-3 leading-relaxed">
                {paper.abstract}
            </p>

            {/* Metadata */}
            <div className="flex items-center gap-4 text-xs text-slate-400 mb-5 flex-wrap">
                {paper.publishedDate && (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-800/50">
                        <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                        {formatDate(paper.publishedDate)}
                    </div>
                )}
                {paper.citations !== undefined && (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-800/50">
                        <Award className="w-3.5 h-3.5 text-amber-400" />
                        <span className="font-semibold text-amber-300">{paper.citations}</span> citations
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 relative z-10">
                <div className="flex gap-3 flex-wrap">
                    {paper.url && paper.url !== '#' && (
                        <a
                            href={paper.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 border border-emerald-400/20"
                        >
                            <ExternalLink className="w-4 h-4" />
                            Full Paper
                            <div className="w-1 h-1 rounded-full bg-white animate-pulse ml-1" />
                        </a>
                    )}
                    {paper.pdfUrl && paper.pdfUrl !== paper.url && (
                        <a
                            href={paper.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-emerald-500/50 text-slate-200 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 shadow-md"
                        >
                            <FileText className="w-4 h-4 text-emerald-400" />
                            Open PDF
                        </a>
                    )}
                    {onTrack && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onTrack(); }}
                            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-900/20 hover:bg-emerald-800/40 border border-emerald-500/20 hover:border-emerald-400/50 rounded-xl text-emerald-400 hover:text-emerald-300 text-xs font-bold uppercase tracking-wider transition-all duration-300"
                        >
                            <Activity className="w-4 h-4" />
                            Track
                        </button>
                    )}
                </div>

                <div className="pt-2">
                    <PaperSummary paper={paper} title="AI Summary" />
                </div>

                {/* Author information (PDF extraction) */}
                {(paper.pdfUrl || paper.url) && (
                    <div className="pt-2">
                        <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 flex flex-col gap-3">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <h4 className="text-sm font-medium text-slate-200 line-clamp-1 flex items-center gap-2">
                                        <Mail className="w-4 h-4 text-emerald-400" />
                                        Author information
                                    </h4>
                                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                                        Extract author names and emails from the paper PDF
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    {authors.length > 0 && (
                                        <button
                                            onClick={copyAllAuthors}
                                            className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-full flex items-center gap-1"
                                            title="Copy all author information"
                                        >
                                            <Copy className="w-3 h-3" />
                                            {authorsCopied ? 'Copied' : 'Copy all'}
                                        </button>
                                    )}
                                    <button
                                        onClick={extractAuthors}
                                        disabled={isExtractingAuthors}
                                        className="text-xs bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white px-3 py-1.5 rounded-full flex items-center gap-1"
                                    >
                                        {isExtractingAuthors ? 'Extracting…' : 'Extract'}
                                    </button>
                                </div>
                            </div>

                            {authorError && <div className="text-xs text-red-300">{authorError}</div>}

                            {authors.length > 0 ? (
                                <div className="flex flex-col gap-2">
                                    {authors.map((author, idx) => {
                                        const name = [author.firstName, author.lastName].filter(Boolean).join(' ').trim();
                                        return (
                                            <div
                                                key={`${author.email}-${idx}`}
                                                className="px-3 py-2 rounded-lg bg-slate-900/40 border border-slate-700/60 hover:border-emerald-500/40 transition-colors"
                                            >
                                                {name && (
                                                    <div className="text-sm font-medium text-slate-200 mb-1">
                                                        {name}
                                                    </div>
                                                )}
                                                <a
                                                    href={`mailto:${author.email}`}
                                                    className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                                                    title="Open mail client"
                                                >
                                                    {author.email}
                                                </a>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                !isExtractingAuthors &&
                                !authorError && <div className="text-xs text-slate-500">No author information found.</div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
