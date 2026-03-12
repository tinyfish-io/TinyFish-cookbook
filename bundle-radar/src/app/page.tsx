'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Code2,
  Palette,
  BarChart3,
  ShieldCheck,
  Zap,
  Eye,
  ArrowRight,
  Menu,
  X,
} from 'lucide-react';
import s from './landing.module.css';

const FEATURES = [
  {
    title: 'Framework Detection',
    desc: 'React, Next.js, Vue, Nuxt, Angular, Svelte, Remix, Gatsby, Astro and more.',
    icon: <Code2 size={24} />,
  },
  {
    title: 'UI Libraries',
    desc: 'Tailwind CSS, Material UI, Chakra UI, Radix UI, shadcn/ui identification.',
    icon: <Palette size={24} />,
  },
  {
    title: 'Analytics & Monitoring',
    desc: 'GA4, Segment, Mixpanel, Sentry, Datadog, LogRocket and other tools.',
    icon: <BarChart3 size={24} />,
  },
  {
    title: 'Security Posture',
    desc: 'CSP headers, HSTS, source map exposure, and leaked credential detection.',
    icon: <ShieldCheck size={24} />,
  },
  {
    title: 'Real Browser Execution',
    desc: 'Dynamic imports, lazy chunks, and runtime initialization captured.',
    icon: <Zap size={24} />,
  },
  {
    title: 'LLM-Powered Synthesis',
    desc: 'AI-generated architecture diagrams and competitive intelligence insights.',
    icon: <Eye size={24} />,
  },
];

export default function HomePage() {
  const [heroUrl, setHeroUrl] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  const handleScan = () => {
    const trimmed = heroUrl.trim();
    if (!trimmed) {
      router.push('/dashboard');
      return;
    }
    router.push(`/dashboard?url=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className={s.landing}>
      <header className={s.landingHeader}>
        <div className={s.landingHeaderInner}>
          <Link href="/" className={s.landingLogo}>
            <span className={s.landingLogoDot}>🐟</span>
            BundleRadar
          </Link>

          {/* Mobile hamburger */}
          <button
            className={s.mobileMenuBtn}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          <nav className={`${s.landingNav} ${menuOpen ? s.landingNavOpen : ''}`}>
            <a href="#features" className={s.landingNavLink} onClick={() => setMenuOpen(false)}>Features</a>
            <a href="#how-it-works" className={s.landingNavLink} onClick={() => setMenuOpen(false)}>How It Works</a>
            <a href="https://docs.mino.ai" target="_blank" className={s.landingNavLink}>Docs</a>
            <Link href="/dashboard" className={s.landingCtaBtn} onClick={() => setMenuOpen(false)}>Dashboard</Link>
          </nav>
        </div>
      </header>

      <section className={s.heroSection}>
        <div className={s.heroGlow} />
        <div className={s.heroIcon}>🐟</div>
        <h1 className={s.heroTitle}>
          Reconstruct any website&apos;s <span className={s.heroTitleAccent}>tech stack</span> from production signals.
        </h1>
        <p className={s.heroSubtitle}>
          Paste a URL. BundleRadar uses TinyFish to load the site like a real user, then infers the complete technology stack. No DevTools needed.
        </p>

        <div className={s.heroSearchBox}>
          <span className={s.heroSearchLabel}>ENTER URL</span>
          <input
            type="text"
            placeholder="https://example.com"
            className={s.heroInput}
            value={heroUrl}
            onChange={(e) => setHeroUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleScan()}
          />
          <button className={s.heroScanBtn} onClick={handleScan}>
            Scan <ArrowRight size={18} />
          </button>
        </div>

        <div className={s.heroTry}>
          <span className={s.heroTryLabel}>Try:</span>
          <button className={s.heroTryPill} onClick={() => { setHeroUrl('https://vercel.com'); router.push('/dashboard?url=https%3A%2F%2Fvercel.com'); }}>vercel.com</button>
          <button className={s.heroTryPill} onClick={() => { setHeroUrl('https://stripe.com'); router.push('/dashboard?url=https%3A%2F%2Fstripe.com'); }}>stripe.com</button>
          <button className={s.heroTryPill} onClick={() => { setHeroUrl('https://linear.app'); router.push('/dashboard?url=https%3A%2F%2Flinear.app'); }}>linear.app</button>
          <button className={s.heroTryPill} onClick={() => { setHeroUrl('https://notion.so'); router.push('/dashboard?url=https%3A%2F%2Fnotion.so'); }}>notion.so</button>
        </div>
      </section>

      <section id="features" className={s.section} style={{ background: 'var(--bg-soft)' }}>
        <h2 className={s.sectionTitle}>What It Detects</h2>
        <p className={s.sectionSubtitle}>
          50+ technology signatures with confidence scoring. From frameworks to security posture.
        </p>
        <div className={s.featuresGrid}>
          {FEATURES.map((f) => (
            <div key={f.title} className={s.featureCard}>
              <div className={s.featureIconWrapper}>{f.icon}</div>
              <h3 className={s.featureTitle}>{f.title}</h3>
              <p className={s.featureDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how-it-works" className={s.section}>
        <h2 className={s.sectionTitle}>How It Works</h2>
        <p className={s.sectionSubtitle}>
          From URL to comprehensive tech stack report in seconds.
        </p>
        <div className={s.steps}>
          <div className={s.step}>
            <div className={s.stepNum}>1</div>
            <div className={s.stepContent}>
              <h3 className={s.stepTitle}>Enter a URL</h3>
              <p className={s.stepDesc}>Paste any public website URL into BundleRadar.</p>
            </div>
          </div>
          <div className={s.step}>
            <div className={s.stepNum}>2</div>
            <div className={s.stepContent}>
              <h3 className={s.stepTitle}>Stealth Browser Render</h3>
              <p className={s.stepDesc}>TinyFish&apos;s Mino agent loads the page like a real user, bypassing bot detection.</p>
            </div>
          </div>
          <div className={s.step}>
            <div className={s.stepNum}>3</div>
            <div className={s.stepContent}>
              <h3 className={s.stepTitle}>5 Extraction Passes</h3>
              <p className={s.stepDesc}>Bundle intelligence, resources, infrastructure, runtime config, and security signals.</p>
            </div>
          </div>
          <div className={s.step}>
            <div className={s.stepNum}>4</div>
            <div className={s.stepContent}>
              <h3 className={s.stepTitle}>Signature Detection</h3>
              <p className={s.stepDesc}>50+ technology signatures matched with confidence scoring.</p>
            </div>
          </div>
          <div className={s.step}>
            <div className={s.stepNum}>5</div>
            <div className={s.stepContent}>
              <h3 className={s.stepTitle}>LLM Synthesis</h3>
              <p className={s.stepDesc}>AI generates a technical summary, architecture diagram, and competitive insights.</p>
            </div>
          </div>
        </div>
      </section>

      <footer className={s.footer}>
        <div className={s.footerInner}>
          <div className={s.footerLeft}>
            <span className={s.landingLogo} style={{ fontSize: 16 }}>🐟 BundleRadar</span>
            <span className={s.footerBrand}>
              Built with <span className={s.footerMino}>Mino</span> by TinyFish Solutions
            </span>
          </div>
          <div className={s.footerLinks}>
            <a href="https://mino.ai" target="_blank" className={s.footerLink}>TinyFish</a>
            <a href="https://docs.mino.ai" target="_blank" className={s.footerLink}>Documentation</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
