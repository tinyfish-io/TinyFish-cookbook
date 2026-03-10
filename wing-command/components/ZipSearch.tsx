'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { isValidZipCode, cleanZipCode, POPULAR_CITIES } from '@/lib/utils';
import { PopularCity } from '@/lib/types';

interface ZipSearchProps {
    onSearch: (zip: string) => void;
    isLoading: boolean;
    initialZip?: string;
}

export function ZipSearch({ onSearch, isLoading, initialZip = '' }: ZipSearchProps) {
    const [value, setValue] = useState(initialZip);
    const [error, setError] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

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
        <div ref={containerRef} className="w-full max-w-xl mx-auto relative">
            <form onSubmit={handleSubmit}>
                <motion.div
                    className={`
                        relative rounded-2xl overflow-hidden
                        ${isFocused ? 'ring-1 ring-neon-green/30' : ''}
                    `}
                    animate={isFocused ? {
                        boxShadow: [
                            '0 0 20px rgba(57, 255, 20, 0.1)',
                            '0 0 40px rgba(57, 255, 20, 0.15)',
                            '0 0 20px rgba(57, 255, 20, 0.1)',
                        ],
                    } : {
                        boxShadow: '0 0 10px rgba(57, 255, 20, 0.05)',
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                >
                    {/* Stadium light beams */}
                    {isFocused && (
                        <motion.div
                            className="absolute inset-0 pointer-events-none"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-neon-green/20 to-transparent" />
                            <div className="absolute top-0 right-1/4 w-px h-full bg-gradient-to-b from-neon-green/20 to-transparent" />
                        </motion.div>
                    )}

                    <div className="flex items-center stadium-input rounded-2xl">
                        {/* Icon */}
                        <div className="pl-5 pr-2">
                            {isLoading ? (
                                <Loader2 className="w-6 h-6 text-neon-green animate-spin" />
                            ) : (
                                <MapPin className="w-6 h-6 text-neon-green/60" />
                            )}
                        </div>

                        {/* Input */}
                        <input
                            ref={inputRef}
                            type="text"
                            inputMode="numeric"
                            maxLength={5}
                            placeholder="ENTER YOUR ZIP CODE"
                            value={value}
                            onChange={(e) => {
                                const v = e.target.value.replace(/\D/g, '').slice(0, 5);
                                setValue(v);
                                setError('');
                                if (v.length < 5) setShowSuggestions(true);
                            }}
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
                                       outline-none"
                            autoComplete="off"
                        />

                        {/* Search button */}
                        <motion.button
                            type="submit"
                            disabled={isLoading}
                            className="mr-2 px-5 md:px-7 py-3 md:py-4 rounded-xl
                                       bg-neon-green/10 border border-neon-green/30
                                       text-neon-green font-heading tracking-wider text-sm md:text-base
                                       hover:bg-neon-green/20 transition-all disabled:opacity-40"
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
                        className="text-wing-red text-sm mt-2 text-center"
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                    >
                        {error}
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
    );
}
