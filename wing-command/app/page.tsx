'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Users } from 'lucide-react';
import { GlassBlitzEntrance } from '@/components/GlassBlitzEntrance';
import { CommandJumbotron } from '@/components/CommandJumbotron';
import { CoachHero } from '@/components/CoachHero';
import { TrashTalkTicker } from '@/components/TrashTalkTicker';
import { TradingCardGrid } from '@/components/TradingCardGrid';
import { CompareBar } from '@/components/CompareBar';
import { CompareModal } from '@/components/CompareModal';
import { FlavorPersona, AvailabilityStats } from '@/lib/types';
import { calculateAvailability } from '@/lib/utils';
import { useWingSearch } from '@/hooks/useWingSearch';

const LAST_ZIP_KEY = 'wing-command-last-zip';
const LAST_FLAVOR_KEY = 'wing-command-last-flavor';

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

function getCoachSpeech(flavor: FlavorPersona | null, isSearching: boolean, hasResults: boolean): string | undefined {
    if (flavor === 'face-melter') {
        if (isSearching) return "Scouting the hottest spots... this sunshine ain't helping! 🔥";
        if (hasResults) return "Now THAT'S a roster! Pick your starter.";
        return "You chose violence. On a sunny day. Bold.";
    }
    if (flavor === 'classicist') {
        if (isSearching) return "Finding the OGs... perfect game day weather for it.";
        if (hasResults) return "Now THAT'S a roster! Pick your starter.";
        return "Smart play. The classics never miss.";
    }
    if (flavor === 'sticky-finger') {
        if (isSearching) return "Tracking down the sauciest spots... 🤤";
        if (hasResults) return "Now THAT'S a roster! Pick your starter.";
        return "Napkins? Where we're going, we don't need napkins.";
    }
    if (!flavor) return "Pick a play, rookie. What's your flavour?";
    return undefined;
}

function WingCommandContent() {
    const [zipCode, setZipCode] = useState('');
    const [flavor, setFlavor] = useState<FlavorPersona | null>(null);
    const [bannerDone, setBannerDone] = useState(false);
    const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
    const [isCompareOpen, setIsCompareOpen] = useState(false);

    // Use the streaming hook instead of React Query
    const { spots, isSearching, isDone, location, message, search, reset } = useWingSearch();

    const toggleCompare = useCallback((id: string) => {
        setCompareIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else if (next.size < 4) next.add(id);
            return next;
        });
    }, []);

    const clearCompare = useCallback(() => setCompareIds(new Set()), []);

    // Restore last search from session storage
    useEffect(() => {
        const savedZip = sessionStorage.getItem(LAST_ZIP_KEY);
        const savedFlavor = sessionStorage.getItem(LAST_FLAVOR_KEY) as FlavorPersona | null;
        if (savedZip && savedZip.length === 5) setZipCode(savedZip);
        if (savedFlavor) setFlavor(savedFlavor);
    }, []);

    // Kick off search when both zip and flavor are set
    useEffect(() => {
        if (zipCode.length === 5 && flavor) {
            search(zipCode, flavor);
        }
    }, [zipCode, flavor, search]);

    const stats = calculateAvailability(spots);
    const locationName = location ? `${location.city}, ${location.state}` : '';
    const hasResults = spots.length > 0;
    const coachSpeech = getCoachSpeech(flavor, isSearching, hasResults);

    const handleSearch = useCallback((zip: string) => {
        sessionStorage.setItem(LAST_ZIP_KEY, zip);
        setZipCode(zip);
        setCompareIds(new Set());
    }, []);

    const handleFlavorSelect = useCallback((f: FlavorPersona) => {
        sessionStorage.setItem(LAST_FLAVOR_KEY, f);
        setFlavor(f);
        setCompareIds(new Set());
    }, []);

    return (
        <GlassBlitzEntrance
            text="SUPER BOWL LX"
            subtext="WING COMMAND"
            onComplete={() => setBannerDone(true)}
        >
            <div className="min-h-screen flex flex-col relative">
                <div className="fixed inset-0 z-[-2] pointer-events-none">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/field-bg.jpg" alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0" style={{
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.2) 40%, rgba(22,163,74,0.06) 100%)',
                    }} />
                </div>

                <CommandJumbotron
                    stats={stats}
                    isSearching={isSearching}
                    flavor={flavor}
                    hasResults={hasResults}
                />

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

                {/* Loading ticker */}
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

                {/* Results — shown as soon as ANY agent returns spots */}
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

                                {isSearching && hasResults && (
                                    <motion.p
                                        className="text-center text-sm font-marker"
                                        style={{ color: 'rgba(255,255,255,0.7)', textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                    >
                                        🔍 {spots.length} spot{spots.length !== 1 ? 's' : ''} found so far — more loading...
                                    </motion.p>
                                )}

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

                                {isDone && spots.length === 0 && message && (
                                    <motion.div
                                        className="text-center py-12"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                    >
                                        <span className="text-5xl mb-4 block">☀️</span>
                                        <p className="text-gray-600 font-heading tracking-wider">{message}</p>
                                        <p className="text-gray-400 text-xs mt-2 font-marker">
                                            Coach Wing says: &quot;Even the sun can&apos;t find wings here. Try another zip!&quot;
                                        </p>
                                    </motion.div>
                                )}
                            </div>
                        </motion.section>
                    )}
                </AnimatePresence>

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

export default function Home() {
    return <WingCommandContent />;
}
