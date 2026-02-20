'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FlavorPersona } from '@/lib/types';
import { FLAVOR_PERSONAS } from '@/lib/utils';

interface FlavorSelectorProps {
    selected: FlavorPersona | null;
    onSelect: (flavor: FlavorPersona) => void;
}

export function FlavorSelector({ selected, onSelect }: FlavorSelectorProps) {
    return (
        <div className="w-full max-w-2xl mx-auto">
            <motion.h3
                className="text-center font-heading text-xl md:text-2xl tracking-wider text-gray-400 mb-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                CHOOSE YOUR FLAVOR PERSONA
            </motion.h3>

            <div className="grid grid-cols-3 gap-3 md:gap-5">
                {FLAVOR_PERSONAS.map((persona, index) => {
                    const isSelected = selected === persona.id;

                    return (
                        <motion.button
                            key={persona.id}
                            onClick={() => onSelect(persona.id)}
                            className={`
                                relative flex flex-col items-center gap-2 md:gap-3 p-4 md:p-6 rounded-2xl
                                transition-all duration-300 cursor-pointer group
                                ${isSelected
                                    ? 'glass-card border-2'
                                    : 'bg-turf-mid/50 border border-turf-border hover:border-turf-border-light'
                                }
                            `}
                            style={{
                                borderColor: isSelected ? persona.color : undefined,
                                boxShadow: isSelected ? `0 0 30px ${persona.color}20, 0 0 60px ${persona.color}10` : undefined,
                            }}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 + index * 0.1 }}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                        >
                            {/* Pulse ring when selected */}
                            {isSelected && (
                                <motion.div
                                    className="absolute inset-0 rounded-2xl"
                                    style={{ border: `2px solid ${persona.color}` }}
                                    animate={{
                                        scale: [1, 1.05, 1],
                                        opacity: [0.5, 0, 0.5],
                                    }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                />
                            )}

                            {/* Emoji icon */}
                            <motion.span
                                className="text-3xl md:text-5xl"
                                animate={isSelected ? {
                                    scale: [1, 1.15, 1],
                                    rotate: [0, 5, -5, 0],
                                } : {}}
                                transition={{ duration: 2, repeat: Infinity }}
                            >
                                {persona.emoji}
                            </motion.span>

                            {/* Label */}
                            <span
                                className="font-heading text-sm md:text-lg tracking-wider"
                                style={{ color: isSelected ? persona.color : '#ccc' }}
                            >
                                {persona.label.toUpperCase()}
                            </span>

                            {/* Subtitle */}
                            <span className="text-[10px] md:text-xs text-gray-500 text-center leading-tight">
                                {persona.subtitle}
                            </span>

                            {/* Selected checkmark */}
                            {isSelected && (
                                <motion.div
                                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                                    style={{ background: persona.color, color: '#000' }}
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', stiffness: 500 }}
                                >
                                    ✓
                                </motion.div>
                            )}
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
}
