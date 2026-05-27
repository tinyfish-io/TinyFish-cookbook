'use client';

import {
  Monitor,
  ExternalLink,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  Database,
  Download,
  Key,
  FileText,
  Maximize2,
  AlertTriangle,
  SearchX,
  RefreshCw,
  WifiOff,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AgentState } from '@/lib/types';

interface AgentCardProps {
  agent: AgentState;
  onExpandPreview: (streamingUrl: string, name: string) => void;
  onRetry?: () => void;
}

const statusConfig = {
  pending: { icon: Loader2, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Queued' },
  connecting: { icon: Loader2, color: 'text-primary', bg: 'bg-primary/10', label: 'Connecting' },
  browsing: { icon: Monitor, color: 'text-primary', bg: 'bg-primary/10', label: 'Browsing' },
  analyzing: { icon: Loader2, color: 'text-primary', bg: 'bg-primary/10', label: 'Analyzing' },
  complete: { icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', label: 'Found' },
  blocked: { icon: ShieldAlert, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', label: 'Blocked' },
  not_found: { icon: SearchX, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Not Found' },
  error: { icon: WifiOff, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Failed' },
};

const accessIcons: Record<string, typeof Database> = {
  'Direct Download': Download,
  'API': Key,
  'Request Required': FileText,
  'Unknown': Database,
};

const isTerminal = (status: AgentState['status']) =>
  ['complete', 'blocked', 'not_found', 'error'].includes(status);

const isActive = (status: AgentState['status']) =>
  ['connecting', 'browsing', 'analyzing'].includes(status);

export function AgentCard({ agent, onExpandPreview, onRetry }: AgentCardProps) {
  const status = statusConfig[agent.status];
  const StatusIcon = status.icon;
  const animateSpin = isActive(agent.status);
  const done = isTerminal(agent.status);
  const hasCard = agent.status === 'complete' && agent.card && agent.card.status !== 'Blocked';
  const isEmpty = agent.status === 'not_found' || agent.status === 'error';
  const isBlocked = agent.status === 'blocked' || agent.card?.status === 'Blocked';

  return (
    <Card className={cn(
      'overflow-hidden bg-card transition-all duration-500',
      // Fade-in once terminal
      done ? 'animate-in fade-in-0 slide-in-from-bottom-2 duration-500' : '',
      // Border accents
      hasCard && 'border-emerald-500/30',
      isBlocked && 'border-amber-500/30',
      isEmpty && 'border-border opacity-75',
      !done && 'border-border',
    )}>
      <CardHeader className="p-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-balance font-semibold text-foreground leading-tight text-sm">
              {agent.card?.name || agent.dataset.name}
            </h3>
            {agent.card?.description ? (
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                {agent.card.description}
              </p>
            ) : !done ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {agent.dataset.platform}
              </p>
            ) : null}
          </div>
          <Badge variant="secondary" className={cn('shrink-0 text-[10px]', status.bg, status.color)}>
            <StatusIcon className={cn('mr-1 h-3 w-3', animateSpin && 'animate-spin')} />
            {status.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0">
        {/* ── Loading skeleton ── */}
        {!done && !agent.streaming_url && (
          <div className="space-y-3 py-4">
            <div className="h-3 w-3/4 rounded bg-muted animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
            <div className="h-3 w-2/3 rounded bg-muted animate-pulse" />
            <div className="flex items-center gap-2 mt-2">
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">
                {agent.currentStep || agent.statusMessage}
              </span>
            </div>
          </div>
        )}

        {/* ── Live Browser Preview (only while actively streaming) ── */}
        {agent.streaming_url && !done && (
          <div
            className="relative cursor-pointer overflow-hidden rounded-lg border border-primary/20 transition-colors hover:border-primary/40 mt-1"
            onClick={() => onExpandPreview(agent.streaming_url!, agent.dataset.name)}
          >
            <div className="flex items-center justify-between border-b border-border bg-muted/50 px-3 py-1.5">
              <div className="flex items-center gap-1.5">
                <Monitor className="h-3 w-3 text-primary" />
                <span className="text-[10px] font-medium text-muted-foreground">Live Preview</span>
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
              </div>
              <Maximize2 className="h-3 w-3 text-muted-foreground" />
            </div>
            <div className="h-52 bg-muted/30">
              <iframe
                src={agent.streaming_url}
                className="pointer-events-none h-full w-full border-0"
                title={`Browser preview for ${agent.dataset.name}`}
              />
            </div>
          </div>
        )}

        {/* ── Complete: Dataset Card ── */}
        {hasCard && (
          <div className="space-y-3 mt-1">
            {/* Best For */}
            {agent.card!.best_for.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {agent.card!.best_for.map((use) => (
                  <Badge key={use} variant="secondary" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                    {use}
                  </Badge>
                ))}
              </div>
            )}

            {/* Info grid */}
            <div className="grid grid-cols-3 gap-1.5 text-xs">
              <div className="rounded-md bg-muted/60 p-2">
                <span className="text-muted-foreground">Type</span>
                <p className="font-medium text-foreground truncate mt-0.5">{agent.card!.data_type || 'Unknown'}</p>
              </div>
              <div className="rounded-md bg-muted/60 p-2">
                <span className="text-muted-foreground">Source</span>
                <p className="font-medium text-foreground truncate mt-0.5">{agent.card!.source || agent.dataset.platform}</p>
              </div>
              <div className="rounded-md bg-muted/60 p-2">
                <span className="text-muted-foreground">Access</span>
                <div className="flex items-center gap-1 mt-0.5">
                  {(() => {
                    const Icon = accessIcons[agent.card!.access] || Database;
                    return <Icon className="h-3 w-3 text-muted-foreground shrink-0" />;
                  })()}
                  <p className="font-medium text-foreground truncate">{agent.card!.access || 'Unknown'}</p>
                </div>
              </div>
            </div>

            {/* What You Get */}
            {agent.card!.what_you_get && Object.values(agent.card!.what_you_get).some(Boolean) && (
              <div className="rounded-md bg-muted/40 border border-border/50 p-2.5 text-xs">
                <p className="font-medium text-muted-foreground mb-1.5">What you get</p>
                <div className="space-y-1">
                  {agent.card!.what_you_get.columns && (
                    <div className="flex gap-2">
                      <span className="text-muted-foreground shrink-0">Columns:</span>
                      <span className="text-foreground">{agent.card!.what_you_get.columns}</span>
                    </div>
                  )}
                  {agent.card!.what_you_get.coverage && (
                    <div className="flex gap-2">
                      <span className="text-muted-foreground shrink-0">Coverage:</span>
                      <span className="text-foreground">{agent.card!.what_you_get.coverage}</span>
                    </div>
                  )}
                  {agent.card!.what_you_get.frequency && (
                    <div className="flex gap-2">
                      <span className="text-muted-foreground shrink-0">Frequency:</span>
                      <span className="text-foreground">{agent.card!.what_you_get.frequency}</span>
                    </div>
                  )}
                  {agent.card!.what_you_get.size && (
                    <div className="flex gap-2">
                      <span className="text-muted-foreground shrink-0">Size:</span>
                      <span className="text-foreground">{agent.card!.what_you_get.size}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            {agent.card!.notes.length > 0 && (
              <div className="rounded-md bg-amber-500/5 border border-amber-500/15 p-2.5 text-xs">
                <ul className="space-y-1">
                  {agent.card!.notes.map((note, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-foreground">
                      <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0 text-amber-500" />
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* View Button */}
            <Button size="sm" className="w-full h-8 text-xs" asChild>
              <a href={agent.card!.direct_link || agent.dataset.source_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1.5 h-3 w-3" />
                View Dataset
              </a>
            </Button>
          </div>
        )}

        {/* ── Blocked State ── */}
        {isBlocked && (
          <div className="space-y-2.5 mt-1">
            <div className="flex items-start gap-2 rounded-md bg-amber-500/5 border border-amber-500/15 p-3">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <div>
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400">Access Restricted</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  This source requires authentication or is behind a paywall.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" asChild>
                <a href={agent.card?.direct_link || agent.dataset.source_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-1 h-3 w-3" />
                  Open Manually
                </a>
              </Button>
              {onRetry && (
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onRetry}>
                  <RefreshCw className="mr-1 h-3 w-3" />
                  Retry
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ── Not Found State (friendly, not error-like) ── */}
        {agent.status === 'not_found' && (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
              <SearchX className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No results found</p>
            <p className="text-xs text-muted-foreground/70 mt-1 max-w-[200px]">
              The agent couldn&apos;t extract dataset info from this source.
            </p>
            {onRetry && (
              <Button variant="outline" size="sm" className="mt-3 h-7 text-xs" onClick={onRetry}>
                <RefreshCw className="mr-1 h-3 w-3" />
                Try Again
              </Button>
            )}
          </div>
        )}

        {/* ── Error State (connection failures) ── */}
        {agent.status === 'error' && (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
              <WifiOff className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Connection failed</p>
            <p className="text-xs text-muted-foreground/70 mt-1 max-w-[200px]">
              {agent.error || 'Unable to reach this source.'}
            </p>
            {onRetry && (
              <Button variant="outline" size="sm" className="mt-3 h-7 text-xs" onClick={onRetry}>
                <RefreshCw className="mr-1 h-3 w-3" />
                Retry
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
