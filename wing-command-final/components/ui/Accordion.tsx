'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface AccordionItemProps {
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
    badge?: React.ReactNode;
    highlighted?: boolean;
}

export function AccordionItem({
    title,
    children,
    defaultOpen = false,
    badge,
    highlighted = false,
}: AccordionItemProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className={cn(
            'border border-gridiron-border rounded-lg overflow-hidden',
            highlighted && 'border-wing-green/50 bg-wing-green/5'
        )}>
            <button
                type="button"
                className={cn(
                    'w-full px-4 py-3 flex items-center justify-between',
                    'text-left font-medium text-gray-100',
                    'hover:bg-gridiron-bg-tertiary transition-colors',
                    isOpen && 'bg-gridiron-bg-tertiary'
                )}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-2">
                    <span>{title}</span>
                    {badge}
                </div>
                <svg
                    className={cn(
                        'w-5 h-5 text-gray-400 transition-transform',
                        isOpen && 'rotate-180'
                    )}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="px-4 py-3 border-t border-gridiron-border">
                    {children}
                </div>
            )}
        </div>
    );
}

interface AccordionProps {
    children: React.ReactNode;
    className?: string;
}

export function Accordion({ children, className }: AccordionProps) {
    return (
        <div className={cn('space-y-2', className)}>
            {children}
        </div>
    );
}
