'use client';

import { useState } from 'react';
import type { StreamingPreview } from '@/hooks/use-bike-search';

const MAX_VISIBLE = 5;

function getHostname(url: string): string {
  try { return new URL(url).hostname.replace('www.', ''); } catch { return url; }
}

interface LivePreviewGridProps {
  previews: StreamingPreview[];
}

export function LivePreviewGrid({ previews }: LivePreviewGridProps) {
  const [expanded, setExpanded] = useState(true);

  if (previews.length === 0 || previews.every(p => p.done)) return null;

  const activeCount = previews.filter(p => !p.done).length;
  const doneCount   = previews.filter(p =>  p.done).length;

  // Only render ACTIVE iframes — done agents are removed from DOM to free memory.
  // Each live TinyFish iframe is a real browser session; keeping done ones wastes resources.
  const active    = previews.filter(p => !p.done);
  const recent    = [...active].reverse();
  const visible   = expanded ? recent.slice(0, MAX_VISIBLE) : recent.slice(0, 1);
  const moreCount = Math.min(active.length, MAX_VISIBLE) - 1;

  return (
    <div className="space-y-3">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />
          Live Browser Agents
        </p>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 text-xs">
            {activeCount > 0 && (
              <span className="flex items-center gap-1 text-orange-500 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse inline-block" />
                {activeCount} running
              </span>
            )}
            {doneCount > 0 && (
              <span className="flex items-center gap-1 text-green-600 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                {doneCount} done
              </span>
            )}
          </div>
          {moreCount > 0 && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="text-xs text-zinc-500 hover:text-zinc-800 border border-zinc-200 hover:border-zinc-400 rounded-md px-2.5 py-1 transition-colors"
            >
              {expanded ? '− Show less' : `+ Show ${moreCount} more agent${moreCount > 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      </div>

      {/* Iframe grid */}
      <div className={`grid gap-3 ${expanded ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
        {visible.map(({ siteUrl, streamingUrl, done }) => (
          <div
            key={siteUrl}
            className={`rounded-xl overflow-hidden border transition-all duration-500 ${
              done ? 'border-green-200 opacity-60' : 'border-zinc-200 shadow-sm'
            }`}
          >
            <div className={`flex items-center justify-between px-3 py-2 border-b text-xs font-medium ${
              done ? 'bg-green-50 border-green-100' : 'bg-zinc-100 border-zinc-200'
            }`}>
              <span className="truncate text-zinc-700 max-w-[140px]">
                {getHostname(siteUrl)}
              </span>
              {done ? (
                <span className="text-green-600 flex items-center gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                  Done
                </span>
              ) : (
                <span className="text-orange-500 flex items-center gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse inline-block" />
                  Live
                </span>
              )}
            </div>
            <iframe
              src={streamingUrl}
              className={`w-full border-0 bg-zinc-50 ${expanded ? 'h-44' : 'h-72'}`}
              title={`TinyFish agent: ${getHostname(siteUrl)}`}
              loading="eager"
            />
          </div>
        ))}
      </div>

      {!expanded && moreCount > 0 && (
        <p className="text-xs text-zinc-400 text-center">
          {previews.length} agents running in parallel —{' '}
          <button
            onClick={() => setExpanded(true)}
            className="underline hover:text-zinc-600 transition-colors"
          >
            show all
          </button>
          <span className="ml-1 text-zinc-300">(may be slow on older devices)</span>
        </p>
      )}

    </div>
  );
}
