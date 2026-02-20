'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { FlavorPersona } from '@/lib/types';

interface Particle {
    id: number;
    x: number;
    y: number;
    size: number;
    duration: number;
    delay: number;
    type: 'wing' | 'celery' | 'ranch' | 'football' | 'spark';
    emoji: string;
    rotation: number;
}

function generateParticles(count: number): Particle[] {
    const emojis: Record<Particle['type'], string[]> = {
        wing: ['🍗', '🍗', '🍗'],
        celery: ['🥒', '🥬'],
        ranch: ['💧', '🫗'],
        football: ['🏈', '🏈'],
        spark: ['💥', '⚡', '🔥', '✨'],
    };

    const types: Particle['type'][] = ['wing', 'wing', 'celery', 'ranch', 'football', 'spark', 'spark', 'wing'];
    const particles: Particle[] = [];

    for (let i = 0; i < count; i++) {
        const type = types[i % types.length];
        const emojiArr = emojis[type];
        particles.push({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: type === 'wing' ? 28 + Math.random() * 18 : type === 'football' ? 22 + Math.random() * 10 : 14 + Math.random() * 10,
            duration: 5 + Math.random() * 8,
            delay: Math.random() * 4,
            type,
            emoji: emojiArr[Math.floor(Math.random() * emojiArr.length)],
            rotation: Math.random() * 360,
        });
    }
    return particles;
}

interface ComicHeroProps {
    flavor: FlavorPersona | null;
}

export function ComicHero({ flavor }: ComicHeroProps) {
    const particles = useMemo(() => generateParticles(22), []);
    const isHot = flavor === 'face-melter';

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
            {/* Layer 0: Stadium crowd texture (dark gradient base) */}
            <div className="absolute inset-0">
                {/* Stadium crowd silhouette band */}
                <div className="absolute bottom-0 left-0 right-0 h-[30%] opacity-[0.04]"
                    style={{
                        background: `
                            repeating-linear-gradient(90deg,
                                transparent 0px,
                                transparent 8px,
                                rgba(255,255,255,0.3) 8px,
                                rgba(255,255,255,0.3) 10px
                            )
                        `,
                        maskImage: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)',
                        WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)',
                    }}
                />
                {/* Stadium floodlights */}
                <div className="absolute top-0 left-[15%] w-32 h-[60%] opacity-[0.03]"
                    style={{
                        background: 'linear-gradient(180deg, rgba(57,255,20,0.4) 0%, transparent 100%)',
                        filter: 'blur(30px)',
                    }}
                />
                <div className="absolute top-0 right-[15%] w-32 h-[60%] opacity-[0.03]"
                    style={{
                        background: 'linear-gradient(180deg, rgba(57,255,20,0.4) 0%, transparent 100%)',
                        filter: 'blur(30px)',
                    }}
                />
            </div>

            {/* Layer 0.5: Halftone dot overlay (comic book texture) */}
            <div
                className="absolute inset-0 opacity-30 animate-halftone-pulse"
                style={{
                    backgroundImage: 'radial-gradient(circle, rgba(57,255,20,0.04) 1px, transparent 1px)',
                    backgroundSize: '8px 8px',
                }}
            />

            {/* Layer 1: The "Wing-plosion" — Comic book player crashing through wall */}
            <motion.div
                className="absolute left-0 md:left-[2%] top-[5%] md:top-[2%] w-[55%] md:w-[45%] h-[70%] md:h-[80%]"
                animate={{
                    scale: [1, 1.02, 0.99, 1.01, 1],
                    x: [0, 3, -2, 1, 0],
                }}
                transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
            >
                <Image
                    src="/wingplosion.png"
                    alt="Wing-plosion! Player bursting through wall with chicken wings"
                    fill
                    className="object-contain object-left-top opacity-[0.18] md:opacity-[0.22]"
                    style={{
                        filter: isHot ? 'hue-rotate(-10deg) saturate(1.3) brightness(1.1)' : 'none',
                        maskImage: 'linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 60%, transparent 100%)',
                        WebkitMaskImage: 'linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 60%, transparent 100%)',
                    }}
                    priority
                />
            </motion.div>

            {/* Speed lines behind wing-plosion */}
            <div className="absolute inset-0 speed-lines-bg" />

            {/* Layer 1.5: Parallax field lines (yard markers) */}
            <motion.div
                className="absolute inset-0 opacity-[0.03]"
                animate={{ y: [0, -20, 0] }}
                transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
            >
                {[...Array(8)].map((_, i) => (
                    <div
                        key={`yard-${i}`}
                        className="absolute left-0 right-0 h-px bg-neon-green"
                        style={{ top: `${12 + i * 12}%` }}
                    />
                ))}
            </motion.div>

            {/* Layer 2: Floating particles (wings, celery, ranch, footballs, sparks) */}
            {particles.map((particle) => (
                <motion.div
                    key={particle.id}
                    className="absolute select-none"
                    style={{
                        left: `${particle.x}%`,
                        top: `${particle.y}%`,
                        fontSize: particle.size,
                    }}
                    animate={{
                        y: [0, -35, 15, -20, 0],
                        x: [0, 12, -8, 10, 0],
                        rotate: [particle.rotation, particle.rotation + 25, particle.rotation - 15, particle.rotation + 20, particle.rotation],
                        opacity: [0.12, 0.35, 0.18, 0.28, 0.12],
                    }}
                    transition={{
                        duration: particle.duration,
                        delay: particle.delay,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                >
                    {particle.emoji}
                </motion.div>
            ))}

            {/* Layer 3: Coach Wing Mascot — real image, top-right */}
            <motion.div
                className="absolute right-[2%] top-[5%] md:right-[5%] md:top-[3%] w-[120px] h-[120px] md:w-[200px] md:h-[200px] select-none"
                animate={{
                    y: [0, -10, 5, -7, 0],
                    rotate: [0, 3, -2, 4, 0],
                    scale: [1, 1.03, 0.98, 1.02, 1],
                }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            >
                <Image
                    src="/coach-wing.png"
                    alt="Coach Wing — chicken wing with football helmet mascot"
                    fill
                    className="object-contain drop-shadow-[0_0_30px_rgba(57,255,20,0.15)]"
                    style={{
                        filter: isHot ? 'hue-rotate(-15deg) saturate(1.5) brightness(1.1) drop-shadow(0 0 20px rgba(255,69,0,0.3))' : 'drop-shadow(0 0 20px rgba(57,255,20,0.2))',
                    }}
                    priority
                />
            </motion.div>

            {/* Quarterback silhouette glows */}
            <motion.div
                className="absolute left-[3%] bottom-[8%] w-28 h-40 md:w-44 md:h-56 rounded-full opacity-[0.04]"
                style={{
                    background: `radial-gradient(ellipse, ${isHot ? 'rgba(255, 69, 0, 0.3)' : 'rgba(57, 255, 20, 0.3)'} 0%, transparent 70%)`,
                }}
                animate={{ y: [0, -10, 0], opacity: [0.04, 0.07, 0.04] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
                className="absolute right-[3%] bottom-[8%] w-28 h-40 md:w-44 md:h-56 rounded-full opacity-[0.04]"
                style={{
                    background: `radial-gradient(ellipse, ${isHot ? 'rgba(255, 69, 0, 0.3)' : 'rgba(57, 255, 20, 0.3)'} 0%, transparent 70%)`,
                }}
                animate={{ y: [0, -12, 0], opacity: [0.04, 0.06, 0.04] }}
                transition={{ duration: 7, delay: 1, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Bottom fade to black */}
            <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#050505] to-transparent" />

            {/* Top vignette */}
            <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-[#050505]/60 to-transparent" />

            {/* Stadium spotlight (hero gradient) */}
            <div className="absolute inset-0 bg-hero-gradient" />
        </div>
    );
}
