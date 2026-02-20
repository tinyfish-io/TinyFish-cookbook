'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface Particle {
    id: number;
    x: number;
    y: number;
    size: number;
    duration: number;
    delay: number;
    type: 'wing' | 'confetti' | 'spark';
    emoji: string;
    rotation: number;
}

function generateParticles(count: number): Particle[] {
    const emojis = {
        wing: ['🍗', '🔥', '🏈'],
        confetti: ['🟢', '🟡', '✨'],
        spark: ['⚡', '💥', '🌟'],
    };

    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
        const type = i % 3 === 0 ? 'wing' : i % 3 === 1 ? 'confetti' : 'spark';
        const emojiArr = emojis[type];
        particles.push({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: type === 'wing' ? 24 + Math.random() * 16 : 12 + Math.random() * 12,
            duration: 4 + Math.random() * 6,
            delay: Math.random() * 3,
            type,
            emoji: emojiArr[Math.floor(Math.random() * emojiArr.length)],
            rotation: Math.random() * 360,
        });
    }
    return particles;
}

export function HeroVisuals() {
    const particles = useMemo(() => generateParticles(18), []);

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
            {/* Stadium radial spotlight */}
            <div className="absolute inset-0 bg-hero-gradient" />

            {/* Parallax field lines */}
            <motion.div
                className="absolute inset-0 opacity-[0.03]"
                animate={{ y: [0, -20, 0] }}
                transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
            >
                {/* Horizontal yard lines */}
                {[...Array(8)].map((_, i) => (
                    <div
                        key={`line-${i}`}
                        className="absolute left-0 right-0 h-px bg-neon-green"
                        style={{ top: `${12 + i * 12}%` }}
                    />
                ))}
            </motion.div>

            {/* Floating particles */}
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
                        y: [0, -30, 10, -15, 0],
                        x: [0, 10, -5, 8, 0],
                        rotate: [particle.rotation, particle.rotation + 20, particle.rotation - 10, particle.rotation + 15, particle.rotation],
                        opacity: [0.15, 0.35, 0.2, 0.3, 0.15],
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

            {/* Large hero wing — center focus */}
            <motion.div
                className="absolute left-1/2 top-[15%] -translate-x-1/2 text-[80px] md:text-[120px] opacity-[0.06]"
                animate={{
                    y: [0, -15, 0],
                    rotate: [0, 3, -3, 0],
                    scale: [1, 1.02, 1],
                }}
                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            >
                🏈
            </motion.div>

            {/* Left quarterback silhouette glow */}
            <motion.div
                className="absolute left-[5%] bottom-[10%] w-32 h-48 md:w-48 md:h-64 rounded-full opacity-[0.04]"
                style={{
                    background: 'radial-gradient(ellipse, rgba(57, 255, 20, 0.3) 0%, transparent 70%)',
                }}
                animate={{ y: [0, -10, 0], opacity: [0.04, 0.07, 0.04] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Right quarterback silhouette glow */}
            <motion.div
                className="absolute right-[5%] bottom-[10%] w-32 h-48 md:w-48 md:h-64 rounded-full opacity-[0.04]"
                style={{
                    background: 'radial-gradient(ellipse, rgba(57, 255, 20, 0.3) 0%, transparent 70%)',
                }}
                animate={{ y: [0, -12, 0], opacity: [0.04, 0.06, 0.04] }}
                transition={{ duration: 7, delay: 1, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Bottom fade to black */}
            <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-turf-black to-transparent" />
        </div>
    );
}
