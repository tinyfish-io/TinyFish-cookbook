'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FlavorPersona } from '@/lib/types';

const TRASH_TALK_LINES = [
    'Intercepting DoorDash drivers...',
    'Deflating prices...',
    'Reviewing the play on the field...',
    'Scouting local dive bars for hidden gems...',
    'Checking if Buffalo Wild Wings has a wait...',
    'Analyzing sauce-to-wing ratio...',
    'Running a two-minute drill on Uber Eats...',
    'Audible! Changing the order at the line...',
    'Fumble recovery: found a BOGO deal...',
    'Fourth and long... checking Grubhub...',
    'Personal foul: $3/wing detected. Ejected.',
    'Timeout called. Re-scouting the area...',
    'Hail Mary: searching 5-mile radius...',
    'Challenge flag thrown on that delivery estimate...',
    'False start: that restaurant is closed...',
    'Coach Wing says: "TRUST THE PROCESS"',
];

const HEAT_SEEKER_LINES = [
    'WARNING: Scoville levels exceeding 100,000...',
    'Ghost pepper reconnaissance in progress...',
    'Carolina Reaper alert: handler required...',
    'Searching for restaurants that sign waivers...',
    'Thermal imaging activated...',
    'Coach Wing is sweating...',
];

const SAFE_BET_LINES = [
    'Finding the most respectable buffalo sauce...',
    'Mild/medium zone secured...',
    'Your coworkers will never know...',
    'Sensible spice levels locked in...',
];

const STICKY_LINES = [
    'Honey BBQ radar engaged...',
    'Garlic parm levels: MAXIMUM...',
    'Napkin supply: critically low...',
    'Teriyaki glaze thickness: optimal...',
];

interface TrashTalkTickerProps {
    isActive: boolean;
    flavor: FlavorPersona | null;
}

export function TrashTalkTicker({ isActive, flavor }: TrashTalkTickerProps) {
    const [currentLine, setCurrentLine] = useState(0);

    const lines = React.useMemo(() => {
        const base = [...TRASH_TALK_LINES];
        if (flavor === 'face-melter') base.push(...HEAT_SEEKER_LINES);
        else if (flavor === 'classicist') base.push(...SAFE_BET_LINES);
        else if (flavor === 'sticky-finger') base.push(...STICKY_LINES);
        return base;
    }, [flavor]);

    useEffect(() => {
        if (!isActive) return;
        const interval = setInterval(() => {
            setCurrentLine(prev => (prev + 1) % lines.length);
        }, 1800);
        return () => clearInterval(interval);
    }, [isActive, lines]);

    if (!isActive) return null;

    return (
        <motion.div
            className="w-full max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
        >
            <div className="relative">
                {/* "LIVE" badge */}
                <div className="absolute -top-3 left-4 z-10 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white text-stadium-green text-[10px] font-black tracking-wider shadow-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-stadium-green animate-siren" />
                    SCOUTING LIVE
                </div>

                {/* Ticker container */}
                <div className="ticker-bar rounded-xl px-5 py-4 mt-2">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentLine}
                            className="flex items-center justify-center gap-3"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                        >
                            <span className="text-white font-heading text-sm md:text-base tracking-wider">
                                {lines[currentLine]}
                            </span>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Pulsing dots loader */}
                <div className="flex items-center justify-center gap-2 mt-3">
                    {[0, 1, 2, 3, 4].map((i) => (
                        <motion.div
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-white"
                            animate={{
                                opacity: [0.3, 1, 0.3],
                                scale: [0.6, 1.5, 0.6],
                            }}
                            transition={{
                                duration: 1.2,
                                delay: i * 0.15,
                                repeat: Infinity,
                            }}
                        />
                    ))}
                </div>
            </div>
        </motion.div>
    );
}
