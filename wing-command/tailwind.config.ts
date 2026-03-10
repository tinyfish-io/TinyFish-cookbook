import type { Config } from 'tailwindcss';

const config: Config = {
    content: [
        './pages/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                // ===== Locker Room Light Theme =====
                // Primary surfaces
                'locker': {
                    bg: '#F3F4F6',
                    surface: '#FFFFFF',
                    muted: '#E5E7EB',
                    divider: '#D1D5DB',
                },
                // Stadium Green — primary brand
                'stadium': {
                    green: '#16A34A',
                    'green-light': '#22C55E',
                    'green-dark': '#15803D',
                    'green-bg': 'rgba(22, 163, 74, 0.08)',
                    'green-glow': 'rgba(22, 163, 74, 0.15)',
                },
                // Whistle Orange — accent
                'whistle': {
                    orange: '#F97316',
                    'orange-light': '#FB923C',
                    'orange-dark': '#EA580C',
                    'orange-bg': 'rgba(249, 115, 22, 0.08)',
                },
                // Chalkboard text
                'chalk': {
                    dark: '#1F2937',
                    mid: '#4B5563',
                    light: '#9CA3AF',
                    faint: '#D1D5DB',
                },
                // Manila/paper tones
                'manila': {
                    DEFAULT: '#FEF3C7',
                    light: '#FFFBEB',
                    dark: '#FDE68A',
                    border: '#F59E0B',
                },
                // Wing status (preserved)
                wing: {
                    green: '#22c55e',
                    'green-dark': '#16a34a',
                    yellow: '#fbbf24',
                    'yellow-dark': '#d97706',
                    red: '#ef4444',
                    'red-dark': '#dc2626',
                },
                // Flavor persona cards
                flavor: {
                    melter: '#DC2626',
                    classic: '#F97316',
                    sticky: '#EAB308',
                },
                // Varsity Navy — physical shadow + overlays
                'varsity': {
                    navy: '#1E3A8A',
                    'navy-light': '#2563EB',
                },
                // Backwards compat aliases
                'neon-green': '#16A34A',
                'sauce-red': '#DC2626',
                midnight: {
                    DEFAULT: '#1F2937',
                    900: '#111827',
                    800: '#1F2937',
                    700: '#374151',
                    600: '#4B5563',
                    500: '#6B7280',
                    400: '#9CA3AF',
                    300: '#D1D5DB',
                },
                turf: {
                    black: '#F3F4F6',
                    dark: '#E5E7EB',
                    mid: '#F3F4F6',
                    surface: '#FFFFFF',
                    border: '#E5E7EB',
                    'border-light': '#D1D5DB',
                },
            },
            fontFamily: {
                heading: ['var(--font-russo)', 'var(--font-bebas)', 'Impact', 'sans-serif'],
                marker: ['var(--font-marker)', 'cursive'],
                body: ['var(--font-inter)', 'system-ui', 'sans-serif'],
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'float': 'float 6s ease-in-out infinite',
                'float-slow': 'float-slow 8s ease-in-out infinite',
                'float-fast': 'float-fast 4s ease-in-out infinite',
                'slide-up': 'slide-up 0.3s ease-out',
                'slide-down': 'slide-down 0.3s ease-out',
                'fade-in': 'fade-in 0.5s ease-out',
                'fade-in-up': 'fade-in-up 0.6s ease-out',
                'tackle-in': 'tackle-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                'shimmer': 'shimmer 2s linear infinite',
                'spin-slow': 'spin 6s linear infinite',
                'breathe': 'breathe 4s ease-in-out infinite',
                'wiggle': 'wiggle 2s ease-in-out infinite',
                'clipboard-flip': 'clipboard-flip 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                'ticker-scroll': 'ticker-scroll 15s linear infinite',
                'siren': 'siren 1s ease-in-out infinite',
                'card-deal': 'card-deal 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                'coin-flip': 'coin-flip 1s ease-in-out',
                'draw-in': 'draw-in 0.8s ease-out forwards',
                'strike-through': 'strike-through 0.4s ease-out forwards',
                'xo-fade': 'xo-fade 1.2s ease-out forwards',
                'play-draw': 'play-draw 2s ease-in-out infinite',
            },
            keyframes: {
                'float': {
                    '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
                    '33%': { transform: 'translateY(-16px) rotate(2deg)' },
                    '66%': { transform: 'translateY(8px) rotate(-2deg)' },
                },
                'float-slow': {
                    '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
                    '50%': { transform: 'translateY(-30px) rotate(3deg)' },
                },
                'float-fast': {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-8px)' },
                },
                'slide-up': {
                    '0%': { transform: 'translateY(100%)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                'slide-down': {
                    '0%': { transform: 'translateY(-100%)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                'fade-in': {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                'fade-in-up': {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                'tackle-in': {
                    '0%': { opacity: '0', transform: 'translateX(-60px) scale(0.85)' },
                    '100%': { opacity: '1', transform: 'translateX(0) scale(1)' },
                },
                'shimmer': {
                    '0%': { backgroundPosition: '-468px 0' },
                    '100%': { backgroundPosition: '468px 0' },
                },
                'breathe': {
                    '0%, 100%': { transform: 'scale(1)' },
                    '50%': { transform: 'scale(1.03)' },
                },
                'wiggle': {
                    '0%, 100%': { transform: 'rotate(0deg)' },
                    '25%': { transform: 'rotate(2deg)' },
                    '75%': { transform: 'rotate(-2deg)' },
                },
                'clipboard-flip': {
                    '0%': { transform: 'rotateY(0deg) scale(0.95)', opacity: '0.5' },
                    '60%': { transform: 'rotateY(180deg) scale(1.02)' },
                    '100%': { transform: 'rotateY(360deg) scale(1)', opacity: '1' },
                },
                'ticker-scroll': {
                    '0%': { transform: 'translateX(100%)' },
                    '100%': { transform: 'translateX(-100%)' },
                },
                'siren': {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.3' },
                },
                'card-deal': {
                    '0%': { transform: 'translateY(-120px) rotateZ(-8deg) scale(0.7)', opacity: '0' },
                    '60%': { transform: 'translateY(8px) rotateZ(2deg) scale(1.03)' },
                    '100%': { transform: 'translateY(0) rotateZ(0deg) scale(1)', opacity: '1' },
                },
                'coin-flip': {
                    '0%': { transform: 'rotateY(0deg) scale(1)' },
                    '50%': { transform: 'rotateY(900deg) scale(1.3)' },
                    '100%': { transform: 'rotateY(1800deg) scale(1)' },
                },
                'draw-in': {
                    '0%': { strokeDashoffset: '300', opacity: '0' },
                    '10%': { opacity: '1' },
                    '100%': { strokeDashoffset: '0', opacity: '1' },
                },
                'strike-through': {
                    '0%': { width: '0%', opacity: '0' },
                    '100%': { width: '110%', opacity: '1' },
                },
                'xo-fade': {
                    '0%': { opacity: '0.5', transform: 'scale(1)' },
                    '100%': { opacity: '0', transform: 'scale(0.6)' },
                },
                'play-draw': {
                    '0%': { strokeDashoffset: '200' },
                    '50%': { strokeDashoffset: '0' },
                    '100%': { strokeDashoffset: '200' },
                },
            },
            boxShadow: {
                'locker': '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
                'locker-md': '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -1px rgba(0,0,0,0.04)',
                'locker-lg': '0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -2px rgba(0,0,0,0.04)',
                'clipboard': '0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)',
                'manila': '0 2px 8px rgba(245,158,11,0.12), 0 1px 3px rgba(0,0,0,0.06)',
                'manila-varsity': '8px 8px 0px 0px #1E3A8A',
                'manila-varsity-hover': '10px 10px 0px 0px #1E3A8A',
            },
            backgroundImage: {
                'whiteboard': `
                    linear-gradient(rgba(22,163,74,0.04) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(22,163,74,0.04) 1px, transparent 1px)
                `,
                'notebook': `repeating-linear-gradient(
                    transparent,
                    transparent 31px,
                    rgba(22,163,74,0.08) 31px,
                    rgba(22,163,74,0.08) 32px
                )`,
                'playbook': `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Ctext x='10' y='20' font-size='12' fill='%2316A34A' opacity='0.06'%3EX%3C/text%3E%3Ccircle cx='45' cy='40' r='6' stroke='%2316A34A' fill='none' stroke-width='1' opacity='0.06'/%3E%3C/svg%3E")`,
            },
            backgroundSize: {
                'whiteboard-sm': '20px 20px',
                'whiteboard-md': '30px 30px',
                'whiteboard-lg': '40px 40px',
            },
        },
    },
    plugins: [],
};

export default config;
