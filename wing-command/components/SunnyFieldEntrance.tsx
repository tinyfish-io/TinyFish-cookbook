'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SunnyFieldEntranceProps {
    onComplete?: () => void;
    children?: React.ReactNode;
}

interface ConfettiPiece {
    id: number;
    x: number;
    color: string;
    size: number;
    delay: number;
    duration: number;
    rotation: number;
    wobble: number;
    shape: 'rect' | 'circle' | 'strip';
}

interface ShardData {
    id: number;
    clipPath: string;
    exitX: number;
    exitY: number;
    exitRotate: number;
    delay: number;
}

const CONFETTI_COLORS = [
    '#DC2626', // Red
    '#2563EB', // Blue
    '#F59E0B', // Gold
    '#16A34A', // Green
    '#F97316', // Orange
    '#FFFFFF', // White
    '#EAB308', // Yellow
];

function generateShards(cols: number, rows: number): ShardData[] {
    const cellW = 100 / cols;
    const cellH = 100 / rows;
    const shards: ShardData[] = [];
    for (let i = 0; i < cols * rows; i++) {
        const r = Math.floor(i / cols);
        const c = i % cols;
        const cx = cellW * c + cellW * 0.5;
        const cy = cellH * r + cellH * 0.5;
        const nv = 5 + Math.floor(Math.random() * 3);
        const verts: Array<{ x: number; y: number }> = [];
        for (let v = 0; v < nv; v++) {
            const angle = (v / nv) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
            verts.push({
                x: Math.max(0, Math.min(100, cx + Math.cos(angle) * cellW * (0.45 + Math.random() * 0.2))),
                y: Math.max(0, Math.min(100, cy + Math.sin(angle) * cellH * (0.45 + Math.random() * 0.2))),
            });
        }
        verts.sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));
        const dirX = cx - 50;
        const dirY = cy - 50;
        const dist = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
        const fly = 2 + Math.random() * 3;
        shards.push({
            id: i,
            clipPath: `polygon(${verts.map(v => `${v.x.toFixed(1)}% ${v.y.toFixed(1)}%`).join(', ')})`,
            exitX: (dirX / dist) * fly * 100 + (Math.random() - 0.5) * 200,
            exitY: (dirY / dist) * fly * 100 + (Math.random() - 0.5) * 200,
            exitRotate: (Math.random() - 0.5) * 180,
            delay: Math.random() * 0.1,
        });
    }
    return shards;
}

function ConfettiBurst({ active }: { active: boolean }) {
    const pieces = useMemo<ConfettiPiece[]>(() =>
        Array.from({ length: 80 }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
            size: 6 + Math.random() * 12,
            delay: Math.random() * 0.8,
            duration: 2.5 + Math.random() * 2,
            rotation: Math.random() * 720 - 360,
            wobble: (Math.random() - 0.5) * 100,
            shape: (['rect', 'circle', 'strip'] as const)[Math.floor(Math.random() * 3)],
        })),
    []);

    if (!active) return null;

    return (
        <div className="fixed inset-0 z-[60] pointer-events-none overflow-hidden">
            {pieces.map((p) => (
                <motion.div
                    key={p.id}
                    className="absolute"
                    style={{
                        left: `${p.x}%`,
                        top: -20,
                        width: p.shape === 'strip' ? p.size * 0.4 : p.size,
                        height: p.shape === 'circle' ? p.size : p.size * (p.shape === 'strip' ? 2.5 : 0.6),
                        backgroundColor: p.color,
                        borderRadius: p.shape === 'circle' ? '50%' : '2px',
                        boxShadow: `0 1px 3px rgba(0,0,0,0.15)`,
                    }}
                    initial={{ y: -30, opacity: 1, rotate: 0 }}
                    animate={{
                        y: [0, window?.innerHeight ? window.innerHeight + 100 : 1000],
                        x: [0, p.wobble, p.wobble * 0.5],
                        rotate: p.rotation,
                        opacity: [1, 1, 0.8, 0],
                    }}
                    transition={{
                        duration: p.duration,
                        delay: p.delay,
                        ease: 'easeIn',
                    }}
                />
            ))}
        </div>
    );
}

export function SunnyFieldEntrance({ onComplete, children }: SunnyFieldEntranceProps) {
    const [phase, setPhase] = useState<'entrance' | 'shattering' | 'confetti' | 'done'>('entrance');
    const shards = useMemo(() => generateShards(8, 8), []);

    const handleClick = useCallback(() => {
        if (phase !== 'entrance') return;
        setPhase('shattering');
        // Show confetti after shards fly away
        setTimeout(() => setPhase('confetti'), 600);
        // Finish after confetti
        setTimeout(() => { setPhase('done'); onComplete?.(); }, 2800);
    }, [phase, onComplete]);

    // ===== DONE — show main content =====
    if (phase === 'done') {
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
                {children}
            </motion.div>
        );
    }

    // ===== CONFETTI PHASE — field bg visible + confetti falling =====
    if (phase === 'confetti') {
        return (
            <>
                <ConfettiBurst active />
                <motion.div
                    className="fixed inset-0 z-50 flex flex-col items-center justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    {/* Bright sunny grass background */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/field-bg.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
                    {/* Bright sun overlay */}
                    <div className="absolute inset-0" style={{
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 50%, rgba(22,163,74,0.08) 100%)',
                    }} />
                    {/* Welcome text */}
                    <div className="relative z-10 text-center">
                        <motion.h1
                            className="font-heading text-5xl md:text-7xl lg:text-8xl text-white drop-shadow-lg"
                            style={{ textShadow: '0 4px 20px rgba(0,0,0,0.4), 0 0 60px rgba(22,163,74,0.4)' }}
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                        >
                            GAME ON!
                        </motion.h1>
                        <motion.p
                            className="text-white/90 text-xl md:text-2xl font-heading tracking-[0.2em] mt-2"
                            style={{ textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            SUPER BOWL LX: WING COMMAND
                        </motion.p>
                    </div>
                </motion.div>
            </>
        );
    }

    // ===== SHATTERING — glass shards flying with confetti starting =====
    if (phase === 'shattering') {
        return (
            <>
                <ConfettiBurst active />
                <div className="fixed inset-0 z-50 overflow-hidden" style={{ perspective: '1200px' }}>
                    {shards.map((shard) => (
                        <motion.div
                            key={shard.id}
                            className="absolute inset-0"
                            style={{ clipPath: shard.clipPath }}
                            initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
                            animate={{ x: shard.exitX, y: shard.exitY, opacity: 0, rotate: shard.exitRotate }}
                            transition={{ duration: 0.6, delay: shard.delay, ease: [0.36, 0, 0.66, -0.56] }}
                        >
                            <div className="w-full h-full relative">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src="/field-bg.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-white/20 backdrop-blur-sm" />
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <h1 className="font-heading text-5xl md:text-7xl text-white drop-shadow-lg"
                                        style={{ textShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
                                        SUPER BOWL LX
                                    </h1>
                                    <p className="text-whistle-orange text-xl md:text-2xl font-heading tracking-[0.3em] mt-1"
                                        style={{ textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
                                        WING COMMAND
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </>
        );
    }

    // ===== ENTRANCE — the glass over the sunny field with Coach quote =====
    return (
        <div className="fixed inset-0 z-50 cursor-pointer select-none" onClick={handleClick}>
            {/* Bright green grass field background */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src="/field-bg.jpg"
                alt="Sunny Football Field"
                className="absolute inset-0 w-full h-full object-cover"
                draggable={false}
            />

            {/* Bright sunny day overlay — warm light from above */}
            <div className="absolute inset-0" style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.08) 40%, rgba(22,163,74,0.05) 100%)',
            }} />

            {/* Frosted glass pane effect */}
            <div className="absolute inset-0" style={{
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(2px)',
                WebkitBackdropFilter: 'blur(2px)',
            }} />

            {/* Glass reflection */}
            <div className="absolute inset-0" style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 40%, rgba(255,255,255,0.06) 100%)',
            }} />

            {/* Glass border */}
            <div className="absolute inset-0" style={{
                border: '3px solid rgba(255,255,255,0.2)',
                boxShadow: 'inset 0 0 80px rgba(255,255,255,0.05)',
            }} />

            {/* Floating emojis */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 4 }}>
                {[
                    { emoji: '🏈', x: 10, y: 15, size: 32, dur: 8 },
                    { emoji: '🍗', x: 80, y: 20, size: 28, dur: 10 },
                    { emoji: '☀️', x: 50, y: 8, size: 36, dur: 12 },
                    { emoji: '🎉', x: 15, y: 70, size: 24, dur: 9 },
                    { emoji: '🏈', x: 85, y: 65, size: 30, dur: 11 },
                    { emoji: '🍗', x: 40, y: 80, size: 26, dur: 7 },
                    { emoji: '🔥', x: 70, y: 10, size: 22, dur: 13 },
                    { emoji: '🎊', x: 25, y: 45, size: 20, dur: 10 },
                ].map((e, i) => (
                    <motion.div
                        key={i}
                        className="absolute pointer-events-none select-none"
                        style={{ left: `${e.x}%`, top: `${e.y}%`, fontSize: e.size }}
                        animate={{
                            y: [0, -25, 8, -18, 0],
                            x: [0, 12, -8, 6, 0],
                            rotate: [0, 8, -6, 4, 0],
                        }}
                        transition={{ duration: e.dur, delay: i * 0.3, repeat: Infinity, ease: 'easeInOut' }}
                    >
                        {e.emoji}
                    </motion.div>
                ))}
            </div>

            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ zIndex: 5 }}>
                {/* Title */}
                <motion.h1
                    className="font-heading text-5xl md:text-7xl lg:text-8xl tracking-[0.08em] text-white mb-2 text-center drop-shadow-lg px-4"
                    style={{ textShadow: '0 4px 25px rgba(0,0,0,0.5), 0 0 80px rgba(22,163,74,0.4)' }}
                    initial={{ opacity: 0, y: -30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.7, type: 'spring', stiffness: 200 }}
                >
                    SUPER BOWL LX
                </motion.h1>

                <motion.p
                    className="text-whistle-orange text-xl md:text-3xl tracking-[0.3em] font-heading text-center drop-shadow-lg"
                    style={{ textShadow: '0 2px 15px rgba(0,0,0,0.4), 0 0 30px rgba(249,115,22,0.4)' }}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.6 }}
                >
                    WING COMMAND
                </motion.p>

                {/* Coach Wing speech bubble — funny sunny quote */}
                <motion.div
                    className="relative mt-8 rounded-2xl px-7 py-5 shadow-2xl max-w-[460px] text-center mx-4"
                    style={{
                        zIndex: 20,
                        background: 'rgba(255,255,255,0.92)',
                        border: '3px solid #16A34A',
                        backdropFilter: 'blur(10px)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.15), 0 0 20px rgba(22,163,74,0.1)',
                    }}
                    initial={{ opacity: 0, scale: 0.7, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: 0.8, type: 'spring', stiffness: 280, damping: 18 }}
                >
                    <p className="text-gray-800 text-base md:text-lg font-marker leading-relaxed">
                        {"Sun's out, buns out... wait, wrong speech."}<br />
                        <span className="text-stadium-green font-bold text-lg md:text-xl">{"WE NEED WINGS!"}</span>{' '}
                        <span className="text-xl">🍗☀️🏈</span>
                    </p>
                    {/* Tail */}
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-5 h-5 rotate-45"
                        style={{ background: 'rgba(255,255,255,0.92)', borderTop: '3px solid #16A34A', borderLeft: '3px solid #16A34A' }}
                    />
                </motion.div>

                {/* CTA */}
                <motion.div
                    className="mt-8 flex flex-col items-center gap-2" style={{ zIndex: 20 }}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
                >
                    <motion.p
                        className="text-white text-sm md:text-base font-heading tracking-[0.2em] px-6 py-2 rounded-full"
                        style={{
                            textShadow: '0 2px 10px rgba(0,0,0,0.4)',
                            background: 'rgba(22,163,74,0.3)',
                            backdropFilter: 'blur(4px)',
                        }}
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    >
                        🏈 CLICK TO KICKOFF! 🏈
                    </motion.p>
                </motion.div>
            </div>

            {/* Glass glare sweep */}
            <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{
                    zIndex: 6,
                    background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.12) 45%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.12) 55%, transparent 60%)',
                }}
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 5, repeat: Infinity, repeatDelay: 4, ease: 'easeInOut' }}
            />
        </div>
    );
}
