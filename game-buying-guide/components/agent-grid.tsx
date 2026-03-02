'use client'

import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { AgentCard } from '@/components/agent-card'
import { LiveBrowserPreview } from '@/components/live-browser-preview'
import type { AgentStatus } from '@/lib/types'

interface AgentGridProps {
  agents: AgentStatus[]
}

export function AgentGrid({ agents }: AgentGridProps) {
  const [expandedAgent, setExpandedAgent] = useState<AgentStatus | null>(null)

  if (agents.length === 0) return null

  const runningCount = agents.filter((a) => a.status === 'running').length
  const completeCount = agents.filter((a) => a.status === 'complete').length
  const pendingCount = agents.filter((a) => a.status === 'pending').length

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Platform Analysis</h2>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {runningCount > 0 && (
            <span className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              {runningCount} analyzing
            </span>
          )}
          {completeCount > 0 && <span className="text-success">{completeCount} complete</span>}
          {pendingCount > 0 && <span>{pendingCount} pending</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => (
          <AgentCard
            key={agent.platformName}
            agent={agent}
            onExpandPreview={(a) => setExpandedAgent(a)}
          />
        ))}
      </div>

      <AnimatePresence>
        {expandedAgent && expandedAgent.streamingUrl && (
          <LiveBrowserPreview
            streamingUrl={expandedAgent.streamingUrl}
            platformName={expandedAgent.platformName}
            onClose={() => setExpandedAgent(null)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
