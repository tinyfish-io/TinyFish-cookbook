'use client'

import { SearchForm } from '@/components/search-form'
import { AgentGrid } from '@/components/agent-grid'
import { ResultsSummary } from '@/components/results-summary'
import { SteamDBPriceCard } from '@/components/steamdb-price-card'
import { useGameSearch } from '@/hooks/use-game-search'
import { AlertCircle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function HomePage() {
  const { search, reset, isLoading, agents, error, gameName, steamDBAgent } = useGameSearch()

  const hasResults = agents.length > 0
  const hasCompleted = agents.some((a) => a.status === 'complete')

  return (
    <main className="min-h-screen bg-background">
      {/* Hero / Header */}
      <div className="relative border-b border-border overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-background to-background" />
          <div className="absolute -top-24 left-1/2 h-64 w-[48rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 py-10 md:py-14">
          <SearchForm onSearch={search} isLoading={isLoading} />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* Error State */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* SteamDB Historic Price - Always show at top when searching */}
        {hasResults && steamDBAgent.status !== 'pending' && (
          <SteamDBPriceCard agent={steamDBAgent} gameName={gameName} />
        )}

        {/* Results Summary */}
        {hasCompleted && <ResultsSummary agents={agents} gameName={gameName} />}

        {/* Agent Grid */}
        {hasResults && <AgentGrid agents={agents} />}

        {/* Empty State */}
        {!hasResults && !isLoading && !error && (
          <div className="text-center py-16">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground mb-3">
                Ready to find the best deal?
              </h2>
              <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
                Enter a game title above and our AI agents will analyze prices across multiple platforms to help you
                decide whether to buy now or wait for a better deal.
              </p>
            </div>
          </div>
        )}

        {/* Loading State Info */}
        {isLoading && agents.length === 0 && (
          <div className="text-center py-16">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-2">Discovering Platforms</h2>
                <p className="text-muted-foreground">
                  Using AI to find where {gameName || 'your game'} is available...
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-border mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <p className="text-center text-sm text-muted-foreground leading-relaxed">
            GamePulse uses AI-powered browser agents to analyze real-time pricing data. Prices and availability may
            vary.
          </p>
        </div>
      </footer>
    </main>
  )
}
