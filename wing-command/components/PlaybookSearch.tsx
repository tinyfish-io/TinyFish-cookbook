'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { isValidZipCode, cleanZipCode, POPULAR_CITIES } from '@/lib/utils';
import { PopularCity, FlavorPersona } from '@/lib/types';

interface PlaybookSearchProps {
    onSearch: (zip: string) => void;
    isLoading: boolean;
    initialZip?: string;
    flavor: FlavorPersona | null;
}

export function PlaybookSearch({ onSearch, isLoading, initialZip = '', flavor }: PlaybookSearchProps) {
    const [value, setValue] = useState(initialZip);
    const [error, setError] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

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
        <div className="w-full max-w-xl mx-auto">
            {/* Playbook header */}
            <motion.div
                className="text-center mb-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
            >
                <h3 className="font-heading text-lg md:text-xl tracking-[0.12em] text-gray-600 uppercase">
                    Call the Play
                </h3>
                <p className="text-gray-400 text-xs mt-0.5 font-marker">
                    Drop your ZIP code on the field
                </p>
            </motion.div>

            <div ref={containerRef} className="relative">
                <form onSubmit={handleSubmit}>
                    <motion.div
                        className={`
                            relative rounded-2xl overflow-hidden
                            bg-white border-2 transition-all duration-300
                            ${isFocused
                                ? isHot
                                    ? 'border-whistle-orange shadow-[0_0_0_3px_rgba(249,115,22,0.15)]'
                                    : 'border-stadium-green shadow-[0_0_0_3px_rgba(22,163,74,0.12)]'
                                : 'border-gray-200 shadow-sm'
                            }
                        `}
                    >
                        {/* Tactical X's and O's pattern overlay (subtle) */}
                        <div
                            className="absolute inset-0 pointer-events-none opacity-[0.03] z-0"
                            style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Ctext x='10' y='15' font-size='10' fill='%2316A34A' opacity='0.5'%3EX%3C/text%3E%3Ccircle cx='30' cy='28' r='5' stroke='%2316A34A' fill='none' stroke-width='1' opacity='0.5'/%3E%3C/svg%3E")`,
                                backgroundSize: '40px 40px',
                            }}
                        />

                        <div className="flex items-center relative z-10">
                            {/* Icon */}
                            <div className="pl-5 pr-2">
                                {isLoading ? (
                                    <Loader2 className={`w-5 h-5 animate-spin ${isHot ? 'text-whistle-orange' : 'text-stadium-green'}`} />
                                ) : (
                                    <MapPin className={`w-5 h-5 ${isHot ? 'text-whistle-orange/60' : 'text-stadium-green/60'}`} />
                                )}
                            </div>

                            {/* Input */}
                            <input
                                ref={inputRef}
                                type="text"
                                inputMode="numeric"
                                maxLength={5}
                                placeholder="ZIP CODE"
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
                                           font-heading tracking-[0.2em] text-gray-800 placeholder:text-gray-300
                                           outline-none"
                                autoComplete="off"
                            />

                            {/* Search button */}
                            <motion.button
                                type="submit"
                                disabled={isLoading}
                                className={`mr-3 px-5 md:px-6 py-3 md:py-3.5 rounded-xl
                                           font-heading tracking-wider text-sm md:text-base
                                           transition-all disabled:opacity-40
                                           ${isHot
                                        ? 'bg-whistle-orange text-white hover:bg-whistle-orange/90'
                                        : 'bg-stadium-green text-white hover:bg-stadium-green/90'
                                    } shadow-sm`}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <Search className="w-5 h-5" />
                            </motion.button>
                        </div>
                    </motion.div>
                </form>

                {/* Error message */}
                <AnimatePresence>
                    {error && (
                        <motion.p
                            className="text-red-500 text-sm mt-2 text-center font-heading tracking-wider"
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
                            className="absolute top-full mt-2 left-0 right-0 z-50
                                       bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
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
                                                   text-left hover:bg-stadium-green/5 transition-colors"
                                    >
                                        <MapPin className="w-4 h-4 text-stadium-green/40 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <span className="text-gray-700 text-sm">{city.name}, {city.state}</span>
                                        </div>
                                        <span className="text-gray-400 text-xs font-mono">{city.zip}</span>
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
