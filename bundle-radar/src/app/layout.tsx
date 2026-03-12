import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BundleRadar — Competitive Frontend Intelligence',
  description: 'Reconstruct any website\'s complete tech stack from production runtime signals. Framework detection, SDK fingerprinting, infrastructure profiling.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
