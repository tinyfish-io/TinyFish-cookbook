'use client';

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Shuffle } from 'lucide-react';
import { FlavorPersona } from '@/lib/types';

interface CoinTossProps {
    onResult: (flavor: FlavorPersona) => void;
}

const FLAVORS: FlavorPersona[] = ['face-melter', 'classicist', 'sticky-finger'];
const FLAVOR_LABELS: Record<FlavorPersona, string> = {
    'face-melter': 'HAIL MARY',
    'classicist': 'MILD PLAY',
    'sticky-finger': 'SAUCY PLAY',
};
const FLAVOR_EMOJIS: Record<FlavorPersona, string> = {
    'face-melter': '🔥',
    'classicist': '🛡️',
    'sticky-finger': '🍯',
};

export function CoinToss({ onResult }: CoinTossProps) {
    const [isFlipping, setIsFlipping] = useState(false);
    const [result, setResult] = useState<FlavorPersona | null>(null);

    const handleFlip = useCallback(() => {
        if (isFlipping) return;
        setIsFlipping(true);
        setResult(null);

        setTimeout(() => {
            const picked = FLAVORS[Math.floor(Math.random() * FLAVORS.length)];
            setResult(picked);
            setIsFlipping(false);
            onResult(picked);
        }, 1200);
    }, [isFlipping, onResult]);

    return (
        <motion.button
            onClick={handleFlip}
            disabled={isFlipping}
            className="group flex items-center gap-2 px-4 py-2 rounded-xl
                       bg-white border border-gray-200 hover:border-stadium-green/40
                       text-chalk-mid hover:text-stadium-green transition-all shadow-sm
                       disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
        >
            <motion.div
                className={`coin-3d ${isFlipping ? 'coin-flipping' : ''}`}
            >
                {result ? (
                    <span className="text-lg">{FLAVOR_EMOJIS[result]}</span>
                ) : (
                    <span className="text-lg">🪙</span>
                )}
            </motion.div>

            <span className="font-heading text-xs md:text-sm tracking-wider">
                {isFlipping
                    ? 'FLIPPING...'
                    : result
                        ? FLAVOR_LABELS[result]
                        : "CAN'T DECIDE? FLIP A COIN"
                }
            </span>

            {!isFlipping && !result && (
                <Shuffle className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
            )}
        </motion.button>
    );
}
