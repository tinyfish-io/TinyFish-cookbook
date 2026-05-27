'use client';

import {
  Trophy,
  ExternalLink,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Download,
  Key,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { AgentState } from '@/lib/types';

interface RecommendationsPanelProps {
  agents: AgentState[];
}

export function RecommendationsPanel({ agents }: RecommendationsPanelProps) {
  const completedAgents = agents.filter((a) => a.status === 'complete' && a.card);
  const blockedAgents = agents.filter((a) => a.status === 'blocked' || a.card?.status === 'Blocked');
  const pendingCount = agents.filter((a) => !['complete', 'error', 'blocked'].includes(a.status)).length;

  if (completedAgents.length === 0 && blockedAgents.length === 0) {
    return null;
  }

  // Sort by usability risk (Low first)
  const sortedAgents = [...completedAgents].sort((a, b) => {
    const order = { Low: 0, Medium: 1, High: 2, 'Cannot Assess': 3 };
    const aRisk = a.card?.usability_risk || 'Cannot Assess';
    const bRisk = b.card?.usability_risk || 'Cannot Assess';
    return (order[aRisk] ?? 4) - (order[bRisk] ?? 4);
  });

  const topPicks = sortedAgents.filter((a) => a.card?.usability_risk === 'Low').slice(0, 2);

  return (
    <Card className="border-primary/30 bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="h-5 w-5 text-amber-500" />
            Top Picks
          </CardTitle>
          {pendingCount > 0 && (
            <Badge variant="secondary" className="bg-muted text-muted-foreground">
              {pendingCount} inspecting...
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {topPicks.length > 0 ? (
          topPicks.map((agent, index) => (
            <div
              key={agent.id}
              className={cn(
                'rounded-lg border p-4 transition-all',
                index === 0 ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-border bg-muted/30'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {index === 0 && <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" />}
                    <h4 className="truncate font-semibold text-foreground">{agent.card?.name}</h4>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {agent.card?.description}
                  </p>
                </div>
                <Badge className="shrink-0 border-emerald-500/30 bg-emerald-500/10 text-emerald-500">
                  <ShieldCheck className="mr-1 h-3 w-3" />
                  Proceed
                </Badge>
              </div>

              {agent.card && (
                <>
                  {/* Best For Tags */}
                  {agent.card.best_for && agent.card.best_for.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {agent.card.best_for.slice(0, 3).map((use) => (
                        <Badge key={use} variant="secondary" className="text-xs bg-primary/10 text-primary">
                          {use}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Quick Info */}
                  <div className="mt-3 flex flex-wrap gap-2 text-sm">
                    <Badge variant="outline" className="bg-transparent text-muted-foreground">
                      {agent.card.data_type}
                    </Badge>
                    <Badge variant="outline" className="bg-transparent text-muted-foreground">
                      {agent.card.access === 'Direct Download' && <Download className="mr-1 h-3 w-3" />}
                      {agent.card.access === 'API' && <Key className="mr-1 h-3 w-3" />}
                      {agent.card.access}
                    </Badge>
                    <Badge variant="outline" className="bg-transparent text-muted-foreground">
                      {agent.card.source}
                    </Badge>
                  </div>

                  <Button size="sm" className="mt-3 w-full" asChild>
                    <a href={agent.card.direct_link || agent.dataset.source_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View Dataset
                    </a>
                  </Button>
                </>
              )}
            </div>
          ))
        ) : (
          <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
            <div>
              <p className="font-medium text-foreground">No low-risk datasets found yet</p>
              <p className="text-sm text-muted-foreground">
                {pendingCount > 0
                  ? 'Still inspecting datasets. Results will appear shortly.'
                  : 'Review individual cards for details on available datasets.'}
              </p>
            </div>
          </div>
        )}

        {/* Blocked Summary */}
        {blockedAgents.length > 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <ShieldAlert className="h-5 w-5 shrink-0 text-destructive" />
            <div>
              <p className="text-sm font-medium text-destructive">
                {blockedAgents.length} blocked
              </p>
              <p className="text-xs text-destructive/80">Access restricted</p>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        {sortedAgents.length > 0 && (
          <div className="border-t border-border pt-3">
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-lg bg-emerald-500/10 p-2">
                <p className="font-semibold text-emerald-500">
                  {sortedAgents.filter((a) => a.card?.usability_risk === 'Low').length}
                </p>
                <p className="text-xs text-muted-foreground">Low Risk</p>
              </div>
              <div className="rounded-lg bg-amber-500/10 p-2">
                <p className="font-semibold text-amber-500">
                  {sortedAgents.filter((a) => a.card?.usability_risk === 'Medium').length}
                </p>
                <p className="text-xs text-muted-foreground">Medium Risk</p>
              </div>
              <div className="rounded-lg bg-destructive/10 p-2">
                <p className="font-semibold text-destructive">
                  {blockedAgents.length + sortedAgents.filter((a) => a.card?.usability_risk === 'High' || a.card?.usability_risk === 'Cannot Assess').length}
                </p>
                <p className="text-xs text-muted-foreground">High/Blocked</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
