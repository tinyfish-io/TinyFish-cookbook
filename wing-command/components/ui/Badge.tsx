'use client';

import React from 'react';
import { WingStatus } from '@/lib/types';

interface BadgeProps {
    variant?: WingStatus | 'default' | 'live';
    size?: 'sm' | 'md';
    pulse?: boolean;
    children: React.ReactNode;
    className?: string;
}

export function Badge({
    variant = 'default',
    size = 'md',
    pulse = false,
    children,
    className = '',
}: BadgeProps) {
    const baseStyles = 'inline-flex items-center font-medium rounded-full';

    const variantStyles = {
        green: 'bg-wing-green/20 text-wing-green border border-wing-green/30',
        yellow: 'bg-wing-yellow/20 text-wing-yellow border border-wing-yellow/30',
        red: 'bg-wing-red/20 text-wing-red border border-wing-red/30',
        default: 'bg-gray-500/20 text-gray-300 border border-gray-500/30',
        live: 'bg-wing-green/20 text-wing-green border border-wing-green/30',
    };

    const sizeStyles = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-3 py-1 text-sm',
    };

    return (
        <span className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}>
            {pulse && (
                <span className="relative flex h-2 w-2 mr-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-current" />
                </span>
            )}
            {children}
        </span>
    );
}

export function StatusBadge({ status }: { status: WingStatus }) {
    const labels = {
        green: 'In Stock',
        yellow: 'Limited',
        red: 'Unavailable',
    };

    return (
        <Badge variant={status} size="sm">
            {labels[status]}
        </Badge>
    );
}

export function LiveBadge() {
    return (
        <Badge variant="live" size="sm" pulse>
            Live updating...
        </Badge>
    );
}
