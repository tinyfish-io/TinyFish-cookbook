'use client'

import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { useDiscoveryStore, getCompletedFindings } from '@/lib/discovery-store'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Users,
  Target,
  Lightbulb,
  Loader2,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react'

export function SynthesisView() {
  const {
    seedCompany,
    companyProfile,
    agentStatuses,
    customerSegments,
    insights,
    setCustomerSegments,
    setInsights,
    setPhase,
    setError,
  } = useDiscoveryStore()

  const [isSynthesizing, setIsSynthesizing] = useState(false)
  const [lastSynthesizedCount, setLastSynthesizedCount] = useState(0)
  const synthTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const completedAgents = agentStatuses.filter((a) => a.status === 'complete')
  const completedCount = completedAgents.length
  const totalAgents = agentStatuses.length
  const allDone = agentStatuses.every(
    (a) => a.status === 'complete' || a.status === 'error'
  )

  // Run synthesis
  const runSynthesis = async () => {
    if (!seedCompany || !companyProfile || completedCount === 0) return

    setIsSynthesizing(true)

    try {
      const findings = getCompletedFindings(agentStatuses)

      const response = await fetch('/api/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seedCompany,
          companyProfile,
          findings,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to synthesize')
      }

      const data = await response.json()
      setCustomerSegments(data.customerSegments)
      setInsights(data.insights)
      setLastSynthesizedCount(completedCount)

      // If all agents are done, mark phase as complete
      if (allDone) {
        setPhase('complete')
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Synthesis failed')
    } finally {
      setIsSynthesizing(false)
    }
  }

  // Auto-synthesize when new results come in (debounced)
  useEffect(() => {
    // Only auto-synthesize if we have new completed agents
    if (completedCount > lastSynthesizedCount && completedCount > 0 && !isSynthesizing) {
      // Clear existing timeout
      if (synthTimeoutRef.current) {
        clearTimeout(synthTimeoutRef.current)
      }

      // Debounce synthesis to avoid too many calls
      synthTimeoutRef.current = setTimeout(() => {
        runSynthesis()
      }, 2000) // Wait 2 seconds before synthesizing
    }

    return () => {
      if (synthTimeoutRef.current) {
        clearTimeout(synthTimeoutRef.current)
      }
    }
  }, [completedCount, lastSynthesizedCount, isSynthesizing])

  return (
    <div className="flex-1 p-6 overflow-auto bg-gradient-to-br from-background via-background to-chart-2/[0.03]">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-start justify-between"
        >
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Synthesis</h1>
            <p className="text-muted-foreground mt-1">
              Combining insights from {completedCount}/{totalAgents} agents
              {!allDone && ' (updating as more complete)'}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={runSynthesis}
            disabled={isSynthesizing || completedCount === 0}
          >
            {isSynthesizing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Synthesizing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Re-synthesize
              </>
            )}
          </Button>
        </motion.div>

        {/* Loading state */}
        {isSynthesizing && customerSegments.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground">
                Analyzing findings and generating customer segments...
              </p>
            </div>
          </div>
        )}

        {/* No results yet */}
        {!isSynthesizing && customerSegments.length === 0 && completedCount === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Waiting for agent research to complete...
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Results will appear here as agents finish their analysis.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Customer Segments */}
        {customerSegments.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Customer Segments</h2>
              {isSynthesizing && !allDone && (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {customerSegments.map((segment, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 15, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: index * 0.08, duration: 0.35 }}
                >
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="text-lg">{segment.name}</CardTitle>
                    <CardDescription>{segment.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {segment.characteristics && segment.characteristics.length > 0 && (
                      <div className="min-w-0">
                        <p className="text-sm font-medium mb-2">Characteristics</p>
                        <ul className="space-y-1">
                          {segment.characteristics.map((char, i) => (
                            <li
                              key={i}
                              className="text-sm text-muted-foreground flex items-start gap-2 min-w-0"
                            >
                              <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                              <span className="break-words">{char}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {segment.signals && segment.signals.length > 0 && (
                      <div className="min-w-0">
                        <p className="text-sm font-medium mb-2 flex items-center gap-1">
                          <Target className="w-4 h-4 text-primary shrink-0" />
                          Buying Signals
                        </p>
                        <ul className="space-y-1">
                          {segment.signals.map((signal, i) => (
                            <li
                              key={i}
                              className="text-sm text-muted-foreground flex items-start gap-2 min-w-0"
                            >
                              <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                              <span className="break-words">{signal}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {segment.companyExamples && segment.companyExamples.length > 0 && (
                      <div className="min-w-0">
                        <p className="text-sm font-medium mb-2">Example Companies</p>
                        <p className="text-sm text-muted-foreground break-words">
                          {segment.companyExamples.join(', ')}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Strategic Insights */}
        {insights.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-primary" />
                <CardTitle>Strategic Insights</CardTitle>
                {isSynthesizing && !allDone && (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {insights.map((insight, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg min-w-0"
                  >
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center">
                      {index + 1}
                    </span>
                    <p className="text-sm break-words">{insight}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          </motion.div>
        )}

        {/* Data source indicator */}
        {completedCount > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            Based on analysis of {completedCount} similar companies
            {!allDone && ' - more results incoming'}
          </p>
        )}
      </div>
    </div>
  )
}
