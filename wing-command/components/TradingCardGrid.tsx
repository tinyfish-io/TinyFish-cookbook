'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { WingSpot } from '@/lib/types';
import { ScoutingReportCard } from '@/components/ScoutingReportCard';

interface TradingCardGridProps {
    spots: WingSpot[];
    isLoading: boolean;
    compareIds?: Set<string>;
    onToggleCompare?: (id: string) => void;
}

// ===========================================
// Skeleton Report Card (Manila Folder style)
// ===========================================
function SkeletonReportCard() {
    return (
        <div className="report-card" style={{ boxShadow: '8px 8px 0px 0px #93a3b8' }}>
            {/* Tab skeleton */}
            <div className="report-tab" style={{ background: '#D1D5DB' }}>
                <span className="text-[8px] text-white/50 font-heading tracking-wider">...</span>
            </div>
            {/* Grade skeleton */}
            <div className="draft-grade absolute -top-3 -right-3 z-10" style={{ background: '#D1D5DB' }}>
                <span className="text-white/40">?</span>
            </div>
            <div className="p-4 pt-5 space-y-3">
                {/* Polaroid + info skeleton */}
                <div className="flex gap-3">
                    <div className="shrink-0">
                        <div className="polaroid w-[90px]" style={{ transform: 'none' }}>
                            <div className="w-full aspect-square skeleton rounded" />
                            <div className="h-2 w-12 mx-auto mt-1 skeleton rounded" />
                        </div>
                    </div>
                    <div className="flex-1 space-y-2 pt-1">
                        <div className="h-4 w-3/4 skeleton rounded" />
                        <div className="h-3 w-1/2 skeleton rounded" />
                        <div className="h-3 w-2/3 skeleton rounded" />
                    </div>
                </div>
                {/* Stats skeleton */}
                <div className="border-t border-dashed border-amber-200/30 pt-2 space-y-2">
                    <div className="h-3 w-full skeleton rounded" />
                    <div className="h-3 w-4/5 skeleton rounded" />
                    <div className="h-3 w-3/5 skeleton rounded" />
                </div>
                <div className="border-t border-dashed border-amber-200/30 pt-2">
                    <div className="h-3 w-1/3 skeleton rounded" />
                </div>
            </div>
        </div>
    );
}

// ===========================================
// Draft grade score calculator (reused for auto-fetch ranking)
// ===========================================
function calcGradeScore(spot: WingSpot): number {
    let score = 50;
    if (spot.price_per_wing !== null) {
        if (spot.price_per_wing <= 1.0) score += 25;
        else if (spot.price_per_wing <= 1.5) score += 15;
        else if (spot.price_per_wing <= 2.0) score += 5;
        else score -= 10;
    } else if (spot.estimated_price_per_wing != null) {
        if (spot.estimated_price_per_wing <= 1.0) score += 12;
        else if (spot.estimated_price_per_wing <= 1.5) score += 8;
        else if (spot.estimated_price_per_wing <= 2.0) score += 3;
        else score -= 5;
    }
    if (spot.deal_text) score += 10;
    if (spot.delivery_time_mins !== null) {
        if (spot.delivery_time_mins <= 20) score += 10;
        else if (spot.delivery_time_mins <= 35) score += 5;
        else score -= 5;
    }
    if (spot.status === 'green') score += 15;
    else if (spot.status === 'yellow') score += 5;
    else score -= 15;
    return Math.max(0, Math.min(100, score));
}

// ===========================================
// Find the "best deal" index — highest Draft Grade eligible spot
// ===========================================
function findBestDealIndex(spots: WingSpot[]): number {
    if (spots.length === 0) return -1;

    let bestIdx = -1;
    let bestScore = -Infinity;

    spots.forEach((spot, idx) => {
        // Only open spots qualify
        if (spot.status === 'red') return;

        let score = 50;
        if (spot.price_per_wing !== null) {
            if (spot.price_per_wing <= 1.0) score += 25;
            else if (spot.price_per_wing <= 1.5) score += 15;
            else if (spot.price_per_wing <= 2.0) score += 5;
            else score -= 10;
        } else if (spot.estimated_price_per_wing != null) {
            if (spot.estimated_price_per_wing <= 1.0) score += 12;
            else if (spot.estimated_price_per_wing <= 1.5) score += 8;
            else if (spot.estimated_price_per_wing <= 2.0) score += 3;
            else score -= 5;
        }
        if (spot.deal_text) score += 10;
        if (spot.delivery_time_mins !== null) {
            if (spot.delivery_time_mins <= 20) score += 10;
            else if (spot.delivery_time_mins <= 35) score += 5;
        }
        if (spot.status === 'green') score += 15;
        else if (spot.status === 'yellow') score += 5;
        if (score > bestScore) {
            bestScore = score;
            bestIdx = idx;
        }
    });

    // Only mark as best deal if score is above threshold
    return bestScore >= 75 ? bestIdx : -1;
}

// ===========================================
// Main Grid Component
// ===========================================
export function TradingCardGrid({ spots, isLoading, compareIds, onToggleCompare }: TradingCardGridProps) {
    if (isLoading) {
        return (
            <div>
                <div className="text-center mb-6">
                    <h2 className="font-heading text-xl md:text-2xl tracking-[0.12em] text-chalk-dark uppercase">
                        Scouting Report
                    </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                    {[...Array(6)].map((_, i) => (
                        <SkeletonReportCard key={i} />
                    ))}
                </div>
            </div>
        );
    }

    if (spots.length === 0) {
        return null;
    }

    // Sort by status (green > yellow > red)
    const statusOrder: Record<string, number> = { green: 0, yellow: 1, red: 2 };
    const sorted = [...spots].sort((a, b) => {
        return (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3);
    });

    // Find the best deal
    const bestDealIdx = findBestDealIndex(sorted);

    // Identify top 5 spots by draft grade score for auto-fetching Super Bowl deals
    const autoFetchDealIds = new Set(
        [...sorted]
            .map((spot, idx) => ({ spot, idx }))
            .filter(({ spot }) => spot.status !== 'red')
            .sort((a, b) => {
                const scoreA = calcGradeScore(a.spot);
                const scoreB = calcGradeScore(b.spot);
                return scoreB - scoreA;
            })
            .slice(0, 5)
            .map(({ spot }) => spot.id)
    );

    return (
        <div>
            {/* Section Header */}
            <motion.div
                className="flex flex-col md:flex-row items-center justify-between mb-8 gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
            >
                <div className="text-center md:text-left">
                    <h2 className="font-heading text-xl md:text-2xl tracking-[0.12em] text-white uppercase" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                        Scouting Report
                    </h2>
                    <p className="text-white/70 text-xs tracking-wider font-marker mt-1" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
                        Your wing lineup — drafted, graded, and filed.
                    </p>
                </div>
                <span className="text-white/70 text-sm font-heading tracking-wider" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
                    {spots.length} SPOT{spots.length !== 1 ? 'S' : ''} SCOUTED
                </span>
            </motion.div>

            {/* Scouting Report Card Grid — 3 cols max, tumble entrance */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {sorted.map((spot, index) => {
                    // Random initial rotation for tumble effect
                    const initialRotate = (index % 2 === 0 ? -1 : 1) * (3 + (index % 5) * 1.5);
                    return (
                        <motion.div
                            key={spot.id}
                            initial={{ opacity: 0, y: -80, rotate: initialRotate }}
                            animate={{ opacity: 1, y: 0, rotate: 0 }}
                            transition={{
                                type: 'spring',
                                stiffness: 300,
                                damping: 20,
                                delay: index * 0.08,
                            }}
                        >
                            <ScoutingReportCard
                                spot={spot}
                                index={index}
                                isBestDeal={index === bestDealIdx}
                                autoFetchDeals={autoFetchDealIds.has(spot.id)}
                                isCompareSelected={compareIds?.has(spot.id)}
                                onToggleCompare={onToggleCompare ? () => onToggleCompare(spot.id) : undefined}
                            />
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
