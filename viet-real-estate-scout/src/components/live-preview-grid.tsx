'use client';

import { useState } from 'react';
import { t } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import type { StreamingPreview } from '@/hooks/use-property-search';
import { ChevronDown, ChevronUp } from 'lucide-react';

const MAX_VISIBLE = 5;

function getHostname(url: string): string {
  try { return new URL(url).hostname.replace('www.', ''); } catch { return url; }
}

interface LivePreviewGridProps {
  previews: StreamingPreview[];
  locale: Locale;
}

export function LivePreviewGrid({ previews, locale }: LivePreviewGridProps) {
  const [expanded, setExpanded] = useState(true);

  if (previews.length === 0 || previews.every(p => p.done)) return null;

  const activeCount = previews.filter(p => !p.done).length;
  const doneCount   = previews.filter(p =>  p.done).length;

  const active    = previews.filter(p => !p.done);
  const recent    = [...active].reverse();
  const visible   = expanded ? recent.slice(0, MAX_VISIBLE) : recent.slice(0, 1);
  const moreCount = Math.min(active.length, MAX_VISIBLE) - 1;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs font-semibold text-teal-500 uppercase tracking-wide flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse inline-block" />
          {t(locale, 'liveAgents')}
        </p>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 text-xs">
            {activeCount > 0 && (
              <span className="flex items-center gap-1 text-orange-500 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse inline-block" />
                {activeCount} {t(locale, 'running')}
              </span>
            )}
            {doneCount > 0 && (
              <span className="flex items-center gap-1 text-green-600 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                {doneCount} {t(locale, 'done')}
              </span>
            )}
          </div>
          {moreCount > 0 && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800 border border-teal-200 hover:border-teal-400 rounded-md px-2.5 py-1 transition-colors"
            >
              {expanded ? (
                <><ChevronUp className="w-3 h-3" /> {t(locale, 'collapse')}</>
              ) : (
                <><ChevronDown className="w-3 h-3" /> {t(locale, 'showMore')} {moreCount}</>
              )}
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
              done ? 'border-green-200 opacity-60' : 'border-teal-200 shadow-sm'
            }`}
          >
            <div className={`flex items-center justify-between px-3 py-2 border-b text-xs font-medium ${
              done ? 'bg-green-50 border-green-100' : 'bg-teal-50 border-teal-100'
            }`}>
              <span className="truncate text-teal-700 max-w-[140px]">
                {getHostname(siteUrl)}
              </span>
              {done ? (
                <span className="text-green-600 flex items-center gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                  {t(locale, 'done')}
                </span>
              ) : (
                <span className="text-teal-600 flex items-center gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse inline-block" />
                  {t(locale, 'live')}
                </span>
              )}
            </div>
            <iframe
              src={streamingUrl}
              className={`w-full border-0 bg-teal-50/30 ${expanded ? 'h-44' : 'h-72'}`}
              title={`TinyFish agent: ${getHostname(siteUrl)}`}
              loading="eager"
            />
          </div>
        ))}
      </div>

      {!expanded && moreCount > 0 && (
        <p className="text-xs text-teal-400 text-center">
          {previews.length} agents —{' '}
          <button
            onClick={() => setExpanded(true)}
            className="underline hover:text-teal-600 transition-colors"
          >
            {t(locale, 'showMore')}
          </button>
        </p>
      )}
    </div>
  );
}
