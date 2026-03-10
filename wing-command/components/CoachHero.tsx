'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CoachWingMascot } from '@/components/CoachWingMascot';
import { FlavorTarot } from '@/components/FlavorTarot';
import { CoinToss } from '@/components/CoinToss';
import { PlaybookSearch } from '@/components/PlaybookSearch';
import { FlavorPersona } from '@/lib/types';

interface CoachHeroProps {
    flavor: FlavorPersona | null;
    hasResults: boolean;
    isSearching: boolean;
    coachSpeech?: string;
    bannerDone: boolean;
    zipCode: string;
    onFlavorSelect: (f: FlavorPersona) => void;
    onSearch: (zip: string) => void;
}

export function CoachHero({
    flavor,
    hasResults,
    isSearching,
    coachSpeech,
    bannerDone,
    zipCode,
    onFlavorSelect,
    onSearch,
}: CoachHeroProps) {
    return (
        <section className="relative z-20 pt-28 md:pt-32 min-h-[90vh] flex flex-col lg:flex-row items-center justify-center px-4 md:px-8 gap-8 lg:gap-0 max-w-7xl mx-auto pb-16">
            {/* ===== Left Side — Coach Wing Mascot (50%) ===== */}
            <motion.div
                className="w-full lg:w-1/2 flex flex-col items-center justify-center py-8 lg:py-0 relative"
                initial={{ opacity: 0, x: -60 }}
                animate={{ opacity: bannerDone ? 1 : 0, x: bannerDone ? 0 : -60 }}
                transition={{ duration: 0.85, delay: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
            >
                {/* Background decorations */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl lg:rounded-none">
                    {/* Big faded "COACH" text — slightly more visible on field */}
                    <div className="absolute top-[10%] left-1/2 -translate-x-1/2 font-heading text-[120px] md:text-[180px] text-white/[0.15] tracking-[0.2em] select-none whitespace-nowrap" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.1)' }}>
                        COACH
                    </div>
                    {/* Decorative whistle icon-like circle */}
                    <div className="absolute bottom-[15%] right-[10%] w-24 h-24 rounded-full border-2 border-stadium-green/[0.06]" />
                    <div className="absolute top-[20%] left-[8%] w-16 h-16 rounded-full border border-whistle-orange/[0.06]" />
                </div>

                {/* Mascot area — transparent so field shows through */}
                <div className="relative z-10 w-full flex flex-col items-center justify-center min-h-[400px] lg:min-h-[70vh]">
                    <CoachWingMascot
                        flavor={flavor}
                        hasResults={hasResults}
                        isSearching={isSearching}
                        speechBubble={coachSpeech}
                    />

                    {/* Decorative handwritten note */}
                    <motion.p
                        className="font-marker text-sm text-white mt-6 text-center transform -rotate-2"
                        style={{ textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: bannerDone ? 0.7 : 0 }}
                        transition={{ delay: 1.2 }}
                    >
                        &ldquo;Trust the process&rdquo; — Coach Wing
                    </motion.p>
                </div>
            </motion.div>

            {/* ===== Right Side — Playbook Content (50%) — frosted glass so field peeks through ===== */}
            <motion.div
                className="w-full lg:w-1/2 flex flex-col items-center justify-center lg:pl-4 xl:pl-8 space-y-8 rounded-3xl p-6 lg:p-8 overflow-visible"
                style={{
                    background: 'rgba(255,255,255,0.55)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255,255,255,0.4)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
                    isolation: 'auto',
                }}
                initial={{ opacity: 0, x: 60 }}
                animate={{ opacity: bannerDone ? 1 : 0, x: bannerDone ? 0 : 60 }}
                transition={{ duration: 0.85, delay: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
            >
                {/* Section Title */}
                <div className="text-center">
                    <h2 className="font-heading text-4xl md:text-5xl lg:text-6xl tracking-[0.06em] text-varsity-navy leading-none">
                        WING COMMAND
                    </h2>
                    <p className="text-stadium-green text-sm tracking-[0.15em] mt-1 font-heading">
                        SUPER BOWL LX HEADQUARTERS
                    </p>
                    <motion.span
                        className="inline-block mt-2 px-3 py-1 bg-whistle-orange/10 border border-whistle-orange/20 rounded-lg
                                 text-whistle-orange text-[10px] md:text-xs font-heading tracking-[0.15em]"
                        initial={{ scale: 0 }}
                        animate={{ scale: bannerDone ? 1 : 0 }}
                        transition={{ delay: 0.8, type: 'spring' }}
                    >
                        YOUR GAME DAY WING HQ
                    </motion.span>
                </div>

                {/* Step 1: Choose Your Play */}
                <div className="w-full">
                    <motion.p
                        className="font-marker text-stadium-green/60 text-sm text-center mb-3"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: bannerDone ? 1 : 0 }}
                        transition={{ delay: 0.6 }}
                    >
                        Step 1: The Huddle
                    </motion.p>
                    <FlavorTarot selected={flavor} onSelect={onFlavorSelect} />
                </div>

                {/* Coin Toss */}
                <motion.div
                    className="flex justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: bannerDone ? 1 : 0 }}
                    transition={{ delay: 0.9 }}
                >
                    <CoinToss onResult={onFlavorSelect} />
                </motion.div>

                {/* Step 2: Call the Play */}
                <div className="w-full pb-8">
                    <motion.p
                        className="font-marker text-stadium-green/60 text-sm text-center mb-3"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: bannerDone ? 1 : 0 }}
                        transition={{ delay: 0.7 }}
                    >
                        Step 2: Call the Play
                    </motion.p>
                    <PlaybookSearch
                        onSearch={onSearch}
                        isLoading={isSearching}
                        initialZip={zipCode}
                        flavor={flavor}
                    />
                </div>

                {/* Prompt to pick flavor */}
                {!flavor && zipCode.length === 5 && (
                    <motion.p
                        className="text-center text-whistle-orange text-sm font-marker"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        Pick your play above to start scouting!
                    </motion.p>
                )}
            </motion.div>
        </section>
    );
}
