'use client';

import { useState } from 'react';
import {
  Share2,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Server,
  BarChart3,
  Lightbulb,
  ChevronDown,
  ChevronRight,
  Globe,
  Layers,
  Cpu,
  FileCode2,
  CheckCircle2,
  XCircle,
  MinusCircle,
} from 'lucide-react';
import {
  ScanResult,
  Detection,
  DetectionCategory,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
} from '@/types';
import { MermaidDiagram } from '@/components/MermaidDiagram';
import s from '@/app/page.module.css';

/* ── helpers ─────────────────────────────────────────────── */
function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

function confidenceColor(c: string) {
  if (c === 'high') return 'var(--green)';
  if (c === 'medium') return 'var(--amber)';
  return 'var(--text-tertiary)';
}

function confidenceBg(c: string) {
  if (c === 'high') return 'var(--green-bg)';
  if (c === 'medium') return 'var(--amber-bg)';
  return 'var(--bg-secondary)';
}

function groupDetections(detections: Detection[]) {
  const groups: Record<string, Detection[]> = {};
  for (const d of detections) {
    if (!groups[d.category]) groups[d.category] = [];
    groups[d.category].push(d);
  }
  // Sort by count descending
  return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
}

/* ── sub-components ──────────────────────────────────────── */

function CollapsibleSection({
  title,
  icon,
  defaultOpen = true,
  badge,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={s.resultSection}>
      <button className={s.sectionToggle} onClick={() => setOpen(!open)}>
        <div className={s.sectionToggleLeft}>
          <span className={s.sectionIcon}>{icon}</span>
          <h3 className={s.sectionTitle} style={{ marginBottom: 0 }}>{title}</h3>
          {badge}
        </div>
        {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
      </button>
      {open && <div className={s.sectionBody}>{children}</div>}
    </section>
  );
}

function ConfidenceBadge({ confidence }: { confidence: string }) {
  return (
    <span
      className={s.confidenceBadge}
      style={{
        color: confidenceColor(confidence),
        background: confidenceBg(confidence),
      }}
    >
      {confidence}
    </span>
  );
}

function StatusIndicator({ ok, label }: { ok: boolean | null; label: string }) {
  return (
    <div className={s.statusRow}>
      {ok === true && <CheckCircle2 size={16} style={{ color: 'var(--green)' }} />}
      {ok === false && <XCircle size={16} style={{ color: 'var(--red)' }} />}
      {ok === null && <MinusCircle size={16} style={{ color: 'var(--text-dim)' }} />}
      <span>{label}</span>
    </div>
  );
}

/* ── main component ──────────────────────────────────────── */

export function ScanResultView({
  result,
  onNewScan,
}: {
  result: ScanResult;
  onNewScan?: () => void;
}) {
  const score = result.securitySignals
    ? 100 -
    result.securitySignals.exposedKeys.length * 20 -
    (result.securitySignals.sourceMapsExposed ? 15 : 0)
    : 85;

  const scoreColor =
    score >= 80 ? 'var(--green)' : score >= 50 ? 'var(--amber)' : 'var(--red)';

  const grouped = groupDetections(result.detections);

  return (
    <main className={s.results}>
      {/* ── Warnings Banner ──────────────────────────────── */}
      {result.warnings && result.warnings.length > 0 && (
        <div className={s.warningsBanner}>
          <AlertTriangle size={18} />
          <div>
            {result.warnings.map((w, i) => (
              <p key={i}>{w}</p>
            ))}
          </div>
        </div>
      )}

      {/* ── Scan Header ──────────────────────────────────── */}
      <section className={s.resultSection}>
        <div className={s.resultHeaderBadges}>
          <div className={s.securityBadge} style={{ background: '#ecfdf5', borderColor: '#10b981', color: '#059669' }}>
            Scan Complete
          </div>
          <div
            className={s.securityBadge}
            style={{
              background: score >= 80 ? '#ecfdf5' : score >= 50 ? '#fffbeb' : '#fef2f2',
              borderColor: scoreColor,
              color: scoreColor,
            }}
          >
            <ShieldCheck size={16} /> Security: {Math.max(0, score)}/100
          </div>
        </div>
        <h2 className={s.resultTitle}>
          {result.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
        </h2>
        <div className={s.scanMeta} style={{ justifyContent: 'center', marginTop: 8 }}>
          <span>{result.detections.length} technologies</span>
          <span>•</span>
          <span>{(result.scanDuration / 1000).toFixed(1)}s scan</span>
          <span>•</span>
          <span>{new Date(result.timestamp).toLocaleDateString()}</span>
        </div>
      </section>

      {/* ── Technical Summary ────────────────────────────── */}
      {result.techStackSummary && (
        <CollapsibleSection title="Technical Summary" icon={<FileCode2 size={20} />}>
          <p className={s.summaryText}>{result.techStackSummary}</p>
        </CollapsibleSection>
      )}

      {/* ── Architecture Diagram (always shown; fallback when missing) ── */}
      <CollapsibleSection title="Architecture Diagram" icon={<Layers size={20} />}>
        {(() => {
          const diagram = result.architectureDiagram ?? '';
          return diagram.trim().length > 0 ? (
            <MermaidDiagram chart={diagram} className={s.diagramBlock} />
          ) : (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 14 }}>
              Architecture diagram is not available for this scan (e.g. older or partial result).
            </div>
          );
        })()}
      </CollapsibleSection>

      {/* ── Detected Technologies (grouped) ──────────────── */}
      <CollapsibleSection
        title="Detected Technologies"
        icon={<Cpu size={20} />}
        badge={
          <span className={s.sectionCount}>{result.detections.length}</span>
        }
      >
        <div className={s.categoryGroups}>
          {grouped.map(([category, dets]) => (
            <div key={category} className={s.categoryGroup}>
              <div className={s.categoryHeader}>
                <span className={s.categoryIcon}>
                  {CATEGORY_ICONS[category as DetectionCategory] || '•'}
                </span>
                <span className={s.categoryLabel}>
                  {CATEGORY_LABELS[category as DetectionCategory] || category}
                </span>
                <span className={s.categoryCount}>{dets.length}</span>
              </div>
              <div className={s.categoryDetections}>
                {dets.map((d, i) => (
                  <div key={i} className={s.detectionCard}>
                    <div>
                      <div className={s.detName}>
                        {d.name}
                        {d.version && (
                          <span className={s.detVersion}>v{d.version}</span>
                        )}
                      </div>
                      {d.evidence && (
                        <div className={s.detEvidence}>{d.evidence}</div>
                      )}
                    </div>
                    <ConfidenceBadge confidence={d.confidence} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* ── Competitive Insights ──────────────────────────── */}
      {result.competitiveInsights && result.competitiveInsights.length > 0 && (
        <CollapsibleSection title="Competitive Insights" icon={<Lightbulb size={20} />}>
          <div className={s.insightsGrid}>
            {result.competitiveInsights.map((insight, i) => (
              <div key={i} className={s.insightCard}>
                <span className={s.insightNum}>{i + 1}</span>
                <p>{insight}</p>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* ── Security Signals ─────────────────────────────── */}
      {result.securitySignals && (
        <CollapsibleSection
          title="Security Signals"
          icon={<ShieldAlert size={20} />}
          badge={
            <span
              className={s.sectionCount}
              style={{ background: scoreColor, color: 'white' }}
            >
              {Math.max(0, score)}/100
            </span>
          }
        >
          <div className={s.securityGrid}>
            <StatusIndicator
              ok={result.securitySignals.cspHeader !== null}
              label={
                result.securitySignals.cspHeader
                  ? `CSP: configured`
                  : 'CSP: not detected'
              }
            />
            <StatusIndicator
              ok={result.securitySignals.hstsHeader}
              label={
                result.securitySignals.hstsHeader
                  ? 'HSTS: enabled'
                  : 'HSTS: not enabled'
              }
            />
            <StatusIndicator
              ok={result.securitySignals.xFrameOptions !== null}
              label={
                result.securitySignals.xFrameOptions
                  ? `X-Frame-Options: ${result.securitySignals.xFrameOptions}`
                  : 'X-Frame-Options: not set'
              }
            />
            <StatusIndicator
              ok={!result.securitySignals.sourceMapsExposed}
              label={
                result.securitySignals.sourceMapsExposed
                  ? 'Source maps: EXPOSED ⚠️'
                  : 'Source maps: protected'
              }
            />
            {result.securitySignals.cors && (
              <StatusIndicator ok={null} label={`CORS: ${result.securitySignals.cors}`} />
            )}
          </div>

          {result.securitySignals.exposedKeys.length > 0 && (
            <div className={s.exposedKeysSection}>
              <h4 className={s.exposedKeysTitle}>
                <AlertTriangle size={14} /> Exposed Keys ({result.securitySignals.exposedKeys.length})
              </h4>
              <div className={s.exposedKeysList}>
                {result.securitySignals.exposedKeys.map((k, i) => (
                  <div key={i} className={s.exposedKeyItem}>
                    <span className={s.exposedKeyType}>{k.type}</span>
                    <code className={s.exposedKeyPartial}>{k.partial}</code>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CollapsibleSection>
      )}

      {/* ── Infrastructure Profile ───────────────────────── */}
      {result.infraProfile && (
        <CollapsibleSection title="Infrastructure" icon={<Server size={20} />}>
          <div className={s.infraGrid}>
            <div className={s.infraItem}>
              <span className={s.infraLabel}>Hosting</span>
              <span className={s.infraValue}>
                {result.infraProfile.hostingPlatform?.name || 'Unknown'}
              </span>
            </div>
            <div className={s.infraItem}>
              <span className={s.infraLabel}>CDN</span>
              <span className={s.infraValue}>
                {result.infraProfile.cdn?.name || 'Unknown'}
              </span>
            </div>
            <div className={s.infraItem}>
              <span className={s.infraLabel}>Server</span>
              <span className={s.infraValue}>
                {result.infraProfile.serverHeader || 'Not disclosed'}
              </span>
            </div>
            {result.infraProfile.tlsVersion && (
              <div className={s.infraItem}>
                <span className={s.infraLabel}>TLS</span>
                <span className={s.infraValue}>{result.infraProfile.tlsVersion}</span>
              </div>
            )}
          </div>
          {result.infraProfile.deploymentSignals.length > 0 && (
            <div className={s.deploySignals}>
              <span className={s.infraLabel}>Deployment Signals</span>
              <div className={s.pillRow}>
                {result.infraProfile.deploymentSignals.map((sig, i) => (
                  <span key={i} className={s.infoPill}>{sig}</span>
                ))}
              </div>
            </div>
          )}
        </CollapsibleSection>
      )}

      {/* ── Performance Signals ──────────────────────────── */}
      {result.performanceSignals && (
        <CollapsibleSection title="Performance Signals" icon={<BarChart3 size={20} />}>
          <div className={s.perfGrid}>
            <div className={s.perfCard}>
              <div className={s.perfValue}>{result.performanceSignals.jsChunkCount}</div>
              <div className={s.perfLabel}>JS Chunks</div>
            </div>
            <div className={s.perfCard}>
              <div className={s.perfValue}>{result.performanceSignals.cssFileCount}</div>
              <div className={s.perfLabel}>CSS Files</div>
            </div>
            <div className={s.perfCard}>
              <div className={s.perfValue}>{result.performanceSignals.imageCount}</div>
              <div className={s.perfLabel}>Images</div>
            </div>
            <div className={s.perfCard}>
              <div className={s.perfValue}>{result.performanceSignals.fontCount}</div>
              <div className={s.perfLabel}>Fonts</div>
            </div>
            <div className={s.perfCard}>
              <div className={s.perfValue}>{result.performanceSignals.totalRequests}</div>
              <div className={s.perfLabel}>Total Requests</div>
            </div>
            <div className={s.perfCard}>
              <div className={s.perfValue}>
                {result.performanceSignals.serviceWorker ? '✓' : '✗'}
              </div>
              <div className={s.perfLabel}>Service Worker</div>
            </div>
          </div>
          {result.performanceSignals.preloadHints.length > 0 && (
            <div className={s.deploySignals}>
              <span className={s.infraLabel}>Preload Hints</span>
              <div className={s.pillRow}>
                {result.performanceSignals.preloadHints.map((h, i) => (
                  <span key={i} className={s.infoPill}>{h}</span>
                ))}
              </div>
            </div>
          )}
        </CollapsibleSection>
      )}

      {/* ── Footer Actions ───────────────────────────────── */}
      <div className={s.resultActions}>
        <button className={s.newScanTopBtn} onClick={onNewScan} style={{ margin: 0 }}>
          New Scan
        </button>
        <button
          className={s.newScanTopBtn}
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            alert('Link copied!');
          }}
          style={{ margin: 0, gap: 8 }}
        >
          <Share2 size={16} /> Share Result
        </button>
      </div>
    </main>
  );
}
