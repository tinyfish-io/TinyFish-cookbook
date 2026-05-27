'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ScanResultView } from '@/components/ScanResultView';
import { ScanResult } from '@/types';
import s from '@/app/page.module.css';

export default function ScanDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [scan, setScan] = useState<{
    id: string;
    url: string;
    status: string;
    result: ScanResult | null;
    error: string | null;
  } | null>(null);
  const id = params.id;

  useEffect(() => {
    if (!id) return;
    fetch(`/api/scans/${id}`)
      .then((r) => r.json())
      .then(setScan)
      .catch(() => setScan(null));
  }, [id]);

  if (!scan) {
    return (
      <div className={s.page}>
        <header className={s.header}>
          <div className={s.headerInner}>
            <Link href="/dashboard" className={s.logoGroup}>
              <span className={s.logoRadar}>◉</span>
              <span className={s.logoName}>BundleRadar</span>
            </Link>
          </div>
        </header>
        <div style={{ padding: 48, textAlign: 'center' }}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (scan.status === 'failed') {
    return (
      <div className={s.page}>
        <header className={s.header}>
          <div className={s.headerInner}>
            <Link href="/dashboard" className={s.logoGroup}>
              <span className={s.logoRadar}>◉</span>
              <span className={s.logoName}>BundleRadar</span>
            </Link>
          </div>
        </header>
        <div style={{ padding: 48, maxWidth: 600, margin: '0 auto' }}>
          <h2>Scan failed</h2>
          <p style={{ color: 'var(--text-secondary)' }}>{scan.error}</p>
          <Link href="/dashboard" style={{ color: 'var(--green)', fontSize: 14 }}>← Back to dashboard</Link>
        </div>
      </div>
    );
  }

  if (scan.status !== 'completed' || !scan.result) {
    return (
      <div className={s.page}>
        <header className={s.header}>
          <div className={s.headerInner}>
            <Link href="/dashboard" className={s.logoGroup}>
              <span className={s.logoRadar}>◉</span>
              <span className={s.logoName}>BundleRadar</span>
            </Link>
          </div>
        </header>
        <div style={{ padding: 48, textAlign: 'center' }}>
          <p>Scan is {scan.status}. {scan.status === 'pending' || scan.status === 'running' ? 'Refresh in a moment.' : ''}</p>
          <Link href="/dashboard" style={{ color: 'var(--green)', fontSize: 14 }}>← Back to dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={s.page}>
      <header className={s.header}>
        <div className={s.headerInner}>
          <Link href="/dashboard" className={s.logoGroup}>
            <span className={s.logoRadar}>◉</span>
            <span className={s.logoName}>BundleRadar</span>
            <span className={s.logoDash}>—</span>
            <span className={s.logoTag}>Frontend Intelligence</span>
          </Link>
          <div>
            <Link href="/dashboard" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Dashboard</Link>
          </div>
        </div>
      </header>
      <ScanResultView result={scan.result as ScanResult} onNewScan={() => router.push('/dashboard')} />
    </div>
  );
}
