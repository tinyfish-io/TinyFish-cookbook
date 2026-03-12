'use client';

import { useEffect, useId, useRef, useState } from 'react';

const RENDER_TIMEOUT_MS = 12_000;

interface MermaidDiagramProps {
  chart: string;
  className?: string;
}

export function MermaidDiagram({ chart, className }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const stableId = useId().replace(/:/g, '-');
  const renderCountRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    // Clear previous render immediately so stale SVG is removed from DOM
    // before Mermaid creates a new temporary element (prevents duplicate IDs).
    setSvg('');
    setError(null);

    async function render() {
      try {
        // Dynamic import so mermaid is only loaded client-side
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          themeVariables: {
            primaryColor: '#1a1a2e',
            primaryTextColor: '#e0e0e0',
            primaryBorderColor: '#00d4aa',
            lineColor: '#00d4aa',
            secondaryColor: '#16213e',
            tertiaryColor: '#0f3460',
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
            fontSize: '13px',
          },
          flowchart: {
            htmlLabels: true,
            curve: 'basis',
            padding: 16,
          },
        });

        // Unique ID per render attempt prevents conflicts with stale SVG elements
        renderCountRef.current += 1;
        const id = `mermaid-${stableId}-${renderCountRef.current}`;
        const renderPromise = mermaid.render(id, chart);
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Diagram render timed out')), RENDER_TIMEOUT_MS)
        );
        const { svg: rendered } = await Promise.race([renderPromise, timeoutPromise]);
        if (!cancelled) {
          setSvg(rendered);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[MermaidDiagram] render failed', err);
          setError(err instanceof Error ? err.message : 'Failed to render diagram');
        }
      }
    }

    if (chart.trim()) {
      render();
    }

    return () => { cancelled = true; };
  }, [chart, stableId]);

  if (error) {
    return (
      <div className={className}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginBottom: 8 }}>
          Diagram could not be rendered. Raw Mermaid:
        </p>
        <pre style={{ color: 'var(--text-secondary)', fontSize: 12, overflow: 'auto', margin: 0 }}>
          {chart}
        </pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className={className} style={{ padding: 24, textAlign: 'center', color: 'var(--text-tertiary)' }}>
        Rendering diagram...
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      dangerouslySetInnerHTML={{ __html: svg }}
      style={{ display: 'flex', justifyContent: 'center', overflow: 'auto' }}
    />
  );
}
