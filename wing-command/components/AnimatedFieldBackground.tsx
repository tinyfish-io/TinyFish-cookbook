'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface AnimatedFieldBackgroundProps {
    isSearching?: boolean;
}

/** Single floating football SVG */
function Football({ size, initialX, initialY, duration, delay, opacity }: {
    size: number;
    initialX: number;
    initialY: number;
    duration: number;
    delay: number;
    opacity: number;
}) {
    return (
        <motion.div
            className="absolute pointer-events-none"
            style={{
                left: `${initialX}%`,
                top: `${initialY}%`,
                width: size,
                height: size * 0.6,
                opacity,
            }}
            animate={{
                x: [0, 30, -20, 15, 0],
                y: [0, -40, -10, -50, 0],
                rotate: [0, 15, -10, 20, 0],
                scale: [1, 1.1, 0.9, 1.05, 1],
            }}
            transition={{
                duration,
                delay,
                repeat: Infinity,
                ease: 'easeInOut',
            }}
        >
            <svg viewBox="0 0 60 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Football body */}
                <ellipse cx="30" cy="18" rx="28" ry="16" fill="#8B4513" opacity="0.4" />
                <ellipse cx="30" cy="18" rx="28" ry="16" stroke="#6D3710" strokeWidth="1" opacity="0.3" />
                {/* Laces */}
                <line x1="30" y1="5" x2="30" y2="31" stroke="white" strokeWidth="1" opacity="0.3" />
                <line x1="22" y1="10" x2="38" y2="10" stroke="white" strokeWidth="0.8" opacity="0.25" />
                <line x1="21" y1="14" x2="39" y2="14" stroke="white" strokeWidth="0.8" opacity="0.25" />
                <line x1="21" y1="22" x2="39" y2="22" stroke="white" strokeWidth="0.8" opacity="0.25" />
                <line x1="22" y1="26" x2="38" y2="26" stroke="white" strokeWidth="0.8" opacity="0.25" />
            </svg>
        </motion.div>
    );
}

export function AnimatedFieldBackground({ isSearching = false }: AnimatedFieldBackgroundProps) {
    // Generate football data once
    const footballs = useMemo(() => [
        { size: 50, initialX: 8, initialY: 15, duration: 12, delay: 0, opacity: 0.08 },
        { size: 35, initialX: 85, initialY: 25, duration: 10, delay: 1, opacity: 0.1 },
        { size: 60, initialX: 20, initialY: 70, duration: 14, delay: 2, opacity: 0.06 },
        { size: 40, initialX: 75, initialY: 60, duration: 11, delay: 0.5, opacity: 0.09 },
        { size: 30, initialX: 50, initialY: 10, duration: 9, delay: 1.5, opacity: 0.12 },
        { size: 45, initialX: 60, initialY: 80, duration: 13, delay: 3, opacity: 0.07 },
        { size: 55, initialX: 35, initialY: 45, duration: 15, delay: 2.5, opacity: 0.05 },
    ], []);

    const yardLineNumbers = ['10', '20', '30', '40', '50', '40', '30', '20', '10'];

    const speedMult = isSearching ? 0.6 : 1;

    return (
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
            {/* Base stadium green tint */}
            <div className="absolute inset-0 bg-gradient-to-b from-green-50/40 via-transparent to-green-50/30" />

            {/* Stadium lights — top corners */}
            <motion.div
                className="absolute -top-20 -left-20 w-[500px] h-[500px]"
                style={{
                    background: 'radial-gradient(circle, rgba(249,115,22,0.04) 0%, transparent 70%)',
                }}
                animate={{
                    opacity: [0.03, 0.06, 0.03],
                }}
                transition={{
                    duration: isSearching ? 2 : 4,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
            />
            <motion.div
                className="absolute -top-20 -right-20 w-[500px] h-[500px]"
                style={{
                    background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)',
                }}
                animate={{
                    opacity: [0.04, 0.07, 0.04],
                }}
                transition={{
                    duration: isSearching ? 2.5 : 5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: 1,
                }}
            />

            {/* End zone tints */}
            <div
                className="absolute top-0 left-0 right-0 h-32"
                style={{
                    background: 'linear-gradient(to bottom, rgba(249,115,22,0.03), transparent)',
                }}
            />
            <div
                className="absolute bottom-0 left-0 right-0 h-32"
                style={{
                    background: 'linear-gradient(to top, rgba(249,115,22,0.03), transparent)',
                }}
            />

            {/* Animated yard lines — scrolling horizontally */}
            <div
                className="absolute inset-0"
                style={{
                    overflow: 'hidden',
                }}
            >
                <motion.div
                    className="absolute inset-y-0 flex items-stretch"
                    style={{
                        width: '200%',
                    }}
                    animate={{
                        x: ['0%', '-50%'],
                    }}
                    transition={{
                        duration: isSearching ? 20 : 40,
                        repeat: Infinity,
                        ease: 'linear',
                    }}
                >
                    {/* First set of yard lines */}
                    <div className="flex-1 relative">
                        {yardLineNumbers.map((num, i) => {
                            const leftPct = ((i + 1) / (yardLineNumbers.length + 1)) * 100;
                            return (
                                <div key={`a-${i}`} className="absolute top-0 bottom-0" style={{ left: `${leftPct}%` }}>
                                    {/* Vertical line */}
                                    <div className="absolute inset-y-0 w-px bg-white/[0.05]" />
                                    {/* Number */}
                                    <span
                                        className="absolute top-[48%] -translate-y-1/2 -translate-x-1/2 font-heading text-[60px] md:text-[80px] text-white/[0.03] select-none"
                                    >
                                        {num}
                                    </span>
                                </div>
                            );
                        })}
                        {/* Horizontal hash marks */}
                        {[20, 40, 60, 80].map((topPct) => (
                            <div
                                key={`h-a-${topPct}`}
                                className="absolute left-0 right-0 h-px bg-white/[0.03]"
                                style={{ top: `${topPct}%` }}
                            />
                        ))}
                    </div>

                    {/* Duplicate for seamless scroll */}
                    <div className="flex-1 relative">
                        {yardLineNumbers.map((num, i) => {
                            const leftPct = ((i + 1) / (yardLineNumbers.length + 1)) * 100;
                            return (
                                <div key={`b-${i}`} className="absolute top-0 bottom-0" style={{ left: `${leftPct}%` }}>
                                    <div className="absolute inset-y-0 w-px bg-white/[0.05]" />
                                    <span
                                        className="absolute top-[48%] -translate-y-1/2 -translate-x-1/2 font-heading text-[60px] md:text-[80px] text-white/[0.03] select-none"
                                    >
                                        {num}
                                    </span>
                                </div>
                            );
                        })}
                        {[20, 40, 60, 80].map((topPct) => (
                            <div
                                key={`h-b-${topPct}`}
                                className="absolute left-0 right-0 h-px bg-white/[0.03]"
                                style={{ top: `${topPct}%` }}
                            />
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* Floating footballs */}
            {footballs.map((fb, i) => (
                <Football
                    key={i}
                    size={fb.size}
                    initialX={fb.initialX}
                    initialY={fb.initialY}
                    duration={fb.duration * speedMult}
                    delay={fb.delay}
                    opacity={fb.opacity}
                />
            ))}

            {/* Floating emojis — 🍗🔥🏈 bobbing around the field */}
            {[
                { emoji: '🍗', x: 6, y: 20, size: 22, dur: 9, del: 0 },
                { emoji: '🏈', x: 88, y: 30, size: 26, dur: 11, del: 1 },
                { emoji: '🔥', x: 15, y: 75, size: 20, dur: 8, del: 2 },
                { emoji: '🍗', x: 75, y: 70, size: 24, dur: 10, del: 0.5 },
                { emoji: '🏈', x: 40, y: 5, size: 18, dur: 12, del: 1.5 },
                { emoji: '🔥', x: 92, y: 55, size: 20, dur: 9, del: 3 },
                { emoji: '🍗', x: 50, y: 90, size: 22, dur: 10, del: 2.5 },
                { emoji: '🏈', x: 25, y: 45, size: 16, dur: 13, del: 0.8 },
            ].map((e, i) => (
                <motion.div
                    key={`emoji-${i}`}
                    className="absolute pointer-events-none select-none"
                    style={{
                        left: `${e.x}%`,
                        top: `${e.y}%`,
                        fontSize: e.size,
                        opacity: 0.12,
                    }}
                    animate={{
                        y: [0, -25, 8, -18, 0],
                        x: [0, 12, -8, 6, 0],
                        rotate: [0, 8, -6, 4, 0],
                    }}
                    transition={{
                        duration: e.dur * speedMult,
                        delay: e.del,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                >
                    {e.emoji}
                </motion.div>
            ))}

            {/* Very subtle vignette */}
            <div
                className="absolute inset-0"
                style={{
                    background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.03) 100%)',
                }}
            />
        </div>
    );
}
