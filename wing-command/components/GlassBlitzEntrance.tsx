'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface GlassBlitzEntranceProps {
    text?: string;
    subtext?: string;
    heroImage?: string;
    onComplete?: () => void;
    children?: React.ReactNode;
}

interface ShardData {
    id: number;
    clipPath: string;
    exitX: number;
    exitY: number;
    exitRotate: number;
    exitScale: number;
    delay: number;
}

interface FloatingEmojiData {
    id: number;
    emoji: string;
    x: number;
    y: number;
    size: number;
    duration: number;
    delay: number;
}

function generateShards(cols: number, rows: number): ShardData[] {
    const cellW = 100 / cols;
    const cellH = 100 / rows;
    const shards: ShardData[] = [];

    for (let i = 0; i < cols * rows; i++) {
        const r = Math.floor(i / cols);
        const c = i % cols;
        const cx = cellW * c + cellW * 0.5;
        const cy = cellH * r + cellH * 0.5;

        const numVertices = 5 + Math.floor(Math.random() * 4);
        const vertices: Array<{ x: number; y: number }> = [];

        for (let v = 0; v < numVertices; v++) {
            const angle = (v / numVertices) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
            const radiusX = cellW * (0.45 + Math.random() * 0.25);
            const radiusY = cellH * (0.45 + Math.random() * 0.25);
            vertices.push({
                x: Math.max(0, Math.min(100, cx + Math.cos(angle) * radiusX)),
                y: Math.max(0, Math.min(100, cy + Math.sin(angle) * radiusY)),
            });
        }

        vertices.sort((a, b) =>
            Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx)
        );

        const clipPath = `polygon(${vertices.map(v => `${v.x.toFixed(1)}% ${v.y.toFixed(1)}%`).join(', ')})`;

        const dirX = cx - 50;
        const dirY = cy - 50;
        const dist = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
        const flyMult = 2.5 + Math.random() * 3;

        shards.push({
            id: i,
            clipPath,
            exitX: (dirX / dist) * flyMult * 100 + (Math.random() - 0.5) * 200,
            exitY: (dirY / dist) * flyMult * 100 + (Math.random() - 0.5) * 200,
            exitRotate: (Math.random() - 0.5) * 180,
            exitScale: 0.8 + Math.random() * 1.5,
            delay: Math.random() * 0.12,
        });
    }

    return shards;
}

function CrackOverlay({ hitCount }: { hitCount: number }) {
    const cracks = useMemo(() => {
        const lines: Array<{ d: string; opacity: number }> = [];
        if (hitCount >= 1) {
            lines.push(
                { d: 'M 50 50 L 30 20 L 15 5', opacity: 0.7 },
                { d: 'M 50 50 L 70 25 L 85 10', opacity: 0.6 },
                { d: 'M 50 50 L 25 55 L 5 60', opacity: 0.5 },
                { d: 'M 50 50 L 75 65 L 95 70', opacity: 0.6 },
                { d: 'M 50 50 L 45 80 L 40 95', opacity: 0.5 },
                { d: 'M 50 50 L 60 75 L 65 95', opacity: 0.4 },
            );
        }
        if (hitCount >= 2) {
            lines.push(
                { d: 'M 30 20 L 10 30 L 0 25', opacity: 0.6 },
                { d: 'M 70 25 L 90 20 L 100 30', opacity: 0.5 },
                { d: 'M 50 50 L 20 70 L 5 85', opacity: 0.5 },
                { d: 'M 50 50 L 80 45 L 100 50', opacity: 0.4 },
                { d: 'M 30 20 L 35 0', opacity: 0.5 },
                { d: 'M 75 65 L 90 80 L 100 95', opacity: 0.4 },
                { d: 'M 25 55 L 15 75 L 0 90', opacity: 0.5 },
                { d: 'M 70 25 L 55 5 L 50 0', opacity: 0.4 },
            );
        }
        return lines;
    }, [hitCount]);

    if (hitCount === 0) return null;

    return (
        <svg
            className="absolute inset-0 w-full h-full z-30 pointer-events-none"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
        >
            {cracks.map((crack, i) => (
                <motion.path
                    key={`crack-${hitCount}-${i}`}
                    d={crack.d}
                    stroke="rgba(255,255,255,0.8)"
                    strokeWidth="0.3"
                    fill="none"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: crack.opacity }}
                    transition={{ duration: 0.3, delay: i * 0.03, ease: 'easeOut' }}
                />
            ))}
            <motion.circle
                cx="50" cy="50" r="2"
                fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="0.2"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 0.6 }}
                transition={{ duration: 0.2 }}
            />
        </svg>
    );
}

function FloatingEmoji({ emoji, x, y, size, duration, delay }: Omit<FloatingEmojiData, 'id'>) {
    return (
        <motion.div
            className="absolute pointer-events-none select-none"
            style={{ left: `${x}%`, top: `${y}%`, fontSize: size, zIndex: 3 }}
            animate={{
                y: [0, -30, 10, -20, 0],
                x: [0, 15, -10, 8, 0],
                rotate: [0, 10, -8, 5, 0],
                scale: [1, 1.1, 0.95, 1.05, 1],
            }}
            transition={{ duration, delay, repeat: Infinity, ease: 'easeInOut' }}
        >
            {emoji}
        </motion.div>
    );
}

const HITS_TO_SHATTER = 3;

const EMOJIS: FloatingEmojiData[] = [
    { id: 0, emoji: '🍗', x: 8, y: 12, size: 28, duration: 8, delay: 0 },
    { id: 1, emoji: '🏈', x: 85, y: 18, size: 32, duration: 10, delay: 0.5 },
    { id: 2, emoji: '🔥', x: 12, y: 72, size: 26, duration: 9, delay: 1.2 },
    { id: 3, emoji: '🍗', x: 78, y: 65, size: 30, duration: 11, delay: 0.8 },
    { id: 4, emoji: '🏈', x: 45, y: 8, size: 24, duration: 7, delay: 2 },
    { id: 5, emoji: '🔥', x: 90, y: 45, size: 22, duration: 12, delay: 1.5 },
    { id: 6, emoji: '🍗', x: 5, y: 42, size: 20, duration: 9, delay: 3 },
    { id: 7, emoji: '🏈', x: 65, y: 85, size: 28, duration: 10, delay: 2.2 },
    { id: 8, emoji: '🔥', x: 35, y: 88, size: 24, duration: 8, delay: 0.3 },
    { id: 9, emoji: '🍗', x: 55, y: 30, size: 18, duration: 13, delay: 1 },
    { id: 10, emoji: '🏈', x: 20, y: 55, size: 26, duration: 11, delay: 2.5 },
    { id: 11, emoji: '🔥', x: 72, y: 10, size: 20, duration: 9, delay: 0.7 },
];

export function GlassBlitzEntrance({
    text = 'SUPER BOWL LX',
    subtext = 'WING COMMAND',
    heroImage = '/wing-hero.png',
    onComplete,
    children,
}: GlassBlitzEntranceProps) {
    const [phase, setPhase] = useState<'glass' | 'shattering' | 'done'>('glass');
    const [hitCount, setHitCount] = useState(0);

    // Mobile detection — reduce animation complexity to prevent Safari crashes
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const shards = useMemo(() => generateShards(isMobile ? 4 : 8, isMobile ? 4 : 8), [isMobile]);

    const handleClick = useCallback(() => {
        if (phase !== 'glass') return;
        const newHits = hitCount + 1;
        setHitCount(newHits);

        // Screen shake — skip on mobile (causes layout thrashing in Safari)
        if (!isMobile) {
            const body = document.body;
            const intensity = newHits * 3;
            body.style.transition = 'none';
            const frames = [
                `translate(${4 + intensity}px, ${-(3 + intensity)}px)`,
                `translate(${-(5 + intensity)}px, ${4 + intensity}px)`,
                `translate(${3 + intensity}px, ${-(2 + intensity)}px)`,
                '',
            ];
            let i = 0;
            const iv = setInterval(() => {
                body.style.transform = frames[i] || '';
                i++;
                if (i >= frames.length) { clearInterval(iv); body.style.transition = ''; }
            }, 35);
        }

        if (newHits >= HITS_TO_SHATTER) {
            setPhase('shattering');
            setTimeout(() => { setPhase('done'); onComplete?.(); }, 900);
        }
    }, [phase, hitCount, onComplete, isMobile]);

    const hitsRemaining = HITS_TO_SHATTER - hitCount;

    // ===== DONE — show children =====
    if (phase === 'done') {
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
                {children}
            </motion.div>
        );
    }

    // ===== SHATTERING — shards flying out =====
    // Mobile: 16 lightweight gradient shards (no img/overlays) to prevent Safari crash
    // Desktop: 64 gradient shards with 3D perspective for dramatic effect
    if (phase === 'shattering') {
        return (
            <div className="fixed inset-0 z-50 overflow-hidden"
                 style={isMobile ? undefined : { perspective: '1200px' }}>
                {shards.map((shard) => (
                    <motion.div
                        key={shard.id}
                        className="absolute inset-0"
                        style={{
                            clipPath: shard.clipPath,
                            background: 'linear-gradient(135deg, rgba(15,23,42,0.85), rgba(22,101,52,0.4))',
                        }}
                        initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
                        animate={{
                            x: shard.exitX, y: shard.exitY, opacity: 0,
                            rotate: shard.exitRotate, scale: shard.exitScale,
                        }}
                        transition={{ duration: 0.7, delay: shard.delay, ease: [0.36, 0, 0.66, -0.56] }}
                    />
                ))}
            </div>
        );
    }

    // ===== GLASS PANE — the main entrance (NO motion wrapper, SSR-visible) =====
    return (
        <div className="fixed inset-0 z-50 cursor-pointer select-none" onClick={handleClick}>
            {/* Hero background image — native img, no wrapper animation, immediately visible */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={heroImage}
                alt="Wing Command Hero"
                className="absolute inset-0 w-full h-full object-cover"
                style={{ objectPosition: 'center 40%' }}
                draggable={false}
            />

            {/* Night-time stadium atmospheric overlay */}
            <div className="absolute inset-0" style={{
                background: 'linear-gradient(180deg, rgba(15,23,42,0.35) 0%, rgba(22,101,52,0.2) 40%, rgba(15,23,42,0.45) 100%)',
            }} />

            {/* Glass reflective layer */}
            <div className="absolute inset-0" style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.02) 35%, rgba(249,115,22,0.05) 70%, rgba(255,255,255,0.08) 100%)',
            }} />

            {/* Glass border + inner glow */}
            <div className="absolute inset-0" style={{
                border: '3px solid rgba(255,255,255,0.08)',
                boxShadow: 'inset 0 0 100px rgba(22,163,74,0.06), inset 0 0 200px rgba(0,0,0,0.1)',
            }} />

            {/* Crack overlay */}
            <CrackOverlay hitCount={hitCount} />

            {/* Floating emojis */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 4 }}>
                {EMOJIS.map((fe) => (
                    <FloatingEmoji key={fe.id} emoji={fe.emoji} x={fe.x} y={fe.y}
                        size={fe.size} duration={fe.duration} delay={fe.delay} />
                ))}
            </div>

            {/* Title + CTA content — centered */}
            <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ zIndex: 5 }}>
                <motion.h1
                    className="font-heading text-5xl md:text-7xl lg:text-8xl tracking-[0.08em] text-white mb-2 text-center drop-shadow-lg px-4"
                    style={{
                        textShadow: '0 4px 30px rgba(0,0,0,0.8), 0 0 80px rgba(22,163,74,0.5), 0 0 120px rgba(22,163,74,0.25)',
                        WebkitTextStroke: '1px rgba(255,255,255,0.2)',
                    }}
                    initial={{ opacity: 0, y: -30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.7, type: 'spring', stiffness: 200 }}
                >
                    {text}
                </motion.h1>

                <motion.p
                    className="text-whistle-orange text-xl md:text-3xl tracking-[0.3em] font-heading text-center drop-shadow-lg"
                    style={{ textShadow: '0 2px 20px rgba(0,0,0,0.7), 0 0 40px rgba(249,115,22,0.5)' }}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.6, type: 'spring', stiffness: 200 }}
                >
                    {subtext}
                </motion.p>

                {/* Speech bubble — Coach Wing */}
                <motion.div
                    className="relative mt-8 rounded-2xl px-7 py-5 shadow-2xl max-w-[420px] text-center mx-4"
                    style={{
                        zIndex: 20,
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(240,253,244,0.95) 100%)',
                        border: '3px solid #16A34A',
                        backdropFilter: 'blur(10px)',
                        boxShadow: '0 8px 40px rgba(0,0,0,0.3), 0 0 20px rgba(22,163,74,0.15)',
                    }}
                    initial={{ opacity: 0, scale: 0.7, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: 0.8, type: 'spring', stiffness: 280, damping: 18 }}
                >
                    <p className="text-gray-800 text-base md:text-lg font-marker leading-relaxed">
                        🏈 Hosting a Super Bowl party?<br />
                        <span className="text-stadium-green font-bold text-lg md:text-xl">{"I'll find your wings!"}</span>{' '}
                        <span className="text-xl">🍗🔥</span>
                    </p>
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-5 h-5 rotate-45"
                        style={{
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(240,253,244,0.95) 100%)',
                            borderTop: '3px solid #16A34A', borderLeft: '3px solid #16A34A',
                        }}
                    />
                </motion.div>

                {/* CTA prompt + hit counter */}
                <motion.div
                    className="mt-8 flex flex-col items-center gap-2"
                    style={{ zIndex: 20 }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2 }}
                >
                    <motion.p
                        className="text-white text-sm md:text-base font-heading tracking-[0.2em]"
                        style={{ textShadow: '0 2px 12px rgba(0,0,0,0.7), 0 0 20px rgba(249,115,22,0.3)' }}
                        animate={{ opacity: [0.6, 1, 0.6] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    >
                        💥 TAP TO BREAK THE GLASS 💥
                    </motion.p>

                    {hitCount > 0 && (
                        <motion.div
                            className="flex gap-2 items-center"
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                        >
                            {Array.from({ length: 3 }).map((_, i) => (
                                <motion.div
                                    key={i}
                                    className={`w-3 h-3 rounded-full border-2 border-white/60 ${
                                        i < hitCount ? 'bg-whistle-orange' : 'bg-white/20'
                                    }`}
                                    animate={i < hitCount ? { scale: [1, 1.3, 1] } : {}}
                                    transition={{ duration: 0.3 }}
                                />
                            ))}
                            <span className="text-white/60 text-xs font-heading tracking-wider ml-2"
                                style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
                                {hitsRemaining} MORE
                            </span>
                        </motion.div>
                    )}
                </motion.div>
            </div>

            {/* Glass glare sweep */}
            <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{
                    zIndex: 6,
                    background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.08) 45%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.08) 55%, transparent 60%)',
                }}
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 4, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
            />
        </div>
    );
}
