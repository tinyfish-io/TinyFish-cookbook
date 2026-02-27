'use client'

import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus, ExternalLink, Trophy, Clock, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { AgentStatus } from '@/lib/types'

interface ResultsSummaryProps {
  agents: AgentStatus[]
  gameName: string
}

export function ResultsSummary({ agents, gameName }: ResultsSummaryProps) {
  const completedAgents = agents.filter((a) => a.status === 'complete' && a.result)

  if (completedAgents.length === 0) return null

  // Find best deal
  const buyNowAgents = completedAgents.filter((a) => a.result?.recommendation === 'buy_now')
  const waitAgents = completedAgents.filter((a) => a.result?.recommendation === 'wait')
  const considerAgents = completedAgents.filter((a) => a.result?.recommendation === 'consider')

  // Find lowest price
  const pricesWithPlatforms = completedAgents
    .map((a) => {
      const priceStr = a.result?.current_price || ''
      const price = parseFloat(priceStr.replace(/[^0-9.]/g, '')) || Infinity
      return { agent: a, price }
    })
    .filter((p) => p.price !== Infinity)
    .sort((a, b) => a.price - b.price)

  const lowestPriceAgent = pricesWithPlatforms[0]?.agent

  const overallRecommendation =
    buyNowAgents.length > waitAgents.length ? 'buy_now' : waitAgents.length > buyNowAgents.length ? 'wait' : 'consider'

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8"
    >
      <Card className="border-primary/30 bg-card/50 backdrop-blur">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="w-5 h-5 text-primary" />
            Analysis Summary for {gameName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Overall Recommendation */}
            <div className="flex flex-col items-center text-center p-4 rounded-lg bg-muted/50">
              {overallRecommendation === 'buy_now' ? (
                <>
                  <TrendingUp className="w-10 h-10 text-success mb-2" />
                  <Badge className="bg-success/20 text-success border-success/30 text-lg px-4 py-1">
                    Buy Now
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-2">
                    {buyNowAgents.length} of {completedAgents.length} platforms recommend buying now
                  </p>
                </>
              ) : overallRecommendation === 'wait' ? (
                <>
                  <Clock className="w-10 h-10 text-warning mb-2" />
                  <Badge className="bg-warning/20 text-warning border-warning/30 text-lg px-4 py-1">
                    Wait for Sale
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-2">
                    {waitAgents.length} of {completedAgents.length} platforms suggest waiting
                  </p>
                </>
              ) : (
                <>
                  <Minus className="w-10 h-10 text-accent mb-2" />
                  <Badge className="bg-accent/20 text-accent border-accent/30 text-lg px-4 py-1">
                    Consider
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-2">Mixed recommendations - your choice</p>
                </>
              )}
            </div>

            {/* Best Price */}
            {lowestPriceAgent && lowestPriceAgent.result && (
              <div className="flex flex-col items-center text-center p-4 rounded-lg bg-muted/50">
                <Trophy className="w-10 h-10 text-primary mb-2" />
                <p className="text-sm text-muted-foreground">Best Price</p>
                <p className="text-3xl font-bold text-foreground">{lowestPriceAgent.result.current_price}</p>
                <p className="text-sm text-primary font-medium">{lowestPriceAgent.platformName}</p>
                <Button size="sm" className="mt-3" asChild>
                  <a href={lowestPriceAgent.result.store_url} target="_blank" rel="noopener noreferrer">
                    Buy Now <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </Button>
              </div>
            )}

            {/* Quick Stats */}
            <div className="flex flex-col items-center justify-center text-center p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground mb-3">Platform Breakdown</p>
              <div className="flex flex-wrap justify-center gap-2">
                {buyNowAgents.length > 0 && (
                  <Badge variant="outline" className="border-success/50 text-success">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    {buyNowAgents.length} Buy Now
                  </Badge>
                )}
                {waitAgents.length > 0 && (
                  <Badge variant="outline" className="border-warning/50 text-warning">
                    <TrendingDown className="w-3 h-3 mr-1" />
                    {waitAgents.length} Wait
                  </Badge>
                )}
                {considerAgents.length > 0 && (
                  <Badge variant="outline" className="border-accent/50 text-accent">
                    <Minus className="w-3 h-3 mr-1" />
                    {considerAgents.length} Consider
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
