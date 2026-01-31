import './globals.css';

export const metadata = { title: 'Research Sentry' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return <html><body>{children}</body></html>;
}
