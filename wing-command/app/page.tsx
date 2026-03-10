'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Users } from 'lucide-react';
import { GlassBlitzEntrance } from '@/components/GlassBlitzEntrance';
import { CommandJumbotron } from '@/components/CommandJumbotron';
import { CoachHero } from '@/components/CoachHero';
import { TrashTalkTicker } from '@/components/TrashTalkTicker';
import { TradingCardGrid } from '@/components/TradingCardGrid';
import { CompareBar } from '@/components/CompareBar';
import { CompareModal } from '@/components/CompareModal';
import { FlavorPersona, ScoutResponse, AvailabilityStats } from '@/lib/types';
import { calculateAvailability } from '@/lib/utils';

const LAST_ZIP_KEY = 'wing-command-last-zip';
const LAST_FLAVOR_KEY = 'wing-command-last-flavor';
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 min — discovery app, not inventory tracking

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: CACHE_DURATION_MS,
            gcTime: 60 * 60 * 1000, // 1 hour — keep query data in memory longer
            retry: 1,
            refetchOnWindowFocus: false,
            refetchOnMount: false,
        },
    },
});

// ===========================================
// Stats Bar — bright theme
// ===========================================
function StatsBar({ stats, locationName }: { stats: AvailabilityStats; locationName: string }) {
    if (stats.total === 0) return null;

    return (
        <div className="rounded-2xl px-5 py-3" style={{
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(22,163,74,0.15)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}>
            <motion.div
                className="flex flex-wrap items-center justify-center gap-4 md:gap-8 text-xs md:text-sm"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
            >
                {locationName && (
                    <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-whistle-orange" />
                        <span className="text-whistle-orange font-heading tracking-wider">{locationName.toUpperCase()}</span>
                    </div>
                )}

                <div className="h-4 w-px bg-gray-200 hidden md:block" />

                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-wing-green" />
                    <span className="text-wing-green-dark font-heading tracking-wider">{stats.green}</span>
                    <span className="text-gray-500">OPEN</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-wing-yellow" />
                    <span className="text-wing-yellow-dark font-heading tracking-wider">{stats.yellow}</span>
                    <span className="text-gray-500">LIMITED</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-wing-red" />
                    <span className="text-wing-red-dark font-heading tracking-wider">{stats.red}</span>
                    <span className="text-gray-500">CLOSED</span>
                </div>

                <div className="h-4 w-px bg-gray-200 hidden md:block" />

                <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-gray-700 font-heading tracking-wider">{stats.total} TOTAL</span>
                </div>
            </motion.div>
        </div>
    );
}

// ===========================================
// Coach Wing speech bubbles — sunny comedy twist
// ===========================================
function getCoachSpeech(flavor: FlavorPersona | null, isSearching: boolean, hasResults: boolean): string | undefined {
    if (flavor === 'face-melter') {
        if (isSearching) return "Scouting the hottest spots... this sunshine ain't helping! \uD83D\uDD25";
        if (hasResults) return "Now THAT'S a roster! Pick your starter.";
        return "You chose violence. On a sunny day. Bold.";
    }
    if (flavor === 'classicist') {
        if (isSearching) return "Finding the OGs... perfect game day weather for it.";
        if (hasResults) return "Now THAT'S a roster! Pick your starter.";
        return "Smart play. The classics never miss.";
    }
    if (flavor === 'sticky-finger') {
        if (isSearching) return "Tracking down the sauciest spots... \uD83E\uDD24";
        if (hasResults) return "Now THAT'S a roster! Pick your starter.";
        return "Napkins? Where we're going, we don't need napkins.";
    }
    if (!flavor) return "Pick a play, rookie. What's your flavour?";
    return undefined;
}

// ===========================================
// Main Wing Command Content
// ===========================================
function WingCommandContent() {
    const [zipCode, setZipCode] = useState('');
    const [flavor, setFlavor] = useState<FlavorPersona | null>(null);
    const [isHydrated, setIsHydrated] = useState(false);
    const [bannerDone, setBannerDone] = useState(false);
    const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
    const [isCompareOpen, setIsCompareOpen] = useState(false);

    const toggleCompare = useCallback((id: string) => {
        setCompareIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else if (next.size < 4) {
                next.add(id);
            }
            return next;
        });
    }, []);

    const clearCompare = useCallback(() => {
        setCompareIds(new Set());
    }, []);
    useEffect(() => {
        const savedZip = sessionStorage.getItem(LAST_ZIP_KEY);
        const savedFlavor = sessionStorage.getItem(LAST_FLAVOR_KEY) as FlavorPersona | null;
        if (savedZip && savedZip.length === 5) setZipCode(savedZip);
        if (savedFlavor) setFlavor(savedFlavor);
        setIsHydrated(true);
    }, []);

    const { data, isLoading, isFetching, refetch } = useQuery<ScoutResponse>({
        queryKey: ['scout', zipCode, flavor],
        queryFn: async ({ signal }) => {
            if (!zipCode || !flavor) return { success: true, spots: [], cached: false, message: '' };

            // Only abort if the user changed zip/flavor (new queryKey = new signal)
            // Don't use our own abort — let React Query's signal handle cancellation
            const params = new URLSearchParams({ zip: zipCode, flavor });
            const res = await fetch(`/api/scout?${params.toString()}`, {
                signal,
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${res.status}`);
            }

            return res.json();
        },
        enabled: zipCode.length === 5 && flavor !== null,
        retry: (failureCount, error) => {
            // Don't retry geocoding failures — all server-side fallbacks already exhausted
            if (error instanceof Error && error.message.includes('Could not geocode')) return false;
            // Don't retry rate limits
            if (error instanceof Error && error.message.includes('Rate limited')) return false;
            // Retry other transient errors up to 2 times
            return failureCount < 2;
        },
        retryDelay: 3000,
        refetchInterval: CACHE_DURATION_MS,
        refetchIntervalInBackground: false,
        // Scraping can take up to 3 mins — don't kill stale queries early
        staleTime: CACHE_DURATION_MS,
    });

    // Re-fetch at 45s and 120s to pick up price data from background menu scrapes.
    // Background scrapes take 30-120s; two refetches catch both fast and slow completions.
    useEffect(() => {
        if (data && data.spots.length > 0) {
            const hasMissingPrices = data.spots.some(s => s.price_per_wing == null && s.cheapest_item_price == null);
            if (hasMissingPrices) {
                const timer45 = setTimeout(() => refetch(), 45_000);
                const timer120 = setTimeout(() => refetch(), 120_000);
                return () => {
                    clearTimeout(timer45);
                    clearTimeout(timer120);
                };
            }
        }
    }, [data, refetch]);

    const spots = data?.spots || [];
    const stats = calculateAvailability(spots);
    const locationName = data?.location ? `${data.location.city}, ${data.location.state}` : '';
    const hasResults = spots.length > 0;
    const isSearching = isLoading || isFetching;

    const handleSearch = useCallback((zip: string) => {
        sessionStorage.setItem(LAST_ZIP_KEY, zip);
        setZipCode(zip);
    }, []);

    const handleFlavorSelect = useCallback((f: FlavorPersona) => {
        sessionStorage.setItem(LAST_FLAVOR_KEY, f);
        setFlavor(f);
    }, []);

    const coachSpeech = getCoachSpeech(flavor, isSearching, hasResults);

    return (
        <GlassBlitzEntrance
            text="SUPER BOWL LX"
            subtext="WING COMMAND"
            onComplete={() => setBannerDone(true)}
        >
            <div className="min-h-screen flex flex-col relative">
                {/* ===== Grass Field Background — the MAIN page bg behind dashboard ===== */}
                <div className="fixed inset-0 z-[-2] pointer-events-none">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/field-bg.jpg"
                        alt=""
                        className="w-full h-full object-cover"
                    />
                    {/* Sunny washed-out overlay so UI is readable */}
                    <div className="absolute inset-0" style={{
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.2) 40%, rgba(22,163,74,0.06) 100%)',
                    }} />
                </div>

                {/* ===== Command Jumbotron — bright header ===== */}
                <CommandJumbotron
                    stats={stats}
                    isSearching={isSearching}
                    flavor={flavor}
                    hasResults={hasResults}
                />

                {/* ===== Hero Section — Coach Wing + Playbook ===== */}
                {/* NO opaque wrapper — field shows through directly */}
                <CoachHero
                    flavor={flavor}
                    hasResults={hasResults}
                    isSearching={isSearching}
                    coachSpeech={coachSpeech}
                    bannerDone={bannerDone}
                    zipCode={zipCode}
                    onFlavorSelect={handleFlavorSelect}
                    onSearch={handleSearch}
                />

                {/* ===== Loading State — Trash Talk Ticker ===== */}
                <AnimatePresence>
                    {isSearching && (
                        <motion.section
                            className="relative z-10 px-4 py-6"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <div className="max-w-3xl mx-auto">
                                <TrashTalkTicker isActive={isSearching} flavor={flavor} />
                            </div>
                        </motion.section>
                    )}
                </AnimatePresence>

                {/* ===== Results — Scouting Report (in frosted glass) ===== */}
                <AnimatePresence>
                    {(hasResults || isSearching) && (
                        <motion.section
                            className="relative z-10 px-4 pb-16 pt-4"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                        >
                            <div className="max-w-7xl mx-auto space-y-6">
                                <StatsBar stats={stats} locationName={locationName} />

                                <motion.p
                                    className="font-marker text-white text-sm text-center"
                                    style={{ textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 0.8 }}
                                    transition={{ delay: 0.4 }}
                                >
                                    Step 3: The Scouting Report
                                </motion.p>

                                <TradingCardGrid
                                    spots={spots}
                                    isLoading={isSearching && spots.length === 0}
                                    compareIds={compareIds}
                                    onToggleCompare={toggleCompare}
                                />

                                {!isSearching && spots.length === 0 && data?.message && (
                                    <motion.div
                                        className="text-center py-12"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                    >
                                        <span className="text-5xl mb-4 block">☀️</span>
                                        <p className="text-gray-600 font-heading tracking-wider">{data.message}</p>
                                        <p className="text-gray-400 text-xs mt-2 font-marker">
                                            Coach Wing says: &quot;Even the sun can&apos;t find wings here. Try another zip!&quot;
                                        </p>
                                    </motion.div>
                                )}
                            </div>
                        </motion.section>
                    )}
                </AnimatePresence>

                {/* ===== Footer ===== */}
                <footer className="mt-auto py-8 text-center relative z-[5]">
                    <div className="max-w-md mx-auto space-y-2 rounded-xl px-4 py-3" style={{
                        background: 'rgba(255,255,255,0.6)',
                        backdropFilter: 'blur(8px)',
                    }}>
                        <p className="text-gray-500 text-xs tracking-[0.15em] font-heading">
                            SUPER BOWL LX: WING COMMAND &middot; FEB 9, 2026
                        </p>
                        <p className="text-gray-400 text-[10px] font-marker">
                            Not affiliated with the NFL, but our wings hit harder. ☀️🏈
                        </p>
                    </div>
                </footer>

                {/* ===== Compare Mode ===== */}
                <CompareBar
                    count={compareIds.size}
                    onCompare={() => setIsCompareOpen(true)}
                    onClear={clearCompare}
                />
                <CompareModal
                    spots={spots.filter(s => compareIds.has(s.id))}
                    isOpen={isCompareOpen}
                    onClose={() => setIsCompareOpen(false)}
                />
            </div>
        </GlassBlitzEntrance>
    );
}

// ===========================================
// Root Page Component
// ===========================================
export default function Home() {
    return (
        <QueryClientProvider client={queryClient}>
            <WingCommandContent />
        </QueryClientProvider>
    );
}
