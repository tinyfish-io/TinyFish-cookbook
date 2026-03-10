'use client';

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BannerBreakProps {
    /** Text on the banner before it shatters */
    text?: string;
    /** Subtext below the main text */
    subtext?: string;
    /** Called when shatter animation completes */
    onComplete?: () => void;
    children?: React.ReactNode;
}

// Jagged SVG tear mark component
function TearMark({ x, y, rotation }: { x: number; y: number; rotation: number }) {
    return (
        <motion.svg
            className="absolute pointer-events-none z-20"
            style={{ left: x - 30, top: y - 40 }}
            width="60"
            height="80"
            viewBox="0 0 60 80"
            initial={{ opacity: 0, scale: 0, rotate: rotation - 15 }}
            animate={{ opacity: 1, scale: 1, rotate: rotation }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
        >
            {/* Jagged tear crack lines */}
            <path
                d="M30 0 L28 12 L34 18 L26 28 L36 35 L24 45 L38 52 L22 62 L32 70 L28 80"
                fill="none"
                stroke="#1F2937"
                strokeWidth="2.5"
                strokeLinecap="round"
                opacity="0.6"
            />
            <path
                d="M30 10 L22 16 L18 28"
                fill="none"
                stroke="#1F2937"
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity="0.4"
            />
            <path
                d="M26 30 L38 38 L42 50"
                fill="none"
                stroke="#1F2937"
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity="0.4"
            />
        </motion.svg>
    );
}

// Generate shard positions for the 4x4 grid
function generateShards(cols: number, rows: number) {
    const shards: Array<{
        id: number;
        col: number;
        row: number;
        exitX: number;
        exitY: number;
        exitRotate: number;
        exitRotateY: number;
        delay: number;
    }> = [];

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const centerCol = (cols - 1) / 2;
            const centerRow = (rows - 1) / 2;
            const dx = c - centerCol;
            const dy = r - centerRow;

            shards.push({
                id: r * cols + c,
                col: c,
                row: r,
                exitX: dx * (120 + Math.random() * 80) * (1 + Math.random()),
                exitY: dy * (100 + Math.random() * 60) * (1 + Math.random()) + (Math.random() - 0.5) * 100,
                exitRotate: (Math.random() - 0.5) * 120,
                exitRotateY: (Math.random() - 0.5) * 90,
                delay: Math.random() * 0.06,
            });
        }
    }

    return shards;
}

export function BannerBreak({
    text = 'WING SCOUT',
    subtext = 'SUPER BOWL LX EDITION',
    onComplete,
    children,
}: BannerBreakProps) {
    const [hits, setHits] = useState(0);
    const [phase, setPhase] = useState<'banner' | 'shattering' | 'done'>('banner');
    const [tearMarks, setTearMarks] = useState<Array<{ x: number; y: number; rotation: number }>>([]);
    const bannerRef = useRef<HTMLDivElement>(null);

    const COLS = 4;
    const ROWS = 4;
    const shards = useMemo(() => generateShards(COLS, ROWS), []);

    const handleBannerClick = useCallback((e: React.MouseEvent) => {
        if (phase !== 'banner') return;

        const rect = bannerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        const nextHits = hits + 1;

        if (nextHits < 3) {
            // Hits 1 & 2: shake + tear mark
            setTearMarks(prev => [...prev, {
                x: clickX,
                y: clickY,
                rotation: (Math.random() - 0.5) * 40,
            }]);
            setHits(nextHits);
        } else {
            // Hit 3: SHATTER
            setHits(nextHits);
            setPhase('shattering');

            // Complete after shatter animation
            setTimeout(() => {
                setPhase('done');
                onComplete?.();
            }, 750);
        }
    }, [hits, phase, onComplete]);

    // Shake intensity based on hit count
    const shakeVariants = {
        idle: { x: 0, y: 0, rotate: 0 },
        hit1: {
            x: [0, -8, 10, -6, 4, -2, 0],
            y: [0, 4, -6, 3, -2, 0],
            rotate: [0, -1, 1.5, -0.8, 0.4, 0],
            transition: { duration: 0.5, ease: 'easeOut' },
        },
        hit2: {
            x: [0, -14, 18, -12, 8, -4, 2, 0],
            y: [0, 8, -10, 6, -4, 2, 0],
            rotate: [0, -2, 3, -1.5, 0.8, -0.3, 0],
            transition: { duration: 0.6, ease: 'easeOut' },
        },
    };

    const getShakeKey = () => {
        if (hits === 0) return 'idle';
        if (hits === 1) return 'hit1';
        return 'hit2';
    };

    return (
        <div className="relative w-full min-h-screen overflow-hidden">
            {/* Content behind the banner */}
            <motion.div
                className="relative z-0"
                initial={{ opacity: 0 }}
                animate={phase === 'done' ? { opacity: 1 } : { opacity: 0 }}
                transition={{ duration: 0.5 }}
            >
                {children}
            </motion.div>

            {/* The Banner Overlay */}
            <AnimatePresence>
                {phase !== 'done' && (
                    <div className="fixed inset-0 z-50">
                        {/* Shatter mode: 4x4 grid of shards */}
                        {phase === 'shattering' ? (
                            <div className="relative w-full h-full" style={{ perspective: '1200px' }}>
                                {shards.map((shard) => {
                                    const widthPct = 100 / COLS;
                                    const heightPct = 100 / ROWS;

                                    return (
                                        <motion.div
                                            key={shard.id}
                                            className="absolute overflow-hidden"
                                            style={{
                                                left: `${shard.col * widthPct}%`,
                                                top: `${shard.row * heightPct}%`,
                                                width: `${widthPct}%`,
                                                height: `${heightPct}%`,
                                            }}
                                            initial={{ x: 0, y: 0, opacity: 1, rotate: 0, rotateY: 0 }}
                                            animate={{
                                                x: shard.exitX,
                                                y: shard.exitY,
                                                opacity: 0,
                                                rotate: shard.exitRotate,
                                                rotateY: shard.exitRotateY,
                                                scale: 0.6,
                                            }}
                                            transition={{
                                                duration: 0.7,
                                                delay: shard.delay,
                                                ease: [0.36, 0, 0.66, -0.56],
                                            }}
                                        >
                                            {/* Each shard clips the full banner content */}
                                            <div
                                                className="w-screen h-screen bg-gradient-to-br from-amber-50 via-amber-100/80 to-amber-50"
                                                style={{
                                                    marginLeft: `-${shard.col * widthPct}vw`,
                                                    marginTop: `-${shard.row * heightPct}vh`,
                                                    width: '100vw',
                                                    height: '100vh',
                                                }}
                                            >
                                                {/* Subtle paper texture */}
                                                <div
                                                    className="absolute inset-0"
                                                    style={{
                                                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Ctext x='10' y='20' font-size='12' fill='%2316A34A' opacity='0.04'%3EX%3C/text%3E%3Ccircle cx='45' cy='40' r='6' stroke='%2316A34A' fill='none' stroke-width='1' opacity='0.04'/%3E%3C/svg%3E")`,
                                                        backgroundSize: '60px 60px',
                                                    }}
                                                />

                                                {/* Text inside shards */}
                                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                    <h1 className="font-heading text-5xl md:text-7xl lg:text-8xl tracking-[0.08em] text-stadium-green">
                                                        {text}
                                                    </h1>
                                                    <p className="text-stadium-green/60 text-sm md:text-lg tracking-[0.3em] font-heading mt-2">
                                                        {subtext}
                                                    </p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        ) : (
                            /* Normal banner (pre-shatter) */
                            <motion.div
                                ref={bannerRef}
                                className="w-full h-full bg-gradient-to-br from-amber-50 via-amber-100/80 to-amber-50 cursor-pointer relative select-none"
                                onClick={handleBannerClick}
                                variants={shakeVariants}
                                animate={getShakeKey()}
                                key={`shake-${hits}`}
                            >
                                {/* Paper texture */}
                                <div
                                    className="absolute inset-0 pointer-events-none"
                                    style={{
                                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Ctext x='10' y='20' font-size='12' fill='%2316A34A' opacity='0.04'%3EX%3C/text%3E%3Ccircle cx='45' cy='40' r='6' stroke='%2316A34A' fill='none' stroke-width='1' opacity='0.04'/%3E%3C/svg%3E")`,
                                        backgroundSize: '60px 60px',
                                    }}
                                />

                                {/* Decorative tape strips */}
                                <div className="absolute top-[20%] left-[15%] w-20 h-6 bg-whistle-orange/20 rotate-12 rounded-sm" />
                                <div className="absolute top-[18%] right-[12%] w-16 h-5 bg-whistle-orange/15 -rotate-6 rounded-sm" />
                                <div className="absolute bottom-[22%] left-[20%] w-14 h-5 bg-stadium-green/10 rotate-3 rounded-sm" />
                                <div className="absolute bottom-[15%] right-[18%] w-12 h-4 bg-whistle-orange/10 -rotate-2 rounded-sm" />

                                {/* Tear marks from previous hits */}
                                {tearMarks.map((mark, i) => (
                                    <TearMark key={i} x={mark.x} y={mark.y} rotation={mark.rotation} />
                                ))}

                                {/* Center content */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <motion.h1
                                        className="font-heading text-5xl md:text-7xl lg:text-8xl tracking-[0.08em] text-stadium-green"
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.4 }}
                                    >
                                        {text}
                                    </motion.h1>
                                    <motion.p
                                        className="text-stadium-green/60 text-sm md:text-lg tracking-[0.3em] font-heading mt-2"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.4 }}
                                    >
                                        {subtext}
                                    </motion.p>

                                    {/* Click prompt */}
                                    <motion.div
                                        className="mt-8"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.8 }}
                                    >
                                        <motion.p
                                            className="text-stadium-green/40 text-xs md:text-sm font-marker tracking-wider"
                                            animate={{ opacity: [0.4, 1, 0.4] }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                        >
                                            {hits === 0 && '👆 TAP TO BREAK THROUGH'}
                                            {hits === 1 && '💥 HARDER! TAP AGAIN!'}
                                            {hits === 2 && '🔥 ONE MORE HIT — BLITZ IT!'}
                                        </motion.p>
                                    </motion.div>

                                    {/* Hit counter */}
                                    {hits > 0 && (
                                        <motion.div
                                            className="absolute bottom-[15%] flex items-center gap-2"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                        >
                                            {[0, 1, 2].map((i) => (
                                                <motion.div
                                                    key={i}
                                                    className={`w-3 h-3 rounded-full border-2 ${
                                                        i < hits
                                                            ? 'bg-whistle-orange border-whistle-orange'
                                                            : 'bg-transparent border-stadium-green/30'
                                                    }`}
                                                    initial={i < hits ? { scale: 0 } : {}}
                                                    animate={i < hits ? { scale: 1 } : {}}
                                                    transition={{ type: 'spring', stiffness: 500 }}
                                                />
                                            ))}
                                        </motion.div>
                                    )}

                                    {/* Crack overlay as hits increase */}
                                    {hits >= 2 && (
                                        <motion.div
                                            className="absolute inset-0 pointer-events-none"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 0.3 }}
                                        >
                                            <svg className="w-full h-full" viewBox="0 0 1000 600" preserveAspectRatio="none">
                                                <path
                                                    d="M500 0 L490 80 L510 130 L485 200 L515 270 L480 340 L520 400 L490 480 L510 550 L500 600"
                                                    fill="none"
                                                    stroke="#1F2937"
                                                    strokeWidth="1.5"
                                                    strokeLinecap="round"
                                                />
                                                <path
                                                    d="M0 300 L100 290 L180 310 L280 285 L360 315 L450 290 L500 300 L550 310 L640 285 L720 315 L820 290 L900 310 L1000 300"
                                                    fill="none"
                                                    stroke="#1F2937"
                                                    strokeWidth="1.5"
                                                    strokeLinecap="round"
                                                />
                                            </svg>
                                        </motion.div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
