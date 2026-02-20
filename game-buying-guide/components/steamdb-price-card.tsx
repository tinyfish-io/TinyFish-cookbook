'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { SteamDBAgentStatus } from '@/lib/types'
import { TrendingDown, History, ExternalLink, Loader2, AlertCircle, Monitor, Calendar, DollarSign } from 'lucide-react'
import { useState } from 'react'

interface SteamDBPriceCardProps {
  agent: SteamDBAgentStatus
  gameName: string
}

export function SteamDBPriceCard({ agent, gameName }: SteamDBPriceCardProps) {
  const [expanded, setExpanded] = useState(false)

  if (agent.status === 'pending') {
    return null
  }

  return (
    <Card className="mb-6 border-primary/30 bg-gradient-to-br from-card to-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <History className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Steam Historic Price Data
                <Badge variant="outline" className="text-xs font-normal">
                  via SteamDB
                </Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">All-time lowest price on Steam</p>
            </div>
          </div>
          {agent.status === 'running' && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span>{agent.currentAction || 'Analyzing SteamDB...'}</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Running State with Live Preview */}
        {agent.status === 'running' && (
          <div className="space-y-4">
            {agent.streamingUrl ? (
              <div
                className="relative rounded-lg overflow-hidden border border-primary/30 cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setExpanded(!expanded)}
              >
                <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Live Browser Preview</span>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">Click to {expanded ? 'collapse' : 'expand'}</span>
                </div>
                <div className={`bg-muted/30 transition-all duration-300 ${expanded ? 'h-80' : 'h-40'}`}>
                  <iframe
                    src={agent.streamingUrl}
                    className="w-full h-full border-0 pointer-events-none"
                    title="SteamDB browser preview"
                    sandbox="allow-scripts allow-same-origin"
                  />
                </div>
              </div>
            ) : (
              <div className="h-32 rounded-lg bg-muted/30 flex items-center justify-center border border-border">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="text-sm">Connecting to browser...</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Complete State */}
        {agent.status === 'complete' && agent.result && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Historic Lowest Price */}
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-muted-foreground">Historic Low</span>
                </div>
                <div className="text-2xl font-bold text-primary">
                  {agent.result.historic_lowest_price || 'N/A'}
                </div>
                {agent.result.historic_lowest_discount && (
                  <Badge className="mt-1 bg-primary/20 text-primary border-0">
                    {agent.result.historic_lowest_discount} off
                  </Badge>
                )}
              </div>

              {/* Date of Historic Low */}
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">When</span>
                </div>
                <div className="text-lg font-semibold">
                  {agent.result.historic_lowest_date || 'Unknown'}
                </div>
              </div>

              {/* Current Steam Price */}
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Current Steam Price</span>
                </div>
                <div className="text-lg font-semibold">
                  {agent.result.current_steam_price || 'N/A'}
                </div>
                {agent.result.current_discount && (
                  <Badge variant="secondary" className="mt-1">
                    {agent.result.current_discount} off
                  </Badge>
                )}
              </div>
            </div>

            {/* Historic Low Alert */}
            {agent.result.is_current_historic_low && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/30">
                <TrendingDown className="w-5 h-5 text-primary" />
                <span className="font-medium text-primary">
                  Current price matches or beats the historic low! Great time to buy.
                </span>
              </div>
            )}

            {/* Recommendation */}
            {agent.result.recommendation && (
              <div className="p-3 rounded-lg bg-muted/30 border border-border">
                <p className="text-sm text-muted-foreground">{agent.result.recommendation}</p>
              </div>
            )}

            {/* Link to SteamDB */}
            <a
              href={`https://steamdb.info/search/?a=app&q=${encodeURIComponent(gameName)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              View full price history on SteamDB
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Error State */}
        {agent.status === 'error' && (
          <div className="h-24 flex flex-col items-center justify-center text-muted-foreground">
            <AlertCircle className="w-8 h-8 mb-2 text-muted-foreground/50" />
            <span className="text-sm">Unable to fetch historic price data</span>
            <a
              href={`https://steamdb.info/search/?a=app&q=${encodeURIComponent(gameName)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Check SteamDB manually
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
