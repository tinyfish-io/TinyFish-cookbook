'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import Image from 'next/image';
import { FlavorPersona } from '@/lib/types';

/**
 * Mascot expression states — each maps to a unique illustration:
 * - neutral: Serious/angry brows (landing state)
 * - happy: Thumbs up, big grin (classicist / default after selection)
 * - heat: Sweating, bloodshot eyes, steam (face-melter)
 * - drool: Tongue out, dripping sauce (sticky-finger)
 */
type MascotState = 'neutral' | 'heat' | 'happy' | 'drool';

function getMascotState(flavor: FlavorPersona | null, hasResults: boolean, isSearching: boolean): MascotState {
    if (flavor === 'face-melter') return 'heat';
    if (flavor === 'sticky-finger') return 'drool';
    if (flavor === 'classicist') return 'happy';
    if (hasResults) return 'happy';
    return 'neutral';
}

function getMascotImage(state: MascotState): string {
    switch (state) {
        case 'neutral': return '/coach-neutral.png';
        case 'heat': return '/coach-heat.png';
        case 'happy': return '/coach-happy.png';
        case 'drool': return '/coach-drool.png';
    }
}

function getMascotLabel(state: MascotState): string | null {
    switch (state) {
        case 'heat': return '* sweating intensifies *';
        case 'drool': return '* drooling *';
        case 'happy': return '* let\'s gooo *';
        case 'neutral': return null;
    }
}

function getMascotLabelColor(state: MascotState): string {
    switch (state) {
        case 'heat': return 'text-red-500/60';
        case 'drool': return 'text-yellow-600/60';
        case 'happy': return 'text-white/60';
        default: return 'text-chalk-light/50';
    }
}

function getGlowGradient(state: MascotState): string {
    switch (state) {
        case 'heat': return 'radial-gradient(circle, rgba(239,68,68,0.3), transparent 70%)';
        case 'happy': return 'radial-gradient(circle, rgba(22,163,74,0.25), transparent 70%)';
        case 'drool': return 'radial-gradient(circle, rgba(234,179,8,0.25), transparent 70%)';
        default: return 'radial-gradient(circle, rgba(107,114,128,0.1), transparent 70%)';
    }
}

// ===== Fire/Steam Particles for Heat State =====
function HeatParticles() {
    const particles = useMemo(() =>
        Array.from({ length: 10 }, (_, i) => ({
            id: i,
            x: 30 + Math.random() * 40, // Cluster around center
            size: 4 + Math.random() * 8,
            delay: Math.random() * 2,
            duration: 1.5 + Math.random() * 1.5,
            color: Math.random() > 0.5 ? '#EF4444' : '#F97316',
        })),
    []);

    return (
        <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
            {particles.map((p) => (
                <motion.div
                    key={p.id}
                    className="absolute rounded-full"
                    style={{
                        left: `${p.x}%`,
                        bottom: '20%',
                        width: p.size,
                        height: p.size,
                        background: p.color,
                        filter: 'blur(1px)',
                    }}
                    animate={{
                        y: [-10, -120 - Math.random() * 80],
                        x: [(Math.random() - 0.5) * 20, (Math.random() - 0.5) * 60],
                        opacity: [0, 0.7, 0],
                        scale: [0.5, 1.2, 0.3],
                    }}
                    transition={{
                        duration: p.duration,
                        delay: p.delay,
                        repeat: Infinity,
                        ease: 'easeOut',
                    }}
                />
            ))}
        </div>
    );
}

// ===== Sauce Drip + Splatter for Drool State =====
function SauceDrip() {
    const splatters = useMemo(() =>
        Array.from({ length: 5 }, (_, i) => ({
            id: i,
            x: 25 + Math.random() * 50,
            y: 40 + Math.random() * 40,
            delay: 0.5 + Math.random() * 2,
            size: 6 + Math.random() * 10,
        })),
    []);

    return (
        <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
            {/* Animated SVG drip from mouth area */}
            <svg
                className="absolute left-1/2 -translate-x-1/2"
                style={{ top: '55%' }}
                width="40"
                height="80"
                viewBox="0 0 40 80"
                fill="none"
            >
                <motion.path
                    d="M20 0 C20 0, 20 20, 18 35 C16 50, 20 60, 20 70 C20 75, 22 78, 20 80"
                    stroke="#D97706"
                    strokeWidth="4"
                    strokeLinecap="round"
                    fill="none"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{
                        pathLength: [0, 1, 1, 0],
                        opacity: [0, 0.6, 0.6, 0],
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                />
                {/* Drip droplet at bottom */}
                <motion.circle
                    cx="20"
                    cy="78"
                    r="4"
                    fill="#D97706"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{
                        opacity: [0, 0, 0.6, 0.6, 0],
                        scale: [0, 0, 1, 1.3, 0],
                        y: [0, 0, 0, 15, 30],
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                />
            </svg>

            {/* Sauce splatters */}
            {splatters.map((s) => (
                <motion.div
                    key={s.id}
                    className="absolute rounded-full"
                    style={{
                        left: `${s.x}%`,
                        top: `${s.y}%`,
                        width: s.size,
                        height: s.size,
                        background: 'radial-gradient(circle, #D97706, #92400E)',
                    }}
                    animate={{
                        scale: [0, 1.4, 1, 0.8, 0],
                        opacity: [0, 0.5, 0.4, 0.3, 0],
                    }}
                    transition={{
                        duration: 2,
                        delay: s.delay,
                        repeat: Infinity,
                        ease: 'easeOut',
                    }}
                />
            ))}
        </div>
    );
}

// ===== Heat Haze Distortion Filter =====
function HeatHazeOverlay() {
    return (
        <div className="absolute inset-[-10%] pointer-events-none z-20" style={{ opacity: 0.2 }}>
            {/* Inline SVG filter for heat haze distortion */}
            <svg className="absolute w-0 h-0">
                <defs>
                    <filter id="heat-haze-filter">
                        <feTurbulence
                            type="fractalNoise"
                            baseFrequency="0.015 0.02"
                            numOctaves="3"
                            seed="2"
                            result="noise"
                        >
                            <animate
                                attributeName="baseFrequency"
                                values="0.015 0.02;0.02 0.025;0.015 0.02"
                                dur="4s"
                                repeatCount="indefinite"
                            />
                        </feTurbulence>
                        <feDisplacementMap
                            in="SourceGraphic"
                            in2="noise"
                            scale="12"
                            xChannelSelector="R"
                            yChannelSelector="G"
                        />
                    </filter>
                </defs>
            </svg>
            <div
                className="w-full h-full"
                style={{
                    filter: 'url(#heat-haze-filter)',
                    background: 'radial-gradient(circle, rgba(239,68,68,0.08) 0%, transparent 60%)',
                }}
            />
        </div>
    );
}

interface CoachWingMascotProps {
    flavor: FlavorPersona | null;
    hasResults?: boolean;
    isSearching?: boolean;
    speechBubble?: string;
}

export function CoachWingMascot({ flavor, hasResults = false, isSearching = false, speechBubble }: CoachWingMascotProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mascotState = getMascotState(flavor, hasResults, isSearching);
    const label = getMascotLabel(mascotState);

    // Subtle mouse-follow tilt
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const springConfig = { damping: 30, stiffness: 100, mass: 0.5 };
    const smoothX = useSpring(mouseX, springConfig);
    const smoothY = useSpring(mouseY, springConfig);
    const tiltX = useTransform(smoothY, [-1, 1], [5, -5]);
    const tiltY = useTransform(smoothX, [-1, 1], [-5, 5]);

    useEffect(() => {
        function handleMouseMove(e: MouseEvent) {
            const nx = (e.clientX / window.innerWidth) * 2 - 1;
            const ny = (e.clientY / window.innerHeight) * 2 - 1;
            mouseX.set(nx);
            mouseY.set(ny);
        }
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [mouseX, mouseY]);

    // CRANKED idle breathing — bigger float, more rotation
    const breatheVariants = {
        idle: {
            y: [0, -14, 0],
            rotate: [0, 2.5, -1.5, 0],
            transition: {
                duration: 4,
                repeat: Infinity,
                ease: 'easeInOut',
            },
        },
    };

    // CRANKED heat shake — more intense
    const heatShake = {
        x: [0, -4, 4, -4, 4, -2, 2, 0],
        transition: {
            duration: 0.4,
            repeat: Infinity,
            repeatDelay: 1,
        },
    };

    return (
        <div ref={containerRef} className="relative flex flex-col items-center select-none">
            {/* Speech bubble */}
            <AnimatePresence mode="wait">
                {speechBubble && (
                    <motion.div
                        className="absolute -top-16 md:-top-12 left-1/2 -translate-x-1/2 z-20
                                   bg-white rounded-2xl px-5 py-3 shadow-lg border-2 border-gray-200
                                   max-w-[300px] md:max-w-[340px] text-center"
                        key={speechBubble}
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -5, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    >
                        <p className="text-gray-700 text-sm md:text-base font-marker leading-snug">{speechBubble}</p>
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-r-2 border-b-2 border-gray-200 rotate-45" />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Perspective wrapper */}
            <div style={{ perspective: 800 }} className="relative">
                {/* Heat haze overlay — renders behind/around mascot */}
                <AnimatePresence>
                    {mascotState === 'heat' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <HeatHazeOverlay />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Heat particles */}
                <AnimatePresence>
                    {mascotState === 'heat' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <HeatParticles />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Sauce drip + splatters */}
                <AnimatePresence>
                    {mascotState === 'drool' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <SauceDrip />
                        </motion.div>
                    )}
                </AnimatePresence>

                <motion.div
                    className="relative w-[320px] h-[280px] md:w-[520px] md:h-[440px] lg:w-[560px] lg:h-[480px]"
                    variants={breatheVariants}
                    animate="idle"
                    style={{
                        rotateX: tiltX,
                        rotateY: tiltY,
                        transformStyle: 'preserve-3d',
                    }}
                >
                    {/* Glow effect behind mascot */}
                    <motion.div
                        className="absolute inset-[-20%] -z-10 blur-3xl opacity-40"
                        style={{ background: getGlowGradient(mascotState) }}
                        key={`glow-${mascotState}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.5 }}
                        transition={{ duration: 0.5 }}
                    />

                    {/* Ground shadow — soft elliptical shadow to anchor mascot to turf */}
                    <div
                        className="absolute bottom-[-5%] left-[10%] right-[10%] h-[20%] -z-5"
                        style={{
                            background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.15) 40%, transparent 70%)',
                            filter: 'blur(20px)',
                        }}
                    />

                    {/* Animated mascot image swap */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={mascotState}
                            className="absolute inset-0"
                            initial={{ opacity: 0, scale: 0.9, rotate: -3 }}
                            animate={{
                                opacity: 1,
                                scale: 1,
                                rotate: 0,
                                ...(mascotState === 'heat' ? heatShake : {}),
                            }}
                            exit={{ opacity: 0, scale: 0.95, rotate: 3 }}
                            transition={{ duration: 0.35, ease: 'easeOut' }}
                        >
                            {/* Rim lighting — subtle white outer glow mimicking stadium floodlights */}
                            <div
                                className="absolute inset-0"
                                style={{
                                    filter: 'drop-shadow(0 0 3px rgba(255,255,255,0.25)) drop-shadow(0 -2px 6px rgba(255,255,255,0.15))',
                                }}
                            >
                                <Image
                                    src={getMascotImage(mascotState)}
                                    alt={`Coach Wing — ${mascotState} expression`}
                                    fill
                                    sizes="(max-width: 768px) 320px, (max-width: 1024px) 520px, 560px"
                                    className="object-contain"
                                    priority
                                />
                            </div>

                            {/* Atmospheric haze — very low opacity cool-tone overlay to match stadium atmosphere */}
                            <div
                                className="absolute inset-0 pointer-events-none"
                                style={{
                                    background: 'linear-gradient(180deg, rgba(22,101,52,0.06) 0%, rgba(15,23,42,0.08) 100%)',
                                    mixBlendMode: 'multiply',
                                }}
                            />
                        </motion.div>
                    </AnimatePresence>
                </motion.div>
            </div>

            {/* State label under mascot */}
            <AnimatePresence mode="wait">
                {label && (
                    <motion.div
                        className="mt-2 text-center"
                        key={label}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.3 }}
                    >
                        <span className={`text-sm font-marker ${getMascotLabelColor(mascotState)}`}>
                            {label}
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
