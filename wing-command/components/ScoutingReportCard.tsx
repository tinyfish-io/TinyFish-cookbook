'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, MapPin, Phone, ExternalLink, DollarSign, UtensilsCrossed } from 'lucide-react';
import { WingSpot } from '@/lib/types';
import { MenuModal } from './MenuModal';
import { DealsView } from './DealsView';
import {
    getStatusColorClass,
    getStatusEmoji,
    formatRelativeTime,
    formatDeliveryTime,
    getOrderUrl,
    getPlatformLabel,
    getTelLink,
    cn,
} from '@/lib/utils';

// ===========================================
// Draft Grade Calculator
// ===========================================
function calculateDraftGrade(spot: WingSpot): { grade: string; color: string; bgColor: string } {
    let score = 50; // base

    // Price factor (lower = better)
    if (spot.price_per_wing !== null) {
        if (spot.price_per_wing <= 1.0) score += 25;
        else if (spot.price_per_wing <= 1.5) score += 15;
        else if (spot.price_per_wing <= 2.0) score += 5;
        else score -= 10;
    } else if (spot.estimated_price_per_wing != null) {
        // Estimated prices contribute at half weight
        if (spot.estimated_price_per_wing <= 1.0) score += 12;
        else if (spot.estimated_price_per_wing <= 1.5) score += 8;
        else if (spot.estimated_price_per_wing <= 2.0) score += 3;
        else score -= 5;
    }

    // Deal bonus
    if (spot.deal_text) score += 10;

    // Delivery speed
    if (spot.delivery_time_mins !== null) {
        if (spot.delivery_time_mins <= 20) score += 10;
        else if (spot.delivery_time_mins <= 35) score += 5;
        else score -= 5;
    }

    // Status
    if (spot.status === 'green') score += 15;
    else if (spot.status === 'yellow') score += 5;
    else score -= 15;

    // Clamp 0-100
    score = Math.max(0, Math.min(100, score));

    if (score >= 90) return { grade: 'A+', color: '#16A34A', bgColor: 'rgba(22,163,74,0.9)' };
    if (score >= 80) return { grade: 'A', color: '#22C55E', bgColor: 'rgba(34,197,94,0.9)' };
    if (score >= 70) return { grade: 'B+', color: '#65A30D', bgColor: 'rgba(101,163,13,0.9)' };
    if (score >= 60) return { grade: 'B', color: '#EAB308', bgColor: 'rgba(234,179,8,0.9)' };
    if (score >= 50) return { grade: 'B-', color: '#F97316', bgColor: 'rgba(249,115,22,0.9)' };
    if (score >= 40) return { grade: 'C+', color: '#F97316', bgColor: 'rgba(249,115,22,0.9)' };
    if (score >= 30) return { grade: 'C', color: '#EF4444', bgColor: 'rgba(239,68,68,0.9)' };
    return { grade: 'D', color: '#DC2626', bgColor: 'rgba(220,38,38,0.9)' };
}

// ===========================================
// Restaurant type label from name heuristic
// ===========================================
function getRestaurantType(spot: WingSpot): string {
    const name = spot.name.toLowerCase();
    const chains = ['buffalo wild wings', 'wingstop', 'hooters', 'popeyes', 'kfc', 'raising cane',
        'zaxby', 'chili\'s', 'applebee', 'bdubs', 'domino', 'pizza hut', 'papa john'];
    for (const chain of chains) {
        if (name.includes(chain)) return 'CHAIN PLAY';
    }
    if (spot.source === 'google') return 'LOCAL SCOUT';
    if (spot.deal_text) return 'DEAL ALERT';
    return 'LOCAL FAVORITE';
}

// ===========================================
// Hand-drawn shaky circle SVG path
// ===========================================
function ShakyCircleSVG({ width, height }: { width: number; height: number }) {
    const cx = width / 2;
    const cy = height / 2;
    const rx = width / 2 - 6;
    const ry = height / 2 - 6;

    // Generate a shaky ellipse path
    const points: string[] = [];
    const segments = 32;
    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const wobbleX = (Math.random() - 0.5) * 6;
        const wobbleY = (Math.random() - 0.5) * 6;
        const x = cx + Math.cos(angle) * rx + wobbleX;
        const y = cy + Math.sin(angle) * ry + wobbleY;
        if (i === 0) {
            points.push(`M ${x} ${y}`);
        } else {
            points.push(`L ${x} ${y}`);
        }
    }
    points.push('Z');

    return (
        <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className="absolute inset-0 pointer-events-none z-10"
            style={{ overflow: 'visible' }}
        >
            <path
                d={points.join(' ')}
                className="red-circle-annotation animate"
                strokeWidth={3}
            />
        </svg>
    );
}

// ===========================================
// The Scouting Report Card Component
// ===========================================
interface ScoutingReportCardProps {
    spot: WingSpot;
    index: number;
    isBestDeal: boolean;
    autoFetchDeals?: boolean;
    isCompareSelected?: boolean;
    onToggleCompare?: () => void;
}

export function ScoutingReportCard({ spot, index, isBestDeal, autoFetchDeals, isCompareSelected, onToggleCompare }: ScoutingReportCardProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showDeals, setShowDeals] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    // DealsView handles its own fetching + background polling internally.
    // We just control when it's enabled (auto-fetch for top 5, or user toggle).
    const dealsEnabled = autoFetchDeals || showDeals;

    const draftGrade = calculateDraftGrade(spot);
    const restaurantType = getRestaurantType(spot);
    const isSoldOut = spot.status === 'red' && !spot.is_in_stock;
    // Four-tier price display: per-wing → raw item price → estimate → market price
    const priceStr = spot.price_per_wing != null
        ? `$${spot.price_per_wing.toFixed(2)}/WING`
        : spot.cheapest_item_price != null
            ? `FROM $${spot.cheapest_item_price.toFixed(2)}`
            : spot.estimated_price_per_wing != null
                ? `~$${spot.estimated_price_per_wing.toFixed(2)}/WING`
                : 'MARKET PRICE';
    const isEstimatedPrice = spot.is_price_estimated === true
        && spot.price_per_wing == null && spot.cheapest_item_price == null;
    const isGoodPrice = spot.price_per_wing !== null && spot.price_per_wing <= 1.5;

    const deliveryStr = spot.delivery_time_mins !== null
        ? formatDeliveryTime(spot.delivery_time_mins)
        : 'N/A';

    // Polaroid caption
    const scoutDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();

    // Tab color based on type
    const tabColors: Record<string, string> = {
        'CHAIN PLAY': '#2563EB',
        'LOCAL SCOUT': '#16A34A',
        'DEAL ALERT': '#F97316',
        'LOCAL FAVORITE': '#7C3AED',
    };

    return (
    <>
        <motion.div
            ref={cardRef}
            className={cn(
                'report-card group relative',
                isBestDeal && 'perfect-play-glow',
                isCompareSelected && 'ring-2 ring-stadium-green ring-offset-2 ring-offset-transparent',
            )}
            initial={{ opacity: 0, y: 40, rotateZ: -1 + Math.random() * 2 }}
            animate={{ opacity: 1, y: 0, rotateZ: 0 }}
            transition={{
                delay: index * 0.08,
                duration: 0.55,
                ease: [0.34, 1.56, 0.64, 1],
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* ===== Compare Checkbox ===== */}
            {onToggleCompare && (
                <button
                    onClick={(e) => { e.stopPropagation(); onToggleCompare(); }}
                    className={cn(
                        'absolute top-2 left-2 z-20 w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
                        isCompareSelected
                            ? 'bg-stadium-green border-stadium-green text-white'
                            : 'border-gray-300 bg-white/80 opacity-0 group-hover:opacity-100 hover:border-stadium-green',
                    )}
                    title={isCompareSelected ? 'Remove from compare' : 'Add to compare'}
                >
                    {isCompareSelected && (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    )}
                </button>
            )}

            {/* ===== Folder Tab ===== */}
            <div
                className="report-tab"
                style={{ background: tabColors[restaurantType] || '#7C3AED' }}
            >
                <span className="text-[8px] text-white font-heading tracking-widest whitespace-nowrap">
                    {restaurantType}
                </span>
            </div>

            {/* ===== Draft Grade — top right corner ===== */}
            <motion.div
                className="draft-grade absolute -top-3 -right-3 z-10"
                style={{ background: draftGrade.bgColor }}
                initial={{ scale: 0, rotate: -15 }}
                animate={{ scale: 1, rotate: 6 }}
                transition={{ delay: index * 0.08 + 0.3, type: 'spring', stiffness: 400 }}
            >
                {draftGrade.grade}
            </motion.div>

            {/* ===== Card Inner Content ===== */}
            <div className="p-4 pt-5 space-y-3">
                {/* Row: Polaroid + Restaurant Info */}
                <div className="flex gap-3">
                    {/* Polaroid Image */}
                    <div className="shrink-0">
                        <div className="polaroid w-[90px] md:w-[100px]">
                            <div className="relative w-full aspect-square overflow-hidden bg-gray-100">
                                {spot.image_url && spot.image_url.startsWith('http') ? (
                                    <img
                                        src={spot.image_url}
                                        alt={spot.name}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-50 to-amber-100">
                                        <span className="text-3xl opacity-40">🍗</span>
                                    </div>
                                )}

                                {/* Status badge on Polaroid */}
                                <div className={cn(
                                    'absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[7px] font-bold tracking-wider',
                                    getStatusColorClass(spot.status),
                                    'border border-current/10'
                                )}>
                                    {getStatusEmoji(spot.status)}
                                </div>
                            </div>
                            {/* Polaroid caption */}
                            <p className="font-marker text-[8px] text-gray-400 text-center mt-1 leading-tight">
                                SCOUTED: {scoutDate}
                            </p>
                        </div>
                    </div>

                    {/* Name + Quick Stats */}
                    <div className="flex-1 min-w-0 pt-1">
                        <h3 className="font-heading text-sm md:text-base tracking-wider text-gray-800 leading-tight truncate">
                            {spot.name.toUpperCase()}
                        </h3>

                        {/* Deal highlight */}
                        {spot.deal_text && (
                            <motion.div
                                className="flex items-center gap-1 mt-1.5"
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.08 + 0.2 }}
                            >
                                <span className="text-[10px] font-marker text-green-800 leading-tight">
                                    🏷️ {spot.deal_text}
                                </span>
                            </motion.div>
                        )}
                    </div>
                </div>

                {/* ===== Satirical Stat Lines ===== */}
                <div className="space-y-2 pt-1 border-t border-dashed border-amber-300/40">
                    {/* Salary Cap Hit (Price) */}
                    <div className="flex items-center justify-between">
                        <span className="font-marker text-[11px] text-gray-500 flex items-center gap-1">
                            <DollarSign className="w-3 h-3" /> SALARY CAP HIT
                        </span>
                        <span className="relative">
                            <span className={cn(
                                'font-marker text-sm font-bold',
                                isEstimatedPrice
                                    ? 'text-amber-600 italic'
                                    : isGoodPrice ? 'text-green-800' : 'text-red-600'
                            )}>
                                {priceStr}
                            </span>
                            {isEstimatedPrice && (
                                <span className="block text-[8px] text-amber-500 font-marker -mt-0.5 text-right">
                                    (est.)
                                </span>
                            )}

                            {/* Red circle annotation on hover — highlights the price */}
                            <AnimatePresence>
                                {isHovered && isGoodPrice && (
                                    <motion.div
                                        className="absolute -inset-x-2 -inset-y-1 pointer-events-none"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                    >
                                        <ShakyCircleSVG width={100} height={28} />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </span>
                    </div>

                    {/* Delivery Time */}
                    <div className="flex items-center justify-between">
                        <span className="font-marker text-[11px] text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> DELIVERY TIME
                        </span>
                        <span className="font-marker text-[11px] text-gray-700">
                            {deliveryStr}
                        </span>
                    </div>

                    {/* Location */}
                    <div className="flex items-start justify-between gap-2">
                        <span className="font-marker text-[11px] text-gray-500 flex items-center gap-1 shrink-0">
                            <MapPin className="w-3 h-3" /> LOCATION
                        </span>
                        <span className="text-[9px] text-gray-500 text-right leading-tight">
                            {spot.address || `Near ${spot.zip_code}`}
                        </span>
                    </div>
                </div>

                {/* ===== Super Bowl Deals Section ===== */}
                {dealsEnabled && (
                    <div className="pt-1 border-t border-dashed border-amber-300/40">
                        <DealsView spotId={spot.id} spotName={spot.name} enabled={dealsEnabled} />
                    </div>
                )}

                {/* ===== Footer — Source + Actions ===== */}
                <div className="flex items-center justify-between pt-2 border-t border-dashed border-amber-300/40">
                    <div className="flex items-center gap-2">
                        <span className="text-[8px] text-gray-400 uppercase tracking-widest font-heading">
                            {spot.source.toUpperCase()}
                        </span>
                        <span className="text-[8px] text-gray-300">
                            {formatRelativeTime(spot.last_updated)}
                        </span>
                    </div>

                    <div className="flex items-center gap-0.5">
                        {/* SB Deals button */}
                        <button
                            onClick={() => setShowDeals(!showDeals)}
                            className={cn(
                                'p-1.5 rounded-lg transition-colors',
                                showDeals ? 'bg-amber-200/60' : 'hover:bg-amber-100/60',
                            )}
                            title={showDeals ? 'Hide Super Bowl Deals' : 'Check Super Bowl Deals'}
                        >
                            <span className="text-sm leading-none">🏈</span>
                        </button>
                        <button
                            onClick={() => setIsMenuOpen(true)}
                            className="p-1.5 rounded-lg hover:bg-amber-100/60 transition-colors"
                            title="View Menu"
                        >
                            <UtensilsCrossed className="w-3.5 h-3.5 text-gray-400 hover:text-stadium-green transition-colors" />
                        </button>
                        {spot.phone && (
                            <a
                                href={getTelLink(spot.phone)}
                                className="p-1.5 rounded-lg hover:bg-amber-100/60 transition-colors"
                                title="Call"
                            >
                                <Phone className="w-3.5 h-3.5 text-gray-400 hover:text-stadium-green transition-colors" />
                            </a>
                        )}
                        <a
                            href={getOrderUrl(spot)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg hover:bg-amber-100/60 transition-colors"
                            title={getPlatformLabel(getOrderUrl(spot))}
                        >
                            <ExternalLink className="w-3.5 h-3.5 text-gray-400 hover:text-stadium-green transition-colors" />
                        </a>
                    </div>
                </div>
            </div>

            {/* ===== "FUMBLE!" Overlay for Sold Out ===== */}
            <AnimatePresence>
                {isSoldOut && (
                    <motion.div
                        className="fumble-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <svg width="80" height="80" viewBox="0 0 80 80" className="opacity-60">
                            <line x1="10" y1="10" x2="70" y2="70" stroke="#DC2626" strokeWidth="6" strokeLinecap="round" />
                            <line x1="70" y1="10" x2="10" y2="70" stroke="#DC2626" strokeWidth="6" strokeLinecap="round" />
                        </svg>
                        <span className="font-marker text-red-500/80 text-xl mt-1 transform rotate-[-8deg]">
                            FUMBLE!
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ===== "PERFECT PLAY!" badge for Best Deal ===== */}
            <AnimatePresence>
                {isBestDeal && (
                    <motion.div
                        className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-20
                                   bg-stadium-green text-white px-3 py-1 rounded-lg shadow-lg"
                        initial={{ opacity: 0, y: 10, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: index * 0.08 + 0.5, type: 'spring' }}
                    >
                        <span className="font-marker text-[10px] tracking-wider whitespace-nowrap">
                            ⭐ PERFECT PLAY!
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>

        {/* ===== Menu Modal ===== */}
        <MenuModal spot={spot} isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </>
    );
}
