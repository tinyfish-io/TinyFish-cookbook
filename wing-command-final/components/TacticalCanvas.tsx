'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';

// ===========================================
// X's and O's Cursor Trail
// ===========================================
interface XOMark {
    id: number;
    x: number;
    y: number;
    type: 'X' | 'O';
    rotation: number;
    created: number;
}

function XOCursorTrail() {
    const [marks, setMarks] = useState<XOMark[]>([]);
    const counterRef = useRef(0);
    const lastPosRef = useRef({ x: 0, y: 0 });
    const rafRef = useRef<number | null>(null);

    const addMark = useCallback((x: number, y: number) => {
        const id = counterRef.current++;
        const type: 'X' | 'O' = Math.random() > 0.5 ? 'X' : 'O';
        const rotation = (Math.random() - 0.5) * 30;
        setMarks(prev => {
            const next = [...prev, { id, x, y, type, rotation, created: Date.now() }];
            // Keep max 20 marks
            return next.length > 20 ? next.slice(-20) : next;
        });
    }, []);

    useEffect(() => {
        function handleMouseMove(e: MouseEvent) {
            const dx = e.clientX - lastPosRef.current.x;
            const dy = e.clientY - lastPosRef.current.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Only drop a mark every ~80px of movement
            if (dist > 80) {
                lastPosRef.current = { x: e.clientX, y: e.clientY };
                addMark(e.clientX, e.clientY);
            }
        }

        window.addEventListener('mousemove', handleMouseMove, { passive: true });
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [addMark]);

    // Cleanup old marks periodically
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            setMarks(prev => prev.filter(m => now - m.created < 1200));
        }, 300);
        return () => clearInterval(interval);
    }, []);

    return (
        <>
            {marks.map(mark => (
                <span
                    key={mark.id}
                    className="xo-mark"
                    style={{
                        left: mark.x - 10,
                        top: mark.y - 10,
                        color: mark.type === 'X' ? '#DC2626' : '#2563EB',
                        fontSize: '20px',
                        transform: `rotate(${mark.rotation}deg)`,
                        opacity: 0.4,
                    }}
                >
                    {mark.type}
                </span>
            ))}
        </>
    );
}

// ===========================================
// Animated Play Diagrams (SVG background)
// ===========================================
interface PlayDiagramsProps {
    isActive: boolean; // true when search is focused or hovered
}

function PlayDiagrams({ isActive }: PlayDiagramsProps) {
    return (
        <div className={`absolute inset-0 pointer-events-none overflow-hidden ${isActive ? 'play-diagram-active' : ''}`}>
            {/* Play 1: Slant route — top left */}
            <svg
                className="absolute top-[8%] left-[5%] w-32 h-32 opacity-[0.06]"
                viewBox="0 0 100 100"
                fill="none"
            >
                <circle cx="20" cy="80" r="5" stroke="#16A34A" strokeWidth="2" className="play-diagram-path" style={{ strokeDasharray: 32, animationDelay: '0s' }} />
                <path d="M 20 75 L 20 40 L 60 20" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeDasharray="5,5" className="play-diagram-path" style={{ animationDelay: '0.3s' }} />
                <polygon points="58,14 66,20 58,26" fill="#16A34A" className="play-diagram-path" style={{ strokeDasharray: 30, animationDelay: '0.6s' }} />
            </svg>

            {/* Play 2: Go route — top right */}
            <svg
                className="absolute top-[15%] right-[8%] w-28 h-28 opacity-[0.05]"
                viewBox="0 0 100 100"
                fill="none"
            >
                <circle cx="50" cy="85" r="5" stroke="#1E3A8A" strokeWidth="2" className="play-diagram-path" style={{ animationDelay: '0.8s' }} />
                <path d="M 50 80 L 50 15" stroke="#1E3A8A" strokeWidth="2" strokeLinecap="round" strokeDasharray="5,5" className="play-diagram-path" style={{ animationDelay: '1.1s' }} />
                <polygon points="44,18 50,8 56,18" fill="#1E3A8A" className="play-diagram-path" style={{ strokeDasharray: 30, animationDelay: '1.4s' }} />
            </svg>

            {/* Play 3: Out route — bottom left */}
            <svg
                className="absolute bottom-[10%] left-[12%] w-24 h-24 opacity-[0.05]"
                viewBox="0 0 100 100"
                fill="none"
            >
                <circle cx="50" cy="80" r="4" stroke="#16A34A" strokeWidth="1.5" className="play-diagram-path" style={{ animationDelay: '1.5s' }} />
                <path d="M 50 76 L 50 50 L 15 50" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="4,4" className="play-diagram-path" style={{ animationDelay: '1.8s' }} />
            </svg>

            {/* Play 4: Post route — bottom right */}
            <svg
                className="absolute bottom-[5%] right-[5%] w-36 h-36 opacity-[0.04]"
                viewBox="0 0 120 120"
                fill="none"
            >
                <rect x="20" y="90" width="80" height="2" stroke="#1E3A8A" strokeWidth="1" className="play-diagram-path" style={{ animationDelay: '2s' }} />
                <path d="M 60 88 L 60 50 L 85 20" stroke="#1E3A8A" strokeWidth="2" strokeLinecap="round" strokeDasharray="5,5" className="play-diagram-path" style={{ animationDelay: '2.3s' }} />
                <circle cx="40" cy="88" r="4" stroke="#DC2626" strokeWidth="1.5" className="play-diagram-path" style={{ animationDelay: '2.5s' }} />
            </svg>

            {/* Play 5: Screen pass — center */}
            <svg
                className="absolute top-[40%] left-[40%] w-32 h-32 opacity-[0.03]"
                viewBox="0 0 100 100"
                fill="none"
            >
                <path d="M 50 70 Q 30 50 50 30 Q 70 50 50 70" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round" className="play-diagram-path" style={{ animationDelay: '0.5s' }} />
                <text x="42" y="55" fontSize="10" fill="#16A34A" opacity="0.5" fontFamily="var(--font-marker)">X</text>
            </svg>
        </div>
    );
}

// ===========================================
// Main TacticalCanvas Overlay
// ===========================================
interface TacticalCanvasProps {
    isSearchFocused?: boolean;
}

export function TacticalCanvas({ isSearchFocused = false }: TacticalCanvasProps) {
    return (
        <>
            {/* X's and O's cursor trail — fixed overlay */}
            <XOCursorTrail />

            {/* Play diagrams — positioned relative to page */}
            <PlayDiagrams isActive={isSearchFocused} />
        </>
    );
}
