'use client';

import React, { useEffect, useRef } from 'react';

interface SheetProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title?: string;
}

export function Sheet({ isOpen, onClose, children, title }: SheetProps) {
    const sheetRef = useRef<HTMLDivElement>(null);

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

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 z-40 transition-opacity"
                onClick={onClose}
            />

            {/* Mobile: Bottom Sheet */}
            <div className="md:hidden fixed inset-x-0 bottom-0 z-50 animate-slide-up">
                <div
                    ref={sheetRef}
                    className="bg-gridiron-bg-secondary rounded-t-2xl max-h-[85vh] overflow-y-auto"
                >
                    {/* Handle */}
                    <div className="sticky top-0 bg-gridiron-bg-secondary pt-3 pb-2 border-b border-gridiron-border">
                        <div className="w-12 h-1.5 bg-gray-600 rounded-full mx-auto mb-3" />
                        {title && (
                            <h2 className="font-heading text-2xl text-center text-gray-100 px-4">
                                {title}
                            </h2>
                        )}
                    </div>
                    <div className="p-4">{children}</div>
                </div>
            </div>

            {/* Desktop: Sidebar */}
            <div className="hidden md:block fixed right-0 top-0 bottom-0 w-96 z-50 animate-fade-in">
                <div className="h-full bg-gridiron-bg-secondary border-l border-gridiron-border overflow-y-auto">
                    <div className="sticky top-0 bg-gridiron-bg-secondary p-4 border-b border-gridiron-border flex items-center justify-between">
                        {title && (
                            <h2 className="font-heading text-2xl text-gray-100">{title}</h2>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gridiron-bg-tertiary rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <div className="p-4">{children}</div>
                </div>
            </div>
        </>
    );
}
