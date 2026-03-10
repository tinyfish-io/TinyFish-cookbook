'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BarChart3 } from 'lucide-react';

interface CompareBarProps {
    count: number;
    onCompare: () => void;
    onClear: () => void;
}

export function CompareBar({ count, onCompare, onClear }: CompareBarProps) {
    return (
        <AnimatePresence>
            {count > 0 && (
                <motion.div
                    className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4"
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                >
                    <div
                        className="mx-auto max-w-lg rounded-2xl px-5 py-3 flex items-center justify-between gap-3 shadow-xl"
                        style={{
                            background: 'rgba(15, 23, 42, 0.92)',
                            backdropFilter: 'blur(16px)',
                            border: '1px solid rgba(22, 163, 74, 0.3)',
                        }}
                    >
                        <div className="flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-stadium-green" />
                            <span className="text-white/90 text-sm font-heading tracking-wider">
                                {count} SPOT{count !== 1 ? 'S' : ''} SELECTED
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={onClear}
                                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                                title="Clear selection"
                            >
                                <X className="w-4 h-4 text-white/60" />
                            </button>
                            <button
                                onClick={onCompare}
                                disabled={count < 2}
                                className={`px-4 py-1.5 rounded-lg font-heading text-sm tracking-wider transition-all ${
                                    count >= 2
                                        ? 'bg-stadium-green text-white hover:bg-stadium-green/90 shadow-lg shadow-stadium-green/20'
                                        : 'bg-white/10 text-white/40 cursor-not-allowed'
                                }`}
                            >
                                COMPARE
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
