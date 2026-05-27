'use client'

import { AgentStatus } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Bot,
  Globe,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
} from 'lucide-react'

interface AgentCardProps {
  agent: AgentStatus
  onViewLive?: () => void
  onClick?: () => void
  isSelected?: boolean
}

const statusConfig = {
  idle: {
    label: 'Queued',
    color: 'bg-muted text-muted-foreground border-muted-foreground/20',
    icon: Bot,
  },
  connecting: {
    label: 'Connecting',
    color: 'bg-gradient-to-r from-warning/15 to-warning/5 text-warning-foreground border-warning/30',
    icon: Loader2,
  },
  browsing: {
    label: 'Browsing',
    color: 'bg-gradient-to-r from-primary/15 to-primary/5 text-primary border-primary/30',
    icon: Globe,
  },
  analyzing: {
    label: 'Analyzing',
    color: 'bg-gradient-to-r from-chart-2/15 to-chart-2/5 text-primary border-chart-2/30',
    icon: Loader2,
  },
  complete: {
    label: 'Complete',
    color: 'bg-gradient-to-r from-success/15 to-success/5 text-success border-success/30',
    icon: CheckCircle2,
  },
  error: {
    label: 'Error',
    color: 'bg-gradient-to-r from-destructive/15 to-destructive/5 text-destructive border-destructive/30',
    icon: XCircle,
  },
}

export function AgentCard({ agent, onViewLive, onClick, isSelected }: AgentCardProps) {
  const config = statusConfig[agent.status]
  const StatusIcon = config.icon
  const isActive = ['connecting', 'browsing', 'analyzing'].includes(agent.status)
  const isClickable = agent.status === 'complete'

  return (
    <Card
      className={cn(
        'transition-all duration-300 flex flex-col h-full',
        isActive && 'ring-1 ring-primary/50 animate-pulse-ring',
        isClickable && 'cursor-pointer hover:shadow-lg hover:border-primary/50 hover:-translate-y-0.5',
        isSelected && 'ring-2 ring-primary border-primary shadow-lg shadow-primary/10',
        agent.status === 'complete' && !isSelected && 'border-success/30',
      )}
      onClick={isClickable ? onClick : undefined}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2 min-w-0">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-medium truncate">
              {agent.company.name}
            </CardTitle>
            <CardDescription className="text-xs truncate">
              {agent.company.url}
            </CardDescription>
          </div>
          <Badge
            variant="secondary"
            className={cn('text-xs shrink-0 border whitespace-nowrap', config.color)}
          >
            <StatusIcon
              className={cn(
                'w-3 h-3 mr-1 shrink-0',
                isActive && 'animate-spin'
              )}
            />
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 flex-1 overflow-hidden">
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{agent.progress}%</span>
          </div>
          <Progress
            value={agent.progress}
            className={cn(
              "h-1.5",
              agent.status === 'complete' && "[&>div]:bg-success"
            )}
          />
        </div>

        {agent.liveViewUrl && isActive && (
          <div className="relative aspect-video bg-muted rounded-md overflow-hidden">
            <iframe
              src={agent.liveViewUrl}
              className="absolute inset-0 w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin"
              title={`Live view of ${agent.company.name}`}
            />
            <button
              onClick={(e) => {
                e.stopPropagation()
                onViewLive?.()
              }}
              className="absolute top-2 right-2 p-1.5 bg-background/80 backdrop-blur rounded-md hover:bg-background transition-colors"
              title="View full size"
            >
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        )}

        {agent.currentUrl && isActive && (
          <p className="text-xs text-muted-foreground truncate">
            {agent.currentUrl}
          </p>
        )}

        {agent.error && (
          <p className="text-xs text-destructive break-words line-clamp-2">{agent.error}</p>
        )}

        {agent.status === 'complete' && agent.findings && (
          <div className="space-y-2 pt-2 border-t border-border">
            {agent.findings.customerTypes && agent.findings.customerTypes.length > 0 && (
              <div className="flex flex-wrap gap-1 overflow-hidden">
                {agent.findings.customerTypes.slice(0, 2).map((type) => (
                  <Badge key={type} variant="outline" className="text-xs bg-primary/5 border-primary/20 truncate max-w-[120px]">
                    {type}
                  </Badge>
                ))}
                {agent.findings.customerTypes.length > 2 && (
                  <Badge variant="outline" className="text-xs">
                    +{agent.findings.customerTypes.length - 2}
                  </Badge>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {agent.findings.caseStudies?.length ?? 0} case studies, {agent.findings.testimonials?.length ?? 0} testimonials
            </p>
            <p className="text-xs text-primary font-medium">Click to view details</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
