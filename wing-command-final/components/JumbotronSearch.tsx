'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { isValidZipCode, cleanZipCode, POPULAR_CITIES } from '@/lib/utils';
import { PopularCity, FlavorPersona } from '@/lib/types';

interface JumbotronSearchProps {
    onSearch: (zip: string) => void;
    isLoading: boolean;
    initialZip?: string;
    flavor: FlavorPersona | null;
}

export function JumbotronSearch({ onSearch, isLoading, initialZip = '', flavor }: JumbotronSearchProps) {
    const [value, setValue] = useState(initialZip);
    const [error, setError] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const isHot = flavor === 'face-melter';

    useEffect(() => {
        if (initialZip) setValue(initialZip);
    }, [initialZip]);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        const zip = cleanZipCode(value);
        if (!isValidZipCode(zip)) {
            setError('Enter a valid 5-digit zip code');
            return;
        }
        setError('');
        setShowSuggestions(false);
        onSearch(zip);
    };

    const handleCitySelect = (city: PopularCity) => {
        setValue(city.zip);
        setError('');
        setShowSuggestions(false);
        onSearch(city.zip);
    };

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value.replace(/\D/g, '').slice(0, 5);
        setValue(v);
        setError('');
        if (v.length < 5) setShowSuggestions(true);

        // Coach Wing typing reaction
        setIsTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 800);
    };

    // Determine Coach Wing state
    const coachState = isHot ? 'coach-hot' : isTyping ? 'coach-typing' : 'coach-idle';

    const filteredCities = POPULAR_CITIES.filter(city => {
        if (!value) return true;
        const lower = value.toLowerCase();
        return (
            city.name.toLowerCase().includes(lower) ||
            city.state.toLowerCase().includes(lower) ||
            city.zip.startsWith(value)
        );
    }).slice(0, 8);

    return (
        <div className="w-full max-w-2xl mx-auto">
            {/* Step header */}
            <motion.div
                className="text-center mb-5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
            >
                <h3 className="font-heading text-xl md:text-2xl tracking-[0.15em] text-gray-300 comic-outline">
                    STEP 2: THE SNAP
                </h3>
                <p className="text-gray-500 text-xs mt-1 tracking-wider italic">
                    Call the play. Drop your ZIP.
                </p>
            </motion.div>

            <div ref={containerRef} className="relative">
                {/* Coach Wing Mascot — real image sitting on top of search bar */}
                <motion.div
                    className={`absolute -top-16 md:-top-20 left-1/2 -translate-x-1/2 z-20 select-none ${coachState}`}
                    initial={{ y: -30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.8, type: 'spring' }}
                >
                    <div className="relative w-14 h-14 md:w-20 md:h-20">
                        <Image
                            src="/coach-wing.png"
                            alt="Coach Wing"
                            fill
                            className="object-contain drop-shadow-[0_0_15px_rgba(57,255,20,0.2)]"
                            style={{
                                filter: isHot ? 'hue-rotate(-15deg) saturate(1.5) brightness(1.2) drop-shadow(0 0 15px rgba(255,69,0,0.4))' : 'none',
                            }}
                        />
                    </div>
                </motion.div>

                <form onSubmit={handleSubmit}>
                    <motion.div
                        className={`
                            relative rounded-2xl overflow-hidden jumbotron-screen
                            ${isFocused ? 'ring-1 ring-neon-green/30' : ''}
                        `}
                        animate={isFocused ? {
                            boxShadow: [
                                `0 0 20px ${isHot ? 'rgba(255,69,0,0.1)' : 'rgba(57,255,20,0.1)'}`,
                                `0 0 50px ${isHot ? 'rgba(255,69,0,0.2)' : 'rgba(57,255,20,0.15)'}`,
                                `0 0 20px ${isHot ? 'rgba(255,69,0,0.1)' : 'rgba(57,255,20,0.1)'}`,
                            ],
                        } : {
                            boxShadow: '0 0 10px rgba(57, 255, 20, 0.05)',
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                    >
                        {/* Stadium light beams */}
                        {isFocused && (
                            <motion.div
                                className="absolute inset-0 pointer-events-none z-10"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <div className={`absolute top-0 left-1/4 w-px h-full bg-gradient-to-b ${isHot ? 'from-sauce-red/20' : 'from-neon-green/20'} to-transparent`} />
                                <div className={`absolute top-0 left-1/2 w-px h-full bg-gradient-to-b ${isHot ? 'from-sauce-red/10' : 'from-neon-green/10'} to-transparent`} />
                                <div className={`absolute top-0 right-1/4 w-px h-full bg-gradient-to-b ${isHot ? 'from-sauce-red/20' : 'from-neon-green/20'} to-transparent`} />
                            </motion.div>
                        )}

                        <div className={`flex items-center stadium-input rounded-2xl ${isHot ? 'stadium-input-hot' : ''}`}>
                            {/* Icon */}
                            <div className="pl-5 pr-2">
                                {isLoading ? (
                                    <Loader2 className={`w-6 h-6 animate-spin ${isHot ? 'text-sauce-red' : 'text-neon-green'}`} />
                                ) : (
                                    <MapPin className={`w-6 h-6 ${isHot ? 'text-sauce-red/60' : 'text-neon-green/60'}`} />
                                )}
                            </div>

                            {/* Input */}
                            <input
                                ref={inputRef}
                                type="text"
                                inputMode="numeric"
                                maxLength={5}
                                placeholder="DROP YOUR ZIP CODE"
                                value={value}
                                onChange={handleInput}
                                onFocus={() => {
                                    setIsFocused(true);
                                    setShowSuggestions(true);
                                }}
                                onBlur={() => setIsFocused(false)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSubmit();
                                }}
                                className="flex-1 bg-transparent py-4 md:py-5 px-2 text-lg md:text-2xl
                                           font-heading tracking-[0.2em] text-white placeholder:text-gray-600
                                           outline-none relative z-10"
                                autoComplete="off"
                            />

                            {/* Search button */}
                            <motion.button
                                type="submit"
                                disabled={isLoading}
                                className={`mr-2 px-5 md:px-7 py-3 md:py-4 rounded-xl
                                           font-heading tracking-wider text-sm md:text-base
                                           transition-all disabled:opacity-40 relative z-10
                                           ${isHot
                                        ? 'bg-sauce-red/10 border border-sauce-red/30 text-sauce-red hover:bg-sauce-red/20'
                                        : 'bg-neon-green/10 border border-neon-green/30 text-neon-green hover:bg-neon-green/20'
                                    }`}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <Search className="w-5 h-5 md:w-6 md:h-6" />
                            </motion.button>
                        </div>
                    </motion.div>
                </form>

                {/* Error message */}
                <AnimatePresence>
                    {error && (
                        <motion.p
                            className="text-wing-red text-sm mt-2 text-center font-heading tracking-wider"
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                        >
                            FLAG ON THE PLAY: {error}
                        </motion.p>
                    )}
                </AnimatePresence>

                {/* City suggestions dropdown */}
                <AnimatePresence>
                    {showSuggestions && filteredCities.length > 0 && !isLoading && (
                        <motion.div
                            className="absolute top-full mt-2 left-0 right-0 z-50 glass rounded-xl overflow-hidden"
                            initial={{ opacity: 0, y: -8, scaleY: 0.95 }}
                            animate={{ opacity: 1, y: 0, scaleY: 1 }}
                            exit={{ opacity: 0, y: -8, scaleY: 0.95 }}
                            transition={{ duration: 0.15 }}
                        >
                            <div className="p-1 max-h-64 overflow-y-auto">
                                {filteredCities.map((city) => (
                                    <button
                                        key={city.zip}
                                        onClick={() => handleCitySelect(city)}
                                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg
                                                   text-left hover:bg-neon-green/5 transition-colors"
                                    >
                                        <MapPin className="w-4 h-4 text-neon-green/40 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <span className="text-white text-sm">{city.name}, {city.state}</span>
                                        </div>
                                        <span className="text-gray-500 text-xs font-mono">{city.zip}</span>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
