'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Globe, Instagram, Newspaper, Copy, Check, ExternalLink } from 'lucide-react';
import { DealsResponse, SuperBowlDeal } from '@/lib/types';
import { cn } from '@/lib/utils';

interface DealsViewProps {
    spotId: string;
    spotName: string;
    enabled?: boolean;
}

// ===========================================
// DealsView — Background scrape + polling pattern
// Mirrors MenuModal polling approach
// ===========================================

export function DealsView({ spotId, spotName, enabled = true }: DealsViewProps) {
    const [data, setData] = useState<DealsResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [scouting, setScouting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const hasFetched = useRef(false);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    function stopPolling() {
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
    }

    const startPolling = useCallback(() => {
        stopPolling();
        let pollCount = 0;
        const maxPolls = 60; // 60 polls × 5s = 5 minutes max polling

        pollRef.current = setInterval(async () => {
            pollCount++;
            if (pollCount > maxPolls) {
                stopPolling();
                setScouting(false);
                setError('Deals scouting timed out. Try again later.');
                return;
            }

            try {
                // poll=true ensures NO new Mino scrapes are triggered
                const res = await fetch(
                    `/api/deals?spot_id=${encodeURIComponent(spotId)}&poll=true`
                );
                const result: DealsResponse = await res.json();

                if (result.success && result.deals) {
                    // Deals found (or confirmed empty) — stop polling
                    stopPolling();
                    setScouting(false);
                    setData(result);
                } else if (!result.scouting) {
                    // Scouting finished but no deals cached — scrape completed with no results
                    stopPolling();
                    setScouting(false);
                    setData(result);
                }
                // If still scouting, keep polling
            } catch {
                // Network error during poll — keep trying
            }
        }, 5000);
    }, [spotId]);

    const doFetch = useCallback(async () => {
        if (!spotId) return;
        setLoading(true);
        setError(null);
        setScouting(false);
        stopPolling();

        // 15-second client-side timeout for the initial request
        // (API returns immediately with scouting:true, so this is plenty)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        try {
            const res = await fetch(
                `/api/deals?spot_id=${encodeURIComponent(spotId)}`,
                { signal: controller.signal }
            );
            clearTimeout(timeoutId);
            const result: DealsResponse = await res.json();

            if (result.success && result.deals) {
                // Cache hit — deals returned immediately
                setData(result);
            } else if (result.scouting) {
                // Background scrape started — poll every 5s for cached results
                setScouting(true);
                startPolling();
            } else {
                // No deals and not scouting
                setData(result);
            }
        } catch (err) {
            clearTimeout(timeoutId);
            if (err instanceof Error && err.name === 'AbortError') {
                // Client timed out — server may still be working, start polling
                setScouting(true);
                startPolling();
            } else {
                setError('Failed to load deals');
            }
        } finally {
            setLoading(false);
        }
    }, [spotId, startPolling]);

    // Fetch ONCE when enabled — ref prevents re-trigger loops
    useEffect(() => {
        if (enabled && !hasFetched.current) {
            hasFetched.current = true;
            doFetch();
        }
        if (!enabled) {
            hasFetched.current = false;
            stopPolling();
            setScouting(false);
        }
    }, [enabled, doFetch]);

    // Cleanup on unmount
    useEffect(() => {
        return () => stopPolling();
    }, []);

    if (loading) {
        return <DealsSkeleton />;
    }

    if (scouting) {
        return <DealsScoutingIndicator />;
    }

    if (error) {
        return (
            <div className="text-center py-2">
                <p className="font-marker text-[10px] text-red-400">{error}</p>
            </div>
        );
    }

    if (!data?.success || data.deals.length === 0) {
        return (
            <div className="text-center py-2">
                <p className="font-marker text-[10px] text-gray-400">
                    No SB specials found
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-1.5">
                <span className="text-sm">🏈</span>
                <span className="font-heading text-[10px] tracking-widest text-amber-700 uppercase">
                    Super Bowl Specials
                </span>
            </div>
            {data.deals.map((deal, index) => (
                <DealCard key={index} deal={deal} />
            ))}
        </div>
    );
}

/**
 * Compact inline deal badge for use in the ScoutingReportCard
 */
export function InlineDealBadge({ deal }: { deal: SuperBowlDeal }) {
    return (
        <div className="flex items-center gap-1 mt-1">
            <span className="text-[10px]">🏈</span>
            <span className="font-marker text-[10px] text-amber-700 leading-tight line-clamp-1">
                {deal.description}
            </span>
        </div>
    );
}

function DealCard({ deal }: { deal: SuperBowlDeal }) {
    const [copied, setCopied] = useState(false);

    const copyPromoCode = () => {
        if (deal.promo_code) {
            navigator.clipboard.writeText(deal.promo_code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className={cn(
            'rounded-lg border-2 border-amber-400/40 bg-amber-50/60 p-2.5 space-y-1.5',
        )}>
            {/* Deal description */}
            <p className="font-marker text-[11px] text-amber-900 leading-snug">
                {deal.description}
            </p>

            {/* Promo code */}
            {deal.promo_code && (
                <button
                    onClick={copyPromoCode}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-200/70 hover:bg-amber-300/70 transition-colors"
                >
                    <span className="font-mono text-[10px] font-bold text-amber-800">
                        {deal.promo_code}
                    </span>
                    {copied ? (
                        <Check className="w-2.5 h-2.5 text-green-600" />
                    ) : (
                        <Copy className="w-2.5 h-2.5 text-amber-600" />
                    )}
                </button>
            )}

            {/* Pre-order deadline */}
            {deal.pre_order_deadline && (
                <p className="text-[9px] text-red-600 font-bold">
                    {deal.pre_order_deadline}
                </p>
            )}

            {/* Pre-order link */}
            {deal.pre_order_url && (
                <a
                    href={deal.pre_order_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[9px] text-amber-700 hover:text-amber-900 underline"
                >
                    Pre-order <ExternalLink className="w-2.5 h-2.5" />
                </a>
            )}

            {/* Special menu items */}
            {deal.special_menu_items && deal.special_menu_items.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {deal.special_menu_items.map((item, i) => (
                        <span key={i} className="text-[8px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                            {item}
                        </span>
                    ))}
                </div>
            )}

            {/* Source attribution */}
            <div className="flex items-center gap-1 pt-0.5">
                {deal.source === 'aggregator' ? (
                    <Newspaper className="w-2.5 h-2.5 text-gray-400" />
                ) : deal.source === 'website' ? (
                    <Globe className="w-2.5 h-2.5 text-gray-400" />
                ) : (
                    <Instagram className="w-2.5 h-2.5 text-gray-400" />
                )}
                <span className="text-[8px] text-gray-400">
                    {deal.source === 'aggregator' ? 'Found on deals roundup' : `Found on ${deal.source}`}
                </span>
            </div>
        </div>
    );
}

function DealsSkeleton() {
    return (
        <div className="space-y-2 animate-pulse">
            <div className="h-4 bg-amber-100/50 rounded w-32" />
            <div className="h-16 bg-amber-100/30 rounded border border-amber-200/30" />
        </div>
    );
}

function DealsScoutingIndicator() {
    return (
        <div className="text-center py-3">
            <div className="flex justify-center gap-1 mb-1.5">
                {[0, 1, 2].map(i => (
                    <div
                        key={i}
                        className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"
                        style={{ animationDelay: `${i * 0.3}s` }}
                    />
                ))}
            </div>
            <p className="font-marker text-[10px] text-amber-600">
                Scouting SB deals...
            </p>
        </div>
    );
}
