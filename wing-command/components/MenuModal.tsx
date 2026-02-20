'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink } from 'lucide-react';
import { WingSpot, MenuResponse, MenuSection, MenuItem } from '@/lib/types';

interface MenuModalProps {
    spot: WingSpot;
    isOpen: boolean;
    onClose: () => void;
}

const WING_KEYWORDS = ['wing', 'wings', 'buffalo', 'boneless', 'drumette'];

function isWingItem(item: MenuItem): boolean {
    const text = (item.name + ' ' + (item.description || '')).toLowerCase();
    return WING_KEYWORDS.some(kw => text.includes(kw));
}

function isWingSection(section: MenuSection): boolean {
    return WING_KEYWORDS.some(kw => section.name.toLowerCase().includes(kw));
}

function formatPrice(price: number | null): string {
    if (price === null || price === undefined) return '';
    return `$${price.toFixed(2)}`;
}

/** Get platform name from URL */
function getPlatformName(url: string): string {
    if (url.includes('doordash')) return 'DoorDash';
    if (url.includes('ubereats')) return 'Uber Eats';
    if (url.includes('grubhub')) return 'Grubhub';
    return 'restaurant page';
}

/** Get the best external URL for this spot */
function getExternalUrl(spot: WingSpot, menuSourceUrl?: string): string | null {
    // Prefer source_url from the menu response (may come from API)
    if (menuSourceUrl) return menuSourceUrl;
    // Then try the spot's platform IDs
    if (spot.platform_ids?.source_url) return spot.platform_ids.source_url;
    // Fallback to Google Maps search
    if (spot.name && spot.address) {
        return `https://www.google.com/maps/search/${encodeURIComponent(spot.name + ' ' + spot.address)}`;
    }
    return null;
}

// "View Full Menu" link component
function ViewFullMenuLink({ url, className }: { url: string; className?: string }) {
    const platform = getPlatformName(url);
    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 text-sm font-heading text-stadium-green hover:text-stadium-green/80 underline underline-offset-2 transition-colors ${className || ''}`}
        >
            View Full Menu
            <ExternalLink className="w-3.5 h-3.5" />
        </a>
    );
}

// Loading skeleton for menu items
function MenuSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            {[1, 2, 3].map(i => (
                <div key={i}>
                    <div className="h-5 w-32 bg-amber-200/30 rounded mb-3" />
                    <div className="space-y-2.5">
                        {[1, 2, 3].map(j => (
                            <div key={j} className="flex justify-between items-center">
                                <div className="h-4 w-48 bg-amber-200/20 rounded" />
                                <div className="h-4 w-14 bg-amber-200/20 rounded" />
                            </div>
                        ))}
                    </div>
                </div>
            ))}
            <p className="text-xs text-center text-amber-700/50 pt-2">
                Scouting wing items...
            </p>
        </div>
    );
}

// Single menu item row
function MenuItemRow({ item, highlight }: { item: MenuItem; highlight: boolean }) {
    return (
        <div className={`flex items-start justify-between gap-3 py-1.5 px-2 rounded ${highlight ? 'bg-stadium-green/10' : ''}`}>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    {highlight && <span className="text-xs shrink-0">🍗</span>}
                    <span className={`text-sm leading-tight ${highlight ? 'font-semibold text-amber-900' : 'text-amber-800'}`}>
                        {item.name}
                    </span>
                    {item.is_deal && (
                        <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-semibold shrink-0">
                            DEAL
                        </span>
                    )}
                </div>
                {item.description && (
                    <p className="text-xs text-amber-600/70 mt-0.5 line-clamp-2">{item.description}</p>
                )}
                {item.price_per_wing && (
                    <p className="text-[10px] text-stadium-green font-semibold mt-0.5">
                        ~{formatPrice(item.price_per_wing)}/wing
                    </p>
                )}
            </div>
            {item.price !== null && item.price !== undefined && (
                <span className="text-sm font-mono font-semibold text-amber-900 shrink-0">
                    {formatPrice(item.price)}
                </span>
            )}
        </div>
    );
}

// Section of menu items
function MenuSectionBlock({ section, isWing }: { section: MenuSection; isWing: boolean }) {
    return (
        <div className={`rounded-lg ${isWing ? 'bg-stadium-green/5 border border-stadium-green/20' : 'border border-amber-200/30'} p-3`}>
            <h3 className={`font-heading text-sm uppercase tracking-wider mb-2 ${isWing ? 'text-stadium-green' : 'text-amber-700'}`}>
                {isWing && '🍗 '}{section.name}
            </h3>
            <div className="space-y-0.5">
                {section.items.map((item, idx) => (
                    <MenuItemRow key={idx} item={item} highlight={isWingItem(item)} />
                ))}
            </div>
        </div>
    );
}

export function MenuModal({ spot, isOpen, onClose }: MenuModalProps) {
    const [menu, setMenu] = useState<MenuResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [scouting, setScouting] = useState(false);
    const [sourceUrl, setSourceUrl] = useState<string | null>(null);
    const hasFetched = useRef(false);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Stop polling when component unmounts or modal closes
    function stopPolling() {
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
    }

    async function doFetchMenu() {
        if (!spot.id) return;
        setLoading(true);
        setError(null);
        setScouting(false);
        stopPolling();

        // 50-second client-side timeout — prevents infinite hangs
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 50000);

        try {
            const res = await fetch(
                `/api/menu?spot_id=${encodeURIComponent(spot.id)}`,
                { signal: controller.signal }
            );
            clearTimeout(timeoutId);
            const data: MenuResponse = await res.json();

            // Capture source_url from API response
            if (data.source_url) setSourceUrl(data.source_url);

            if (data.success && data.menu) {
                setMenu(data);
            } else if (data.scouting) {
                // Background scrape started — poll every 5s for the cached result
                setScouting(true);
                startPolling();
            } else {
                setError(data.message || 'Menu not available');
            }
        } catch (err) {
            clearTimeout(timeoutId);
            if (err instanceof Error && err.name === 'AbortError') {
                // Client timed out at 50s — server may still be working, start polling
                setScouting(true);
                startPolling();
            } else {
                setError('Failed to load menu. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    }

    function startPolling() {
        stopPolling(); // Prevent double polling
        let pollCount = 0;
        const maxPolls = 24; // 24 polls x 5s = 120s max polling

        pollRef.current = setInterval(async () => {
            pollCount++;
            if (pollCount > maxPolls || !isOpen) {
                stopPolling();
                setScouting(false);
                setError('Wing items could not be loaded. Try again later.');
                return;
            }

            try {
                // poll=true ensures NO new Mino scrapes are triggered
                const res = await fetch(`/api/menu?spot_id=${encodeURIComponent(spot.id)}&poll=true`);
                const data: MenuResponse = await res.json();

                if (data.source_url) setSourceUrl(data.source_url);

                if (data.success && data.menu) {
                    stopPolling();
                    setScouting(false);
                    setMenu(data);
                }
                // If still scouting, keep polling
            } catch {
                // Network error during poll — keep trying
            }
        }, 5000);
    }

    // Fetch menu ONCE when modal opens — ref prevents re-trigger loops
    useEffect(() => {
        if (isOpen && !hasFetched.current) {
            hasFetched.current = true;
            doFetchMenu();
        }
        if (!isOpen) {
            // Reset for next open
            hasFetched.current = false;
            stopPolling();
            setScouting(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    // Cleanup on unmount
    useEffect(() => {
        return () => stopPolling();
    }, []);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    // Sort sections: wing sections first
    const sortedSections = menu?.menu?.sections
        ? [...menu.menu.sections].sort((a, b) => {
            const aWing = isWingSection(a) ? 0 : 1;
            const bWing = isWingSection(b) ? 0 : 1;
            return aWing - bWing;
        })
        : [];

    // Get the external URL for "View Full Menu" link
    const externalUrl = getExternalUrl(spot, sourceUrl || menu?.source_url || undefined);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className="fixed inset-0 bg-black/60 z-[60]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        className="fixed inset-x-4 top-[10%] bottom-[10%] md:inset-x-auto md:left-1/2 md:top-[5%] md:bottom-[5%] md:w-[480px] md:-translate-x-1/2 z-[61] flex flex-col"
                        initial={{ opacity: 0, y: 40, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 40, scale: 0.95 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    >
                        <div className="flex flex-col h-full bg-manila rounded-xl shadow-2xl border border-amber-300/40 overflow-hidden">
                            {/* Header */}
                            <div className="flex items-center justify-between px-4 py-3 border-b border-amber-300/40 bg-amber-50/50 shrink-0">
                                <div className="min-w-0 flex-1">
                                    <h2 className="font-heading text-lg text-varsity-navy truncate">
                                        {spot.name}
                                    </h2>
                                    <p className="text-[10px] text-amber-600 uppercase tracking-widest font-heading">
                                        Wing Items
                                    </p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-1.5 rounded-lg hover:bg-amber-200/50 transition-colors shrink-0 ml-2"
                                >
                                    <X className="w-5 h-5 text-amber-700" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {loading && <MenuSkeleton />}

                                {scouting && !loading && (
                                    <div className="text-center py-8">
                                        <div className="text-4xl mb-3 animate-bounce">🔍</div>
                                        <p className="text-amber-700 font-heading text-sm mb-2">
                                            Scouting Wing Items...
                                        </p>
                                        <p className="text-xs text-amber-600/60 mb-4">
                                            Our scout is finding wing items in the background.
                                            <br />This usually takes 30-60 seconds.
                                        </p>
                                        <div className="flex justify-center gap-1.5 mb-3">
                                            {[0, 1, 2].map(i => (
                                                <div
                                                    key={i}
                                                    className="w-2 h-2 bg-stadium-green rounded-full animate-pulse"
                                                    style={{ animationDelay: `${i * 0.3}s` }}
                                                />
                                            ))}
                                        </div>
                                        <p className="text-[10px] text-amber-500 mb-4">
                                            Wing items will appear automatically when ready
                                        </p>
                                        {externalUrl && (
                                            <div className="pt-2 border-t border-amber-200/30">
                                                <ViewFullMenuLink url={externalUrl} className="text-xs" />
                                                <p className="text-[10px] text-amber-500 mt-1">
                                                    on {getPlatformName(externalUrl)}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {error && !loading && !scouting && (
                                    <div className="text-center py-8">
                                        <div className="text-4xl mb-3">📋</div>
                                        <p className="text-amber-700 font-heading text-sm mb-2">
                                            Wing Items Not Available
                                        </p>
                                        <p className="text-xs text-amber-600/60 mb-4">
                                            {error}
                                        </p>
                                        <button
                                            onClick={doFetchMenu}
                                            className="text-xs px-4 py-2 bg-stadium-green text-white rounded-lg hover:bg-stadium-green/90 transition-colors font-heading"
                                        >
                                            Try Again
                                        </button>
                                        {externalUrl && (
                                            <div className="mt-4 pt-3 border-t border-amber-200/30">
                                                <ViewFullMenuLink url={externalUrl} className="text-xs" />
                                                <p className="text-[10px] text-amber-500 mt-1">
                                                    on {getPlatformName(externalUrl)}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {!loading && !error && menu?.menu && (
                                    <>
                                        {sortedSections.length === 0 ? (
                                            <div className="text-center py-8">
                                                <div className="text-4xl mb-3">📋</div>
                                                <p className="text-amber-700 font-heading text-sm">
                                                    No wing items found
                                                </p>
                                                {externalUrl && (
                                                    <div className="mt-4">
                                                        <ViewFullMenuLink url={externalUrl} />
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <>
                                                {sortedSections.map((section, idx) => (
                                                    <MenuSectionBlock
                                                        key={idx}
                                                        section={section}
                                                        isWing={isWingSection(section)}
                                                    />
                                                ))}

                                                {/* View Full Menu link + Footer */}
                                                <div className="text-center pt-3 pb-1 space-y-2">
                                                    {externalUrl && (
                                                        <div>
                                                            <ViewFullMenuLink url={externalUrl} />
                                                            <p className="text-[10px] text-amber-500 mt-0.5">
                                                                on {getPlatformName(externalUrl)}
                                                            </p>
                                                        </div>
                                                    )}
                                                    <p className="text-[10px] text-amber-400">
                                                        {menu.cached ? 'Cached' : 'Freshly scouted'} via {menu.menu.source === 'mino_scrape' ? 'AI scraping' : menu.menu.source}
                                                    </p>
                                                </div>
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
