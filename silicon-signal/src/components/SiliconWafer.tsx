'use client';

import { motion } from 'framer-motion';

export default function SiliconWafer() {
    return (
        <div className="absolute inset-0 flex items-center justify-center -z-10 pointer-events-none opacity-20">
            <div className="relative w-[800px] h-[800px] border border-white/5 rounded-full flex items-center justify-center">
                {/* Inner Rings */}
                <div className="absolute w-[600px] h-[600px] border border-white/5 rounded-full" />
                <div className="absolute w-[400px] h-[400px] border border-white/5 rounded-full" />

                {/* Crosshair Lines */}
                <div className="absolute w-full h-px bg-white/5" />
                <div className="absolute h-full w-px bg-white/5" />

                {/* Animated Scanning Line */}
                <motion.div
                    className="absolute w-full h-px bg-accent/20"
                    animate={{ top: ['0%', '100%'], opacity: [0, 1, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                />

                {/* Grid Pattern */}
                <div className="absolute inset-0"
                    style={{
                        backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
                        backgroundSize: '50px 50px',
                        maskImage: 'radial-gradient(circle, black 40%, transparent 70%)'
                    }}
                />
            </div>
        </div>
    );
}
