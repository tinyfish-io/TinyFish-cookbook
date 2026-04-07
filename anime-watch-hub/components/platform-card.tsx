'use client'

import { TinyFishAgentState } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle2, XCircle, AlertCircle, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PlatformCardProps {
  agent: TinyFishAgentState
}

export function PlatformCard({ agent }: PlatformCardProps) {
  const getStatusIcon = () => {
    switch (agent.status) {
      case 'idle':
        return <div className="h-4 w-4 rounded-full bg-muted" />
      case 'connecting':
      case 'browsing':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />
      case 'complete':
        if (agent.result?.available) {
          return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        }
        return <XCircle className="h-4 w-4 text-muted-foreground" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />
      default:
        return null
    }
  }

  const getStatusBadge = () => {
    switch (agent.status) {
      case 'idle':
        return <Badge variant="secondary">Waiting</Badge>
      case 'connecting':
        return <Badge variant="outline" className="border-primary text-primary">Connecting</Badge>
      case 'browsing':
        return <Badge variant="outline" className="border-primary text-primary">Searching</Badge>
      case 'complete':
        if (agent.result?.available) {
          return <Badge className="bg-emerald-500 text-white hover:bg-emerald-600">Available</Badge>
        }
        return <Badge variant="secondary">Not Found</Badge>
      case 'error':
        return <Badge variant="destructive">Error</Badge>
      default:
        return null
    }
  }

  return (
    <Card className="overflow-hidden transition-all duration-200 hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <CardTitle className="text-base">{agent.platformName}</CardTitle>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Live browser preview */}
        {agent.streamingUrl && (agent.status === 'connecting' || agent.status === 'browsing') && (
          <div className="relative aspect-video w-full overflow-hidden rounded-md border bg-muted">
            <iframe
              src={agent.streamingUrl}
              className="h-full w-full"
              title={`${agent.platformName} live view`}
              sandbox="allow-same-origin allow-scripts allow-forms"
            />
            <div className="absolute bottom-2 left-2">
              <Badge variant="secondary" className="text-xs">
                <span className="mr-1.5 h-2 w-2 rounded-full bg-red-500 animate-pulse inline-block" />
                Live
              </Badge>
            </div>
          </div>
        )}

        {/* Status message */}
        {agent.statusMessage && (
          <p className="text-sm text-muted-foreground">{agent.statusMessage}</p>
        )}

        {/* Result */}
        {agent.status === 'complete' && agent.result && (
          <div className="space-y-2">
            <p className="text-sm">{agent.result.message}</p>
            {agent.result.available && agent.result.watchUrl && (
              <Button asChild size="sm" className="w-full">
                <a href={agent.result.watchUrl} target="_blank" rel="noopener noreferrer">
                  Watch Now
                  <ExternalLink className="ml-2 h-3 w-3" />
                </a>
              </Button>
            )}
            {agent.result.subscriptionRequired && (
              <p className="text-xs text-muted-foreground">Subscription required</p>
            )}
          </div>
        )}

        {/* Error state */}
        {agent.status === 'error' && (
          <p className="text-sm text-destructive">
            Failed to check this platform. Please try again.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
