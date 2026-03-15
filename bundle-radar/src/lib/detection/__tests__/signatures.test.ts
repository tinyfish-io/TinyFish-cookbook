import { describe, it, expect } from 'vitest';
import { runDetection } from '../signatures';

const emptyRaw = {
  globalVariables: [] as string[],
  scripts: [] as { src: string }[],
  domSignals: [] as string[],
  metaTags: [] as { name: string; content: string }[],
  responseHeaders: {} as Record<string, string>,
  allPaths: [] as string[],
  inlineScriptSnippets: [] as string[],
};

describe('runDetection', () => {
  it('returns empty array when no signals match', () => {
    const result = runDetection(emptyRaw);
    expect(result).toEqual([]);
  });

  it('detects Next.js from global variable __NEXT_DATA__', () => {
    const result = runDetection({
      ...emptyRaw,
      globalVariables: ['__NEXT_DATA__'],
    });
    const next = result.find((d) => d.name === 'Next.js');
    expect(next).toBeDefined();
    expect(next?.category).toBe('framework');
    expect(['medium', 'high']).toContain(next?.confidence);
  });

  it('detects Next.js from script path _next/static', () => {
    const result = runDetection({
      ...emptyRaw,
      scripts: [{ src: 'https://example.com/_next/static/chunks/main.js' }],
    });
    const next = result.find((d) => d.name === 'Next.js');
    expect(next).toBeDefined();
  });

  it('detects React from dom signals', () => {
    const result = runDetection({
      ...emptyRaw,
      domSignals: ['data-reactroot', 'data-react-helmet'],
    });
    const react = result.find((d) => d.name === 'React');
    expect(react).toBeDefined();
    expect(react?.category).toBe('framework');
  });

  it('detects Vercel from x-vercel-id header', () => {
    const result = runDetection({
      ...emptyRaw,
      responseHeaders: { 'x-vercel-id': 'iad1::abc-123' },
    });
    const vercel = result.find((d) => d.name === 'Vercel');
    expect(vercel).toBeDefined();
    expect(vercel?.category).toBe('cdn-hosting');
  });

  it('detects multiple technologies when multiple signals present', () => {
    const result = runDetection({
      ...emptyRaw,
      globalVariables: ['__NEXT_DATA__', 'gtag', 'dataLayer'],
      scripts: [{ src: 'https://googletagmanager.com/gtag/js' }],
      responseHeaders: { 'x-vercel-id': 'foo' },
    });
    expect(result.some((d) => d.name === 'Next.js')).toBe(true);
    expect(result.some((d) => d.name === 'Google Analytics (GA4)')).toBe(true);
    expect(result.some((d) => d.name === 'Vercel')).toBe(true);
  });

  it('uses meta generator for Gatsby', () => {
    const result = runDetection({
      ...emptyRaw,
      metaTags: [{ name: 'generator', content: 'Gatsby 5.0.0' }],
    });
    const gatsby = result.find((d) => d.name === 'Gatsby');
    expect(gatsby).toBeDefined();
  });
});
