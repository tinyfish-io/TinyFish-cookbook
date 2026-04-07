'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, TrendingUp } from 'lucide-react';
import { FlavorPersona, AvailabilityStats } from '@/lib/types';
import { getCountdown } from '@/lib/utils';

// ===== Ticker Messages — Happy Sunny Gameday Satire =====
const TICKER_MESSAGES = [
    '☀️ WEATHER REPORT: 100% CHANCE OF RANCH DIP...',
    '🍗 REMINDER: CALORIES DON\'T COUNT ON SUNDAY...',
    '🏈 BREAKING: LOCAL MAN ORDERS "JUST ONE MORE BASKET"... AGAIN',
    '☀️ SUPER BOWL LX · FEB 9, 2026 · KICKOFF IMMINENT',
    '🎉 RE-CALIBRATING WING TRAJECTORY... INTERCEPTING DOORDASH...',
    '🍗 COACH WING SAYS: TRUST THE PROCESS... AND THE SAUCE',
    '☀️ FUN FACT: AMERICANS EAT 1.4 BILLION WINGS ON GAME DAY',
    '🏈 SCOUTING REPORT: YOUR COUCH HAS BEEN SECURED',
    '🎊 HALFTIME SHOW PREDICTION: RANCH VS BLUE CHEESE DEBATE',
    '☀️ TEMPERATURE CHECK: IT\'S WING O\'CLOCK SOMEWHERE',
];

// ===== Countdown Component =====
function JumbotronCountdown() {
    const [countdown, setCountdown] = useState<ReturnType<typeof getCountdown> | null>(null);

    useEffect(() => {
        setCountdown(getCountdown());
        const interval = setInterval(() => setCountdown(getCountdown()), 1000);
        return () => clearInterval(interval);
    }, []);

    if (!countdown) {
        return (
            <div className="flex items-center gap-1.5 md:gap-2">
                {['D', 'H', 'M', 'S'].map((label) => (
                    <div key={label} className="flex flex-col items-center">
                        <span className="font-heading text-sm md:text-lg tracking-wider text-gray-400 leading-none">
                            --
                        </span>
                        <span className="text-[7px] md:text-[8px] text-gray-400 font-heading tracking-[0.15em]">
                            {label}
                        </span>
                    </div>
                ))}
            </div>
        );
    }

    if (countdown.isPast) {
        return (
            <motion.span
                className="font-heading text-whistle-orange text-sm md:text-lg tracking-[0.15em]"
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
            >
                🏈 GAME TIME!
            </motion.span>
        );
    }

    const segments = [
        { value: countdown.days, label: 'D' },
        { value: countdown.hours, label: 'H' },
        { value: countdown.minutes, label: 'M' },
        { value: countdown.seconds, label: 'S' },
    ];

    return (
        <div className="flex items-center gap-1 md:gap-2">
            <Timer className="w-3.5 h-3.5 text-whistle-orange hidden md:block" />
            {segments.map((seg, i) => (
                <React.Fragment key={seg.label}>
                    <div className="flex flex-col items-center">
                        <span className="font-heading text-sm md:text-lg tracking-wider leading-none text-stadium-green">
                            {String(seg.value).padStart(2, '0')}
                        </span>
                        <span className="text-[7px] md:text-[8px] text-gray-400 font-heading tracking-[0.15em]">
                            {seg.label}
                        </span>
                    </div>
                    {i < segments.length - 1 && (
                        <span className="text-gray-300 text-xs md:text-sm leading-none mb-2">:</span>
                    )}
                </React.Fragment>
            ))}
        </div>
    );
}

// ===== LED Scrolling Ticker =====
function LEDTicker() {
    const [messageIdx, setMessageIdx] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setMessageIdx(prev => (prev + 1) % TICKER_MESSAGES.length);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative overflow-hidden h-5 md:h-6">
            <AnimatePresence mode="wait">
                <motion.div
                    key={messageIdx}
                    className="absolute inset-0 flex items-center justify-center"
                    initial={{ y: 16, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -16, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <span
                        className="text-[10px] md:text-xs font-heading tracking-[0.2em] whitespace-nowrap text-white"
                        style={{ textShadow: '0 1px 4px rgba(0,0,0,0.15)' }}
                    >
                        {TICKER_MESSAGES[messageIdx]}
                    </span>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

// ===== Main Jumbotron =====
interface CommandJumbotronProps {
    stats?: AvailabilityStats;
    isSearching?: boolean;
    flavor?: FlavorPersona | null;
    hasResults?: boolean;
}

export function CommandJumbotron({
    stats,
    isSearching = false,
    hasResults = false,
}: CommandJumbotronProps) {
    return (
        <header className="fixed top-0 left-0 right-0 z-50">
            {/* Main jumbotron frame — bright sunny theme */}
            <div
                className="relative overflow-hidden"
                style={{
                    background: 'rgba(255,255,255,0.88)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    borderBottom: '2px solid rgba(22,163,74,0.2)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                }}
            >
                {/* CRT scanline overlay */}
                <div
                    className="absolute inset-0 pointer-events-none z-10"
                    style={{
                        background: 'repeating-linear-gradient(transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)',
                    }}
                />

                {/* Glitch animation overlay — triggers periodically */}
                <motion.div
                    className="absolute inset-0 pointer-events-none z-20"
                    animate={{
                        x: [0, 0, 2, -2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                        filter: [
                            'hue-rotate(0deg)',
                            'hue-rotate(0deg)',
                            'hue-rotate(5deg)',
                            'hue-rotate(-5deg)',
                            'hue-rotate(0deg)',
                            'hue-rotate(0deg)',
                            'hue-rotate(0deg)',
                            'hue-rotate(0deg)',
                            'hue-rotate(0deg)',
                            'hue-rotate(0deg)',
                            'hue-rotate(0deg)',
                            'hue-rotate(0deg)',
                            'hue-rotate(0deg)',
                            'hue-rotate(0deg)',
                            'hue-rotate(0deg)',
                            'hue-rotate(0deg)',
                            'hue-rotate(0deg)',
                            'hue-rotate(0deg)',
                            'hue-rotate(0deg)',
                            'hue-rotate(0deg)',
                        ],
                    }}
                    transition={{
                        duration: 6,
                        repeat: Infinity,
                        ease: 'linear',
                    }}
                />

                {/* Top bar: Title + Countdown */}
                <div className="max-w-7xl mx-auto px-4 py-2 md:py-3 flex items-center justify-between relative z-30">
                    {/* Left: Title */}
                    <div className="flex items-center gap-2 md:gap-3">
                        <span className="text-xl md:text-2xl">🍗</span>
                        <div>
                            <h1
                                className="font-heading text-base md:text-xl tracking-[0.15em] leading-none text-stadium-green"
                            >
                                WING COMMAND
                            </h1>
                            <span className="text-[8px] md:text-[10px] font-heading tracking-[0.2em] text-whistle-orange">
                                SUPER BOWL LX
                            </span>
                        </div>
                    </div>

                    {/* Right: Stats + Countdown */}
                    <div className="flex items-center gap-3 md:gap-5">
                        {/* Stats (when results exist) */}
                        {hasResults && stats && stats.total > 0 && (
                            <div className="hidden md:flex items-center gap-2">
                                <TrendingUp className="w-3.5 h-3.5 text-stadium-green" />
                                <span className="text-xs font-heading tracking-wider text-stadium-green">
                                    {stats.percentage}% OPEN
                                </span>
                                <span className="text-gray-300 text-[10px]">|</span>
                                <span className="text-gray-500 text-[10px] font-heading tracking-wider">
                                    {stats.total} SPOTS
                                </span>
                            </div>
                        )}

                        {/* Searching indicator */}
                        {isSearching && (
                            <motion.div
                                className="flex items-center gap-1.5"
                                animate={{ opacity: [1, 0.5, 1] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-whistle-orange" />
                                <span className="text-[10px] text-whistle-orange font-heading tracking-wider hidden md:inline">
                                    SCOUTING
                                </span>
                            </motion.div>
                        )}

                        <JumbotronCountdown />
                    </div>
                </div>

                {/* LED ticker bar — bright orange */}
                <div
                    className="relative z-30"
                    style={{
                        background: 'linear-gradient(90deg, #F97316 0%, #EA580C 50%, #F97316 100%)',
                        borderTop: '1px solid rgba(249,115,22,0.3)',
                    }}
                >
                    <div className="max-w-7xl mx-auto px-4 py-1">
                        <LEDTicker />
                    </div>
                </div>
            </div>
        </header>
    );
}
