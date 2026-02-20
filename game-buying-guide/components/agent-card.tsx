'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Monitor,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Maximize2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { AgentStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

interface AgentCardProps {
  agent: AgentStatus
  onExpandPreview?: (agent: AgentStatus) => void
}

export function AgentCard({ agent, onExpandPreview }: AgentCardProps) {
  const [imageError, setImageError] = useState(false)

  const getStatusIcon = () => {
    switch (agent.status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-muted-foreground" />
      case 'running':
        return <Loader2 className="w-4 h-4 text-primary animate-spin" />
      case 'complete':
        return <CheckCircle2 className="w-4 h-4 text-success" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-destructive" />
    }
  }

  const getRecommendationBadge = () => {
    if (!agent.result) return null
    const rec = agent.result.recommendation
    switch (rec) {
      case 'buy_now':
        return (
          <Badge className="bg-success/20 text-success border-success/30">
            <TrendingUp className="w-3 h-3 mr-1" />
            Buy Now
          </Badge>
        )
      case 'wait':
        return (
          <Badge className="bg-warning/20 text-warning border-warning/30">
            <TrendingDown className="w-3 h-3 mr-1" />
            Wait
          </Badge>
        )
      case 'consider':
        return (
          <Badge className="bg-accent/20 text-accent border-accent/30">
            <Minus className="w-3 h-3 mr-1" />
            Consider
          </Badge>
        )
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        className={cn(
          'overflow-hidden transition-all duration-300',
          agent.status === 'running' && 'border-primary/50 shadow-primary/10 shadow-lg',
          agent.status === 'complete' && 'border-border',
          agent.status === 'error' && 'border-destructive/50'
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <h3 className="font-semibold text-foreground">{agent.platformName}</h3>
            </div>
            {agent.status === 'complete' && getRecommendationBadge()}
          </div>
          {agent.status === 'running' && agent.currentAction && (
            <p className="text-sm text-muted-foreground mt-1">{agent.currentAction}</p>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Live Preview - show when running */}
          {agent.status === 'running' && (
            <div
              className="relative rounded-lg overflow-hidden border border-primary/30 cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => agent.streamingUrl && onExpandPreview?.(agent)}
            >
              <div className="flex items-center justify-between px-2 py-1 bg-muted/50 border-b border-border">
                <div className="flex items-center gap-1.5">
                  <Monitor className="w-3 h-3 text-primary" />
                  <span className="text-xs font-medium text-muted-foreground">Live Preview</span>
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success" />
                  </span>
                </div>
                {agent.streamingUrl && <Maximize2 className="w-3 h-3 text-muted-foreground" />}
              </div>
              <div className="h-32 bg-muted/30">
                {agent.streamingUrl && !imageError ? (
                  <iframe
                    src={agent.streamingUrl}
                    className="w-full h-full border-0 pointer-events-none"
                    title={`Live browser preview for ${agent.platformName}`}
                    sandbox="allow-scripts allow-same-origin"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      <span className="text-xs">Connecting to browser...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Results */}
          {agent.status === 'complete' && agent.result && (
            <div className="space-y-4">
              {/* Price Info */}
              <div className="flex items-baseline gap-3">
                <span className="text-2xl font-bold text-foreground">{agent.result.current_price}</span>
                {agent.result.original_price && agent.result.is_on_sale && (
                  <>
                    <span className="text-lg text-muted-foreground line-through">
                      {agent.result.original_price}
                    </span>
                    {agent.result.discount_percentage && (
                      <Badge variant="secondary" className="bg-success/20 text-success">
                        -{agent.result.discount_percentage}
                      </Badge>
                    )}
                  </>
                )}
              </div>

              {/* Sale Info */}
              {agent.result.sale_ends && (
                <p className="text-sm text-warning">Sale ends: {agent.result.sale_ends}</p>
              )}

              {/* Rating */}
              {agent.result.user_rating && (
                <div className="text-sm text-muted-foreground">
                  Rating: {agent.result.user_rating}
                  {agent.result.review_count && ` (${agent.result.review_count} reviews)`}
                </div>
              )}

              {/* Reasoning */}
              <p className="text-sm text-foreground/80">{agent.result.reasoning}</p>

              {/* Pros & Cons */}
              <div className="grid grid-cols-2 gap-3">
                {agent.result.pros.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-success mb-1">Pros</p>
                    <ul className="text-xs text-muted-foreground space-y-0.5">
                      {agent.result.pros.slice(0, 3).map((pro, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <span className="text-success">+</span>
                          {pro}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {agent.result.cons.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-destructive mb-1">Cons</p>
                    <ul className="text-xs text-muted-foreground space-y-0.5">
                      {agent.result.cons.slice(0, 3).map((con, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <span className="text-destructive">-</span>
                          {con}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Buy Button */}
              <Button asChild className="w-full">
                <a href={agent.result.store_url} target="_blank" rel="noopener noreferrer">
                  Buy on {agent.platformName}
                  <ExternalLink className="w-4 h-4 ml-2" />
                </a>
              </Button>
            </div>
          )}

          {/* Error State */}
          {agent.status === 'error' && (
            <div className="h-24 flex flex-col items-center justify-center text-muted-foreground">
              <AlertCircle className="w-8 h-8 mb-2 text-muted-foreground/50" />
              <span className="text-sm">No content available</span>
            </div>
          )}

          {/* Pending State */}
          {agent.status === 'pending' && (
            <div className="h-24 flex items-center justify-center text-muted-foreground text-sm">
              Waiting to start analysis...
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
