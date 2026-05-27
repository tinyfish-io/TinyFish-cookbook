import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ClientLayout } from '@/components/ClientLayout';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Hardware Sentry - Real-time Board Availability Tracker',
  description:
    'Track real-time availability and pricing for Raspberry Pi 5, Jetson Orin, and other developer boards across multiple retailers.',
  keywords: [
    'Raspberry Pi',
    'Jetson Orin',
    'hardware availability',
    'price tracker',
    'stock checker',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased text-gray-900 dark:text-gray-100 transition-colors duration-300">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
