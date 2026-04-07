'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Clock, Tag, Phone } from 'lucide-react';
import { WingSpot } from '@/lib/types';
import { getPlatformLabel, getOrderUrl, getTelLink } from '@/lib/utils';

interface CompareModalProps {
    spots: WingSpot[];
    isOpen: boolean;
    onClose: () => void;
}

function formatPrice(price: number | null): string {
    if (price === null || price === undefined) return '—';
    return `$${price.toFixed(2)}`;
}

function formatDelivery(mins: number | null): string {
    if (mins === null || mins === undefined) return '—';
    if (mins <= 0) return 'Now';
    return `${mins} min`;
}

/** Find the index of the best (lowest) value, or -1 if all null */
function bestIndex(values: (number | null)[], lower = true): number {
    let bestIdx = -1;
    let bestVal: number | null = null;
    values.forEach((v, i) => {
        if (v === null) return;
        if (bestVal === null || (lower ? v < bestVal : v > bestVal)) {
            bestVal = v;
            bestIdx = i;
        }
    });
    return bestIdx;
}

export function CompareModal({ spots, isOpen, onClose }: CompareModalProps) {
    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen || spots.length < 2) return null;

    const prices = spots.map(s => s.price_per_wing);
    const deliveries = spots.map(s => s.delivery_time_mins);
    const bestPriceIdx = bestIndex(prices, true);
    const bestDeliveryIdx = bestIndex(deliveries, true);

    const statusLabels: Record<string, string> = {
        green: 'OPEN',
        yellow: 'LIMITED',
        red: 'CLOSED',
    };
    const statusColors: Record<string, string> = {
        green: 'text-wing-green',
        yellow: 'text-wing-yellow-dark',
        red: 'text-wing-red',
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className="fixed inset-0 bg-black/60 z-[70]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        className="fixed inset-x-3 top-[8%] bottom-[8%] md:inset-x-auto md:left-1/2 md:top-[5%] md:bottom-[5%] md:w-[640px] md:-translate-x-1/2 z-[71] flex flex-col"
                        initial={{ opacity: 0, y: 40, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 40, scale: 0.95 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    >
                        <div className="flex flex-col h-full bg-manila rounded-xl shadow-2xl border border-amber-300/40 overflow-hidden">
                            {/* Header */}
                            <div className="flex items-center justify-between px-4 py-3 border-b border-amber-300/40 bg-amber-50/50 shrink-0">
                                <div className="flex items-center gap-2">
                                    <Trophy className="w-5 h-5 text-whistle-orange" />
                                    <h2 className="font-heading text-lg text-varsity-navy">
                                        COMPARE SPOTS
                                    </h2>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-1.5 rounded-lg hover:bg-amber-200/50 transition-colors"
                                >
                                    <X className="w-5 h-5 text-amber-700" />
                                </button>
                            </div>

                            {/* Comparison Table */}
                            <div className="flex-1 overflow-y-auto p-4">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-amber-300/40">
                                                <th className="text-left py-2 px-2 font-heading text-xs text-amber-600 uppercase tracking-wider w-24">
                                                    Stat
                                                </th>
                                                {spots.map((spot, i) => (
                                                    <th
                                                        key={spot.id}
                                                        className="text-center py-2 px-2 font-heading text-xs text-varsity-navy uppercase tracking-wider"
                                                    >
                                                        <div className="truncate max-w-[120px] mx-auto" title={spot.name}>
                                                            {spot.name}
                                                        </div>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {/* Price per Wing */}
                                            <tr className="border-b border-amber-200/20">
                                                <td className="py-2.5 px-2 font-marker text-[11px] text-gray-500 flex items-center gap-1">
                                                    <Tag className="w-3 h-3" /> PRICE/WING
                                                </td>
                                                {spots.map((spot, i) => (
                                                    <td
                                                        key={spot.id}
                                                        className={`text-center py-2.5 px-2 font-mono font-semibold ${
                                                            i === bestPriceIdx
                                                                ? 'text-stadium-green bg-stadium-green/5'
                                                                : spot.price_per_wing == null && spot.estimated_price_per_wing != null
                                                                    ? 'text-amber-600 italic'
                                                                    : 'text-amber-800'
                                                        }`}
                                                    >
                                                        {spot.price_per_wing != null
                                                            ? formatPrice(spot.price_per_wing)
                                                            : spot.estimated_price_per_wing != null
                                                                ? `~${formatPrice(spot.estimated_price_per_wing)}`
                                                                : '—'}
                                                        {i === bestPriceIdx && spot.price_per_wing !== null && (
                                                            <span className="block text-[9px] text-stadium-green font-heading mt-0.5">BEST</span>
                                                        )}
                                                    </td>
                                                ))}
                                            </tr>

                                            {/* Status */}
                                            <tr className="border-b border-amber-200/20">
                                                <td className="py-2.5 px-2 font-marker text-[11px] text-gray-500">
                                                    STATUS
                                                </td>
                                                {spots.map(spot => (
                                                    <td
                                                        key={spot.id}
                                                        className="text-center py-2.5 px-2"
                                                    >
                                                        <span className={`font-heading text-xs tracking-wider ${statusColors[spot.status] || 'text-gray-500'}`}>
                                                            {statusLabels[spot.status] || spot.status.toUpperCase()}
                                                        </span>
                                                    </td>
                                                ))}
                                            </tr>

                                            {/* Delivery Time */}
                                            <tr className="border-b border-amber-200/20">
                                                <td className="py-2.5 px-2 font-marker text-[11px] text-gray-500 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" /> DELIVERY
                                                </td>
                                                {spots.map((spot, i) => (
                                                    <td
                                                        key={spot.id}
                                                        className={`text-center py-2.5 px-2 text-xs font-heading ${
                                                            i === bestDeliveryIdx
                                                                ? 'text-stadium-green bg-stadium-green/5'
                                                                : 'text-amber-800'
                                                        }`}
                                                    >
                                                        {formatDelivery(spot.delivery_time_mins)}
                                                        {i === bestDeliveryIdx && spot.delivery_time_mins !== null && (
                                                            <span className="block text-[9px] text-stadium-green font-heading mt-0.5">FASTEST</span>
                                                        )}
                                                    </td>
                                                ))}
                                            </tr>

                                            {/* Phone */}
                                            <tr className="border-b border-amber-200/20">
                                                <td className="py-2.5 px-2 font-marker text-[11px] text-gray-500 flex items-center gap-1">
                                                    <Phone className="w-3 h-3" /> PHONE
                                                </td>
                                                {spots.map(spot => (
                                                    <td
                                                        key={spot.id}
                                                        className="text-center py-2.5 px-2 text-xs"
                                                    >
                                                        {spot.phone ? (
                                                            <a
                                                                href={getTelLink(spot.phone)}
                                                                className="text-stadium-green hover:underline font-heading text-[10px] tracking-wider"
                                                            >
                                                                {spot.phone}
                                                            </a>
                                                        ) : (
                                                            <span className="text-gray-400 text-[10px]">—</span>
                                                        )}
                                                    </td>
                                                ))}
                                            </tr>

                                            {/* Platform / Source */}
                                            <tr>
                                                <td className="py-2.5 px-2 font-marker text-[11px] text-gray-500">
                                                    SOURCE
                                                </td>
                                                {spots.map(spot => (
                                                    <td
                                                        key={spot.id}
                                                        className="text-center py-2.5 px-2 text-[10px] text-gray-500 uppercase font-heading"
                                                    >
                                                        {spot.platform_ids?.source_url
                                                            ? getPlatformLabel(spot.platform_ids.source_url)
                                                            : spot.source.toUpperCase()}
                                                    </td>
                                                ))}
                                            </tr>

                                        </tbody>
                                    </table>
                                </div>

                                {/* Order buttons */}
                                <div className="mt-6 grid gap-2" style={{ gridTemplateColumns: `repeat(${spots.length}, 1fr)` }}>
                                    {spots.map(spot => (
                                        <a
                                            key={spot.id}
                                            href={getOrderUrl(spot)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-center py-2 px-3 rounded-lg bg-stadium-green/10 hover:bg-stadium-green/20 text-stadium-green text-xs font-heading tracking-wider transition-colors border border-stadium-green/20"
                                        >
                                            ORDER
                                        </a>
                                    ))}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="px-4 py-2 border-t border-amber-300/40 text-center">
                                <p className="text-[10px] text-amber-400">
                                    Comparing {spots.length} wing spots
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
