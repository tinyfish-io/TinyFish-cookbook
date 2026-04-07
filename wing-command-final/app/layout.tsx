import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';

// Self-hosted fonts — avoids build-time Google Fonts downloads that fail on Render
const inter = localFont({
    src: './fonts/Inter-latin.woff2',
    variable: '--font-inter',
    display: 'swap',
});

const bebasNeue = localFont({
    src: './fonts/BebasNeue-latin.woff2',
    weight: '400',
    variable: '--font-bebas',
    display: 'swap',
});

const russoOne = localFont({
    src: './fonts/RussoOne-latin.woff2',
    weight: '400',
    variable: '--font-russo',
    display: 'swap',
});

// "Permanent Marker" handwriting font for coach notes:
const permanentMarker = localFont({
    src: './fonts/PermanentMarker-latin.woff2',
    weight: '400',
    variable: '--font-marker',
    display: 'swap',
});

export const metadata: Metadata = {
    title: 'Super Bowl LX: Wing Command | Your Game Day Wing HQ',
    description: 'Your Super Bowl LX wing headquarters. Find the best chicken wings to order for your game day party — real-time deals, flavor matching, and AI-powered scouting. Powered by Coach Wing.',
    keywords: ['chicken wings', 'super bowl', 'wing deals', 'game day food', 'wing command', 'super bowl lx', 'super bowl party', 'order wings'],
    authors: [{ name: 'Wing Command' }],
    icons: {
        icon: '/icon.svg',
    },
    openGraph: {
        title: 'Super Bowl LX: Wing Command | Your Game Day Wing HQ',
        description: 'Find the best chicken wings for your Super Bowl LX party. Real-time deals, flavor matching, and AI-powered scouting.',
        type: 'website',
        locale: 'en_US',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Super Bowl LX: Wing Command | Your Game Day Wing HQ',
        description: 'Find the best chicken wings for your Super Bowl LX party.',
    },
    robots: {
        index: true,
        follow: true,
    },
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    themeColor: '#F3F4F6',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className={`${inter.variable} ${bebasNeue.variable} ${russoOne.variable} ${permanentMarker.variable}`}>
            <body className="min-h-screen antialiased" style={{ background: 'transparent' }}>
                <div className="min-h-screen">
                    {children}
                </div>
            </body>
        </html>
    );
}
