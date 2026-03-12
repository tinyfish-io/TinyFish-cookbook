'use client';

import React, { useState, useCallback, useRef, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Trash2, ExternalLink, Clock, Zap, Check, ArrowRight, Radar } from 'lucide-react';
import { ScanResult, ScanProgress } from '@/types';
import { ScanResultView } from '@/components/ScanResultView';
import s from '../page.module.css';

function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

const PASSES = [
  { id: 'init', label: 'Connecting' },
  { id: 'extracting', label: 'Extracting Page Signals' },
  { id: 'analyzing', label: 'Signature Detection' },
  { id: 'synthesizing', label: 'AI Synthesis' },
  { id: 'complete', label: 'Complete' },
];

function ScanProgressDisplay({ progress }: { progress: ScanProgress }) {
  const stageMap: Record<string, number> = {
    'init': 0,
    'extracting': 1,
    'analyzing': 2,
    'synthesizing': 3,
    'complete': 4,
  };
  const activeIdx = stageMap[progress.stage] ?? 0;

  return (
    <div className={s.scanningContainer}>
      <div className={s.scanningHeader}>
        <span className={s.scanningTitle}>
          <Radar size={18} className={s.scanningPulse} /> Scanning...
        </span>
        <span className={s.scanningPct}>{progress.progress}%</span>
      </div>
      <div className={s.progressBarOuter}>
        <div className={s.progressBarInner} style={{ width: `${progress.progress}%` }} />
      </div>

      <div className={s.passesList}>
        {PASSES.map((pass, i) => {
          const isDone = i < activeIdx;
          const isActive = i === activeIdx;
          return (
            <div key={pass.id} className={cn(s.passItem, isActive && s.passItemActive)}>
              <div className={cn(s.passIcon, isDone && s.passIconDone)}>
                {isDone ? <Check size={12} /> : <span>{i + 1}</span>}
              </div>
              <span className={s.passLabel}>{pass.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className={s.page}><div style={{ padding: 80, textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading...</div></div>}>
      <DashboardInner />
    </Suspense>
  );
}

function DashboardInner() {
  const searchParams = useSearchParams();
  const prefillUrl = searchParams.get('url') || '';

  const [url, setUrl] = useState(prefillUrl);
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<{ used: number; limit: number; plan: string } | null>(null);
  const [scans, setScans] = useState<{ id: string; url: string; status: string; createdAt: string; techCount: number | null }[]>([]);
  const [configError, setConfigError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchUsage = useCallback(async () => {
    try {
      const r = await fetch('/api/usage');
      if (r.status === 503) {
        const d = await r.json().catch(() => ({}));
        if (d.code === 'DATABASE_NOT_CONFIGURED') setConfigError(d.error || 'Database not configured.');
        return;
      }
      if (r.ok) {
        const d = await r.json();
        setUsage({ used: d.used, limit: d.limit, plan: d.planName });
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchScans = useCallback(async () => {
    try {
      const r = await fetch('/api/scans');
      if (r.status === 503) {
        const d = await r.json().catch(() => ({}));
        if (d.code === 'DATABASE_NOT_CONFIGURED') setConfigError(d.error || 'Database not configured.');
        return;
      }
      if (r.ok) {
        const d = await r.json();
        setScans(d.scans);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchUsage();
    fetchScans();
  }, [fetchUsage, fetchScans]);

  const deleteScan = useCallback(async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this scan?')) return;

    try {
      const r = await fetch(`/api/scans/${id}`, { method: 'DELETE' });
      if (r.ok) {
        setScans((prev) => prev.filter((scan) => scan.id !== id));
        fetchUsage();
      }
    } catch {
      alert('Failed to delete scan');
    }
  }, [fetchUsage]);

  const startScan = useCallback(async () => {
    if (!url.trim()) return;
    setIsScanning(true);
    setError(null);
    setResult(null);
    setProgress({ stage: 'init', detail: 'Connecting...', progress: 0 });
    abortRef.current = new AbortController();

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) throw new Error('Sign in required');
        if (res.status === 402) throw new Error(data.error || 'Scan limit reached. Upgrade for more.');
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      let currentEvent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('event:')) currentEvent = line.slice(6).trim();
          else if (line.startsWith('data:')) {
            try {
              const parsed = JSON.parse(line.slice(5).trim());
              if (currentEvent === 'progress') setProgress(parsed);
              else if (currentEvent === 'complete') {
                setResult(parsed);
                fetchUsage();
                fetchScans();
              } else if (currentEvent === 'error') throw new Error(parsed?.error ?? 'Something went wrong');
            } catch (e) {
              if (e instanceof SyntaxError) continue;
              throw e;
            }
          }
        }
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return;
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setIsScanning(false);
      setProgress(null);
    }
  }, [url, fetchUsage, fetchScans]);

  const stopScan = useCallback(() => {
    abortRef.current?.abort();
    setIsScanning(false);
    setProgress(null);
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setUrl('');
    setError(null);
  }, []);

  const Header = () => (
    <header className={s.header}>
      <div className={s.headerInner}>
        <Link href="/" className={s.logoGroup} style={{ textDecoration: 'none' }}>
          <span style={{ fontSize: 24, marginRight: 8 }}>🐟</span>
          <span className={s.logoName}>BundleRadar</span>
        </Link>
        <div className={s.headerRight}>
          {usage && (
            <span className={s.usageBadge}>
              {usage.used}/{usage.limit} scans • {usage.plan}
            </span>
          )}
        </div>
      </div>
    </header>
  );

  if (result) {
    return (
      <div className={s.page}>
        <Header />
        {configError && (
          <div role="alert" style={{ margin: '0 24px 16px', padding: '12px 16px', background: '#fef3c7', borderRadius: 8, fontSize: 14 }}>
            {configError}
          </div>
        )}
        <ScanResultView result={result} onNewScan={reset} />
      </div>
    );
  }

  return (
    <div className={s.page}>
      <Header />

      {configError && (
        <div role="alert" style={{
          margin: '0 24px 16px',
          padding: '12px 16px',
          background: 'var(--surface-warning, #fef3c7)',
          color: 'var(--text-primary, #1f2937)',
          borderRadius: 8,
          fontSize: 14,
        }}>
          {configError}
        </div>
      )}

      <section className={s.hero}>
        {isScanning ? (
          progress && <ScanProgressDisplay progress={progress} />
        ) : (
          <div className={s.dashboardHeroContent}>
            <h1 className={s.dashboardTitle}>Run a new technical audit</h1>
            <div className={s.dashboardSearchBox}>
              <input
                type="text"
                className={s.urlInput}
                placeholder="https://competitor.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && startScan()}
              />
              <button
                className={s.scanBtn}
                onClick={startScan}
                disabled={!url.trim()}
              >
                Scan <ArrowRight size={18} />
              </button>
            </div>

            {error && (
              <div className={s.errorBanner}>
                <span className={s.errorLabel}>SCAN ERROR:</span> {error}
              </div>
            )}
          </div>
        )}
      </section>

      {!isScanning && (
        <section className={s.historySection}>
          <div className={s.historyHeader}>
            <h3 className={s.historyTitle}>Recent scans</h3>
            <span className={s.historyCount}>{scans.length} total</span>
          </div>

          <div className={s.historyList}>
            {scans.length === 0 ? (
              <div className={s.emptyState}>
                <div className={s.emptyIcon}>🐟</div>
                <p className={s.emptyTitle}>No scan history yet</p>
                <p className={s.emptyDesc}>Enter a URL above to run your first tech stack audit.</p>
              </div>
            ) : (
              scans.map((scan) => (
                <Link key={scan.id} href={`/scans/${scan.id}`} className={s.scanCard}>
                  <div>
                    <span className={s.scanUrl}>{scan.url}</span>
                    <div className={s.scanMeta}>
                      <span className={s.scanMetaItem}>
                        <Clock size={12} /> {new Date(scan.createdAt).toLocaleDateString()}
                      </span>
                      {scan.techCount != null && (
                        <span className={s.scanMetaItemAccent}>
                          <Zap size={12} /> {scan.techCount} technologies
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={s.scanActions}>
                    <button
                      onClick={(e) => deleteScan(scan.id, e)}
                      className={s.scanDeleteBtn}
                    >
                      <Trash2 size={16} />
                    </button>
                    <ExternalLink size={16} className={s.scanCardArrow} />
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
}
