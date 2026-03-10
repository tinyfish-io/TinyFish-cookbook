import clsx from 'clsx';
import { ScanResult } from '../types';
import { RiskBadge } from './RiskBadge';
import { ExternalLink, AlertTriangle, Calendar, CheckCircle, Activity, DollarSign, Globe } from 'lucide-react';

export function ScanResultCard({ result }: { result: ScanResult }) {
    const isSparseData = (result.manufacturer === 'Unknown' || !result.manufacturer) && (!result.sources || result.sources.length === 0);
    const confidenceClass = clsx(
        'px-2 py-1 rounded-full border text-[10px] uppercase tracking-wider',
        result.confidence?.level === 'HIGH' && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
        result.confidence?.level === 'MEDIUM' && 'border-amber-500/30 bg-amber-500/10 text-amber-200',
        result.confidence?.level === 'LOW' && 'border-slate-600/30 bg-slate-800/40 text-slate-300',
        !result.confidence && 'border-slate-600/30 bg-slate-800/40 text-slate-300'
    );
    const scannedLabel = result.scanned_at
        ? new Date(result.scanned_at).toLocaleString()
        : result.timestamp;

    const durationSec = result.scan_duration_ms != null ? (result.scan_duration_ms / 1000).toFixed(1) : null;

    return (
        <div className="glass-card rounded-xl p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full relative overflow-hidden group" role="article" aria-label={`Scan result for ${result.part_number}`}>
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl group-hover:bg-cyan-500/20 transition-all duration-1000" aria-hidden />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 relative z-10">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2" id="scan-result-heading">
                        {result.part_number}
                        {result.lifecycle_status === 'Active' ? (
                            <CheckCircle className="w-5 h-5 text-emerald-500" />
                        ) : (
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                        )}
                    </h2>
                    <p className="text-slate-400 font-medium">{result.manufacturer}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                        <span className={confidenceClass}>
                            Confidence {result.confidence ? `${result.confidence.score}%` : '—'}
                        </span>
                        <span className="px-2 py-1 rounded-full border border-slate-700/40 bg-slate-900/40 text-[10px] text-slate-300 uppercase tracking-wider">
                            Scanned {scannedLabel}
                        </span>
                        {durationSec != null && (
                            <span className="px-2 py-1 rounded-full border border-slate-700/40 bg-slate-900/40 text-[10px] text-slate-300 uppercase tracking-wider" aria-label={`Scan took ${durationSec} seconds`}>
                                Scan took {durationSec}s
                            </span>
                        )}
                        {result.scan_timed_out && (
                            <span className="px-2 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-200 uppercase tracking-wider">
                                Partial (timed out)
                            </span>
                        )}
                    </div>
                </div>
                <RiskBadge level={result.risk.level} score={result.risk.score} />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 relative z-10 w-full">
                <div className="bg-slate-900/40 p-4 rounded-lg border border-slate-700/30">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Lifecycle</p>
                    <p className="text-lg font-semibold text-white">{result.lifecycle_status}</p>
                </div>

                <div className="bg-slate-900/40 p-4 rounded-lg border border-slate-700/30">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Availability</p>
                    <p className={clsx("text-lg font-semibold",
                        result.availability === 'In Stock' ? 'text-emerald-400' :
                            result.availability === 'Backorder' ? 'text-rose-400' : 'text-amber-400'
                    )}>
                        {result.availability || 'Listed'}
                    </p>
                </div>

                <div className="bg-slate-900/40 p-4 rounded-lg border border-slate-700/30">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Lead Time</p>
                    <p className="text-lg font-semibold text-white">
                        {result.lead_time_days ? `${result.lead_time_days} days` : result.lead_time_weeks ? `${result.lead_time_weeks} wks` : '—'}
                    </p>
                </div>

                <div className="bg-slate-900/40 p-4 rounded-lg border border-slate-700/30">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Market Price</p>
                    <p className="text-lg font-semibold text-cyan-400 flex items-center gap-1">
                        {result.price_estimate ? (result.price_estimate.replace(/^USD\s+/i, '$').trim() || result.price_estimate) : 'Varies'}
                    </p>
                </div>
            </div>

            {isSparseData && (
                <div className="mb-6 relative z-10 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200 text-xs leading-relaxed">
                    No distributor sources were found for <span className="font-mono">{result.part_number}</span>. Try adding the manufacturer, or use a sample part (e.g. NE555, ATmega328P, STM32F103C8T6) from the form. Use Traceability Evidence links below for price and lead time.
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 relative z-10">
                <div className="bg-slate-900/40 p-6 rounded-lg border border-slate-700/30">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Activity className="w-3 h-3" /> Technical Analysis
                    </p>
                    <p className="text-sm text-slate-300 leading-relaxed font-mono">
                        {result.risk.reasoning}
                    </p>
                </div>

                <div className="bg-slate-900/40 p-6 rounded-lg border border-slate-700/30">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Globe className="w-3 h-3 text-accent" /> Data Sources
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                        {result.sources?.map((source, i) => (
                            <span key={i} className="px-2 py-1 bg-accent/10 border border-accent/20 text-accent text-[10px] rounded uppercase tracking-tighter">
                                {source}
                            </span>
                        ))}
                        {(!result.sources || result.sources.length === 0) && (
                            <span className="text-xs text-slate-500 italic">No distributor identifiers found.</span>
                        )}
                    </div>
                    {(result.sources_checked || result.sources_blocked) && (
                        <div className="mt-4 text-[10px] text-slate-500 uppercase tracking-wider">
                            Source Health
                            <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                                {result.sources_checked?.map((source) => (
                                    <span
                                        key={`ok-${source}`}
                                        className="px-2 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                                    >
                                        {source} ok
                                    </span>
                                ))}
                                {result.sources_blocked?.map((source) => (
                                    <span
                                        key={`blocked-${source}`}
                                        className="px-2 py-1 rounded-full border border-rose-500/30 bg-rose-500/10 text-rose-200"
                                    >
                                        {source} blocked
                                    </span>
                                ))}
                                {(!result.sources_checked || result.sources_checked.length === 0) &&
                                    (!result.sources_blocked || result.sources_blocked.length === 0) && (
                                        <span className="text-xs text-slate-500 italic normal-case">
                                            No direct distributor responses.
                                        </span>
                                    )}
                            </div>
                        </div>
                    )}
                    {result.source_signals && result.source_signals.length > 0 && (
                        <div className="mt-4 text-[10px] text-slate-500 uppercase tracking-wider">
                            Source Signals
                            <div className="mt-2 space-y-2 text-[10px] text-slate-300 normal-case">
                                {result.source_signals
                                    .filter((signal) => signal.ok)
                                    .map((signal) => (
                                        <div key={signal.name} className="flex flex-wrap gap-2">
                                            <span className="text-slate-200">{signal.name}</span>
                                            {signal.availability && <span>Availability: {signal.availability}</span>}
                                            {signal.lifecycle_status && <span>Lifecycle: {signal.lifecycle_status}</span>}
                                            {signal.lead_time_weeks && <span>Lead: {signal.lead_time_weeks}w</span>}
                                            {signal.price_estimate && <span>Price: {signal.price_estimate}</span>}
                                        </div>
                                    ))}
                                {result.source_signals.every((signal) => !signal.ok) && (
                                    <span className="text-xs text-slate-500 italic">
                                        No structured signals parsed from direct sources.
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="relative z-10 border-t border-white/5 pt-6">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Traceability Evidence</p>
                <div className="flex flex-wrap gap-2">
                    {result.evidence_links.map((link, i) => (
                        <a
                            key={i}
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-3 py-1.5 bg-slate-800/50 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 text-xs rounded-md border border-cyan-900/30 hover:border-cyan-500/50 transition-all font-mono"
                        >
                            Ref_{i + 1} <ExternalLink className="w-3 h-3" />
                        </a>
                    ))}
                </div>
            </div>
        </div>
    );
}
