'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Clock, MapPin, Star, ExternalLink, Phone, Tag } from 'lucide-react';
import { WingSpot } from '@/lib/types';
import {
    formatPrice,
    formatDeliveryTime,
    getStatusColorClass,
    getStatusBorderClass,
    getStatusEmoji,
    formatRelativeTime,
    getGoogleMapsUrl,
    getOrderSearchUrl,
    getTelLink,
    cn,
} from '@/lib/utils';

interface WingGridProps {
    spots: WingSpot[];
    isLoading: boolean;
}

function ScoutCard({ spot, index }: { spot: WingSpot; index: number }) {

    return (
        <motion.div
            className={`glass-card rounded-2xl overflow-hidden border ${getStatusBorderClass(spot.status)} border-opacity-30`}
            initial={{ opacity: 0, x: -30, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{
                delay: index * 0.08,
                duration: 0.4,
                ease: [0.34, 1.56, 0.64, 1], // spring-like overshoot
            }}
        >
            {/* Card header with image or gradient */}
            <div className="relative h-32 md:h-36 overflow-hidden">
                {spot.image_url ? (
                    <img
                        src={spot.image_url}
                        alt={spot.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-turf-mid to-turf-black flex items-center justify-center">
                        <span className="text-4xl opacity-30">🍗</span>
                    </div>
                )}

                {/* Status badge */}
                <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold
                                 ${getStatusColorClass(spot.status)} border border-current/20`}>
                    {getStatusEmoji(spot.status)} {spot.status === 'green' ? 'SCOUTED' : spot.status === 'yellow' ? 'AVAILABLE' : 'CLOSED'}
                </div>

                {/* Dark gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-turf-black/80 via-transparent to-transparent" />

                {/* Price overlay */}
                {spot.price_per_wing !== null && (
                    <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-turf-black/80 backdrop-blur-sm
                                    border border-neon-green/20">
                        <span className="neon-text-subtle font-heading text-lg tracking-wider">
                            {formatPrice(spot.price_per_wing)}
                        </span>
                        <span className="text-gray-400 text-[10px] block -mt-0.5">/wing</span>
                    </div>
                )}
            </div>

            {/* Card body */}
            <div className="p-4 space-y-3">
                {/* Name */}
                <h3 className="font-heading text-lg md:text-xl tracking-wide text-white leading-tight truncate">
                    {spot.name}
                </h3>

                {/* Deal highlight */}
                {spot.deal_text && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neon-green/5 border border-neon-green/15">
                        <Tag className="w-3.5 h-3.5 text-neon-green shrink-0" />
                        <span className="text-neon-green text-xs font-medium truncate">{spot.deal_text}</span>
                    </div>
                )}

                {/* Meta row */}
                <div className="flex items-center gap-4 text-xs text-gray-400">
                    {spot.delivery_time_mins && (
                        <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{formatDeliveryTime(spot.delivery_time_mins)}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-1 truncate">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{spot.address || 'Address N/A'}</span>
                    </div>
                </div>

                {/* Source badge */}
                <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-600 uppercase tracking-wider">
                        via {spot.source} &middot; {formatRelativeTime(spot.last_updated)}
                    </span>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                        {spot.phone && (
                            <a
                                href={getTelLink(spot.phone)}
                                className="p-1.5 rounded-lg hover:bg-turf-surface transition-colors"
                                title="Call"
                            >
                                <Phone className="w-3.5 h-3.5 text-gray-500 hover:text-neon-green transition-colors" />
                            </a>
                        )}
                        <a
                            href={getGoogleMapsUrl(spot.address)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg hover:bg-turf-surface transition-colors"
                            title="Directions"
                        >
                            <MapPin className="w-3.5 h-3.5 text-gray-500 hover:text-neon-green transition-colors" />
                        </a>
                        <a
                            href={getOrderSearchUrl(spot.name, spot.address)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg hover:bg-turf-surface transition-colors"
                            title="Order"
                        >
                            <ExternalLink className="w-3.5 h-3.5 text-gray-500 hover:text-neon-green transition-colors" />
                        </a>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

function SkeletonCard() {
    return (
        <div className="rounded-2xl overflow-hidden border border-turf-border">
            <div className="h-32 md:h-36 skeleton" />
            <div className="p-4 space-y-3">
                <div className="h-5 w-3/4 skeleton rounded" />
                <div className="h-4 w-1/2 skeleton rounded" />
                <div className="h-3 w-full skeleton rounded" />
            </div>
        </div>
    );
}

export function WingGrid({ spots, isLoading }: WingGridProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
                {[...Array(8)].map((_, i) => (
                    <SkeletonCard key={i} />
                ))}
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

    return (
        <div>
            {/* Results count */}
            <motion.div
                className="flex items-center justify-between mb-5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
            >
                <h2 className="font-heading text-2xl md:text-3xl tracking-wider neon-text-subtle">
                    SCOUTED RESULTS
                </h2>
                <span className="text-gray-500 text-sm">
                    {spots.length} spot{spots.length !== 1 ? 's' : ''} found
                </span>
            </motion.div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
                {sorted.map((spot, index) => (
                    <ScoutCard
                        key={spot.id}
                        spot={spot}
                        index={index}
                    />
                ))}
            </div>
        </div>
    );
}
