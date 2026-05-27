'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ThemeProvider } from './ThemeProvider';
import { ThemeToggle } from './ThemeToggle';

interface ClientLayoutProps {
  children: ReactNode;
}

export function ClientLayout({ children }: ClientLayoutProps) {
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();

  // Parallax background transform
  const backgroundY = useTransform(scrollY, [0, 500], [0, 150]);

  // Detect scroll for header shadow
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <ThemeProvider>
      {/* Parallax Background */}
      <motion.div
        className="fixed inset-0 -z-10 bg-gradient-to-br from-blue-50/30 via-transparent to-purple-50/30 dark:from-blue-950/20 dark:via-transparent dark:to-purple-950/20"
        style={{ y: backgroundY }}
      />

      <header
        className={`glass-card sticky top-0 z-50 mb-8 transition-shadow duration-300 ${
          scrolled ? 'shadow-lg' : ''
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                🔍 Hardware Sentry
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Real-time availability tracker for developer boards
              </p>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      <footer className="mt-16 glass-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Built with{' '}
          <a
            href="https://tinyfish.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            TinyFish Web Agents
          </a>{' '}
          | Web Agents Hackathon Feb 2026
        </div>
      </footer>

      <div id="toast-container" className="fixed top-4 right-4 z-[100] space-y-2"></div>
    </ThemeProvider>
  );
}
