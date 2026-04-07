'use client'

import { TinyFishAgentState } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle2, ExternalLink, Tv } from 'lucide-react'

interface ResultsSidebarProps {
  agents: TinyFishAgentState[]
  animeTitle: string
}

export function ResultsSidebar({ agents, animeTitle }: ResultsSidebarProps) {
  const availablePlatforms = agents.filter(
    (agent) => agent.status === 'complete' && agent.result?.available
  )
  const unavailablePlatforms = agents.filter(
    (agent) => agent.status === 'complete' && !agent.result?.available
  )
  const inProgress = agents.filter(
    (agent) => agent.status === 'connecting' || agent.status === 'browsing'
  )

  if (agents.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Tv className="h-5 w-5" />
            Results for &quot;{animeTitle}&quot;
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-emerald-50 p-2 dark:bg-emerald-950">
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {availablePlatforms.length}
              </p>
              <p className="text-xs text-muted-foreground">Available</p>
            </div>
            <div className="rounded-lg bg-muted p-2">
              <p className="text-2xl font-bold">{unavailablePlatforms.length}</p>
              <p className="text-xs text-muted-foreground">Not Found</p>
            </div>
            <div className="rounded-lg bg-primary/10 p-2">
              <p className="text-2xl font-bold text-primary">{inProgress.length}</p>
              <p className="text-xs text-muted-foreground">Checking</p>
            </div>
          </div>

          {/* Available platforms */}
          {availablePlatforms.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Watch On</h4>
              <div className="space-y-2">
                {availablePlatforms.map((agent) => (
                  <div
                    key={agent.platformId}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span className="font-medium">{agent.platformName}</span>
                      {agent.result?.subscriptionRequired && (
                        <Badge variant="outline" className="text-xs">
                          Subscription
                        </Badge>
                      )}
                    </div>
                    {agent.result?.watchUrl && (
                      <Button asChild size="sm" variant="ghost">
                        <a
                          href={agent.result.watchUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Not available */}
          {unavailablePlatforms.length > 0 && inProgress.length === 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Not Available On</h4>
              <div className="flex flex-wrap gap-2">
                {unavailablePlatforms.map((agent) => (
                  <Badge key={agent.platformId} variant="secondary">
                    {agent.platformName}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
