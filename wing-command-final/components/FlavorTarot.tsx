'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Shield, Droplets, Check } from 'lucide-react';
import { FlavorPersona } from '@/lib/types';

interface FlavorTarotProps {
    selected: FlavorPersona | null;
    onSelect: (flavor: FlavorPersona) => void;
}

interface ClipboardCardData {
    id: FlavorPersona;
    title: string;
    subtitle: string;
    tagline: string;
    emoji: string;
    icon: React.ReactNode;
    accentColor: string;
    bgColor: string;
    borderColor: string;
}

const CLIPBOARD_CARDS: ClipboardCardData[] = [
    {
        id: 'face-melter',
        title: 'HAIL MARY',
        subtitle: 'Habanero / Ghost Pepper / Reaper',
        tagline: '"I want to cry."',
        emoji: '🔥',
        icon: <Flame className="w-5 h-5" />,
        accentColor: '#DC2626',
        bgColor: 'rgba(220, 38, 38, 0.06)',
        borderColor: 'rgba(220, 38, 38, 0.3)',
    },
    {
        id: 'classicist',
        title: 'MILD PLAY',
        subtitle: 'Buffalo / Hot / Mild / Medium',
        tagline: '"Mild/Medium. I have work tomorrow."',
        emoji: '🛡️',
        icon: <Shield className="w-5 h-5" />,
        accentColor: '#F97316',
        bgColor: 'rgba(249, 115, 22, 0.06)',
        borderColor: 'rgba(249, 115, 22, 0.3)',
    },
    {
        id: 'sticky-finger',
        title: 'SAUCY PLAY',
        subtitle: 'BBQ / Garlic Parm / Teriyaki',
        tagline: '"No napkins allowed."',
        emoji: '🍯',
        icon: <Droplets className="w-5 h-5" />,
        accentColor: '#EAB308',
        bgColor: 'rgba(234, 179, 8, 0.06)',
        borderColor: 'rgba(234, 179, 8, 0.3)',
    },
];

export function FlavorTarot({ selected, onSelect }: FlavorTarotProps) {
    return (
        <div className="w-full max-w-2xl mx-auto">
            {/* Section header */}
            <motion.div
                className="text-center mb-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <h3 className="font-heading text-xl md:text-2xl tracking-[0.12em] text-chalk-dark uppercase">
                    Choose Your Flavour Play
                </h3>
                <p className="text-chalk-light text-xs mt-1 font-marker">
                    Pick your flavour persona, rookie.
                </p>
            </motion.div>

            {/* Clipboard Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
                {CLIPBOARD_CARDS.map((card, index) => {
                    const isSelected = selected === card.id;

                    return (
                        <motion.button
                            key={card.id}
                            onClick={() => onSelect(card.id)}
                            className={`
                                clipboard-card relative flex flex-col items-center gap-3 p-5 md:p-6 pt-7
                                cursor-pointer group text-center
                                ${isSelected ? 'selected' : ''}
                            `}
                            style={{
                                borderColor: isSelected ? card.accentColor : undefined,
                                background: isSelected ? card.bgColor : undefined,
                                opacity: (selected !== null && !isSelected) ? 0.65 : 1,
                            }}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 + index * 0.1, type: 'spring', stiffness: 200 }}
                            whileHover={{ scale: 1.06, y: -8 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            {/* Clipboard clip color accent */}
                            {isSelected && (
                                <div
                                    className="absolute -top-[4px] left-1/2 -translate-x-1/2 w-[40px] h-[12px] rounded-b-md z-10"
                                    style={{ background: card.accentColor }}
                                />
                            )}

                            {/* Emoji + Icon */}
                            <div className="relative">
                                <motion.span
                                    className="text-4xl md:text-5xl block"
                                    animate={isSelected ? {
                                        scale: [1, 1.25, 1],
                                        rotate: [0, 10, -10, 0],
                                    } : {}}
                                    transition={{ duration: 2, repeat: Infinity }}
                                >
                                    {card.emoji}
                                </motion.span>
                                <div
                                    className="absolute -bottom-1 -right-2 p-1 rounded-full"
                                    style={{
                                        background: isSelected ? card.accentColor : '#E5E7EB',
                                        color: isSelected ? '#FFF' : '#9CA3AF',
                                    }}
                                >
                                    <span className="[&>svg]:w-3.5 [&>svg]:h-3.5">{card.icon}</span>
                                </div>
                            </div>

                            {/* Card title */}
                            <span
                                className="font-heading text-lg md:text-xl tracking-[0.12em] mt-1"
                                style={{ color: isSelected ? card.accentColor : '#374151' }}
                            >
                                {card.title}
                            </span>

                            {/* Subtitle flavors */}
                            <span className="text-[11px] md:text-xs text-chalk-light text-center leading-tight">
                                {card.subtitle}
                            </span>

                            {/* Tagline */}
                            <span
                                className="text-[10px] md:text-xs font-marker text-center mt-0.5"
                                style={{ color: isSelected ? card.accentColor : '#9CA3AF' }}
                            >
                                {card.tagline}
                            </span>

                            {/* Selected checkmark */}
                            <AnimatePresence>
                                {isSelected && (
                                    <motion.div
                                        className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center"
                                        style={{ background: card.accentColor }}
                                        initial={{ scale: 0, rotate: -90 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        exit={{ scale: 0 }}
                                        transition={{ type: 'spring', stiffness: 500 }}
                                    >
                                        <Check className="w-4 h-4 text-white" />
                                    </motion.div>
                                )}
                            </AnimatePresence>

                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
}
