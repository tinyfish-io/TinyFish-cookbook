'use client';

import React from 'react';

interface FrostedGlassPanelProps {
    children: React.ReactNode;
    className?: string;
}

/**
 * Reusable frosted glass wrapper — shows the animated field background through semi-transparent panels.
 * Uses backdrop-filter: blur for the frosted glass effect.
 */
export function FrostedGlassPanel({ children, className = '' }: FrostedGlassPanelProps) {
    return (
        <div
            className={`frosted-glass-panel ${className}`}
            style={{
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                borderRadius: '1.5rem',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            }}
        >
            {children}
        </div>
    );
}
