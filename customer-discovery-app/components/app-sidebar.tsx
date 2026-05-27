'use client'

import React from "react"
import { motion } from 'framer-motion'

import { cn } from '@/lib/utils'
import { useDiscoveryStore, DiscoveryPhase, ViewMode } from '@/lib/discovery-store'
import {
  Search,
  Building2,
  Bot,
  Users,
  Lightbulb,
  CheckCircle2,
  Circle,
  Loader2,
} from 'lucide-react'

interface Step {
  id: DiscoveryPhase
  label: string
  description: string
  icon: React.ElementType
}

const steps: Step[] = [
  {
    id: 'input',
    label: 'Seed Company',
    description: 'Enter company details',
    icon: Search,
  },
  {
    id: 'analyzing',
    label: 'Analysis',
    description: 'Understanding the company',
    icon: Building2,
  },
  {
    id: 'researching',
    label: 'Agent Research',
    description: '10 agents exploring',
    icon: Bot,
  },
  {
    id: 'synthesizing',
    label: 'Synthesis',
    description: 'Combining insights',
    icon: Lightbulb,
  },
  {
    id: 'complete',
    label: 'Results',
    description: 'Customer segments',
    icon: Users,
  },
]

function getStepStatus(
  stepId: DiscoveryPhase,
  currentPhase: DiscoveryPhase
): 'complete' | 'current' | 'upcoming' {
  const stepOrder: DiscoveryPhase[] = [
    'input',
    'analyzing',
    'discovering',
    'researching',
    'synthesizing',
    'complete',
  ]
  const currentIndex = stepOrder.indexOf(currentPhase)
  const stepIndex = stepOrder.indexOf(stepId)

  if (stepIndex < currentIndex) return 'complete'
  if (stepIndex === currentIndex) return 'current'
  return 'upcoming'
}

export function AppSidebar() {
  const { phase, viewMode, seedCompany, agentStatuses, setViewMode } = useDiscoveryStore()

  const completedAgents = agentStatuses.filter(
    (a) => a.status === 'complete'
  ).length
  const totalAgents = agentStatuses.length
  const hasResults = completedAgents > 0
  const allAgentsDone = totalAgents > 0 && agentStatuses.every(
    (a) => a.status === 'complete' || a.status === 'error'
  )

  // Determine if a step is clickable
  const isClickable = (stepId: DiscoveryPhase): boolean => {
    // During researching phase, synthesis and results are clickable if there are completed agents
    if (phase === 'researching' || phase === 'synthesizing') {
      if (stepId === 'researching') return true
      if ((stepId === 'synthesizing' || stepId === 'complete') && hasResults) return true
    }
    // In complete phase, all research-related steps are clickable
    if (phase === 'complete') {
      return stepId === 'researching' || stepId === 'synthesizing' || stepId === 'complete'
    }
    return false
  }

  // Handle step click
  const handleStepClick = (stepId: DiscoveryPhase) => {
    if (!isClickable(stepId)) return
    
    if (stepId === 'researching') {
      setViewMode('agents')
    } else if (stepId === 'synthesizing') {
      setViewMode('synthesis')
    } else if (stepId === 'complete') {
      setViewMode('results')
    }
  }

  // Get which view mode corresponds to the current step for highlighting
  const getViewModeForStep = (stepId: DiscoveryPhase): ViewMode | null => {
    if (stepId === 'researching') return 'agents'
    if (stepId === 'synthesizing') return 'synthesis'
    if (stepId === 'complete') return 'results'
    return null
  }

  return (
    <aside className="w-72 border-r border-border bg-gradient-to-b from-card via-card to-primary/[0.03] flex flex-col h-full">
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
        className="p-6 border-b border-border"
      >
        <h1 className="text-lg font-semibold bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
          Customer Discovery
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          AI-powered market research
        </p>
      </motion.div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {steps.map((step, index) => {
            const status = getStepStatus(step.id, phase)
            const Icon = step.icon
            const clickable = isClickable(step.id)
            const stepViewMode = getViewModeForStep(step.id)
            const isActiveView = stepViewMode && viewMode === stepViewMode && (phase === 'researching' || phase === 'synthesizing' || phase === 'complete')

            return (
              <motion.li
                key={step.id}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + index * 0.07, duration: 0.3 }}
              >
                <button
                  type="button"
                  onClick={() => handleStepClick(step.id)}
                  disabled={!clickable}
                  className={cn(
                    'w-full flex items-start gap-3 p-3 rounded-lg transition-colors text-left',
                    status === 'current' && !isActiveView && 'bg-accent',
                    status === 'complete' && !isActiveView && 'opacity-60',
                    isActiveView && 'bg-primary/10 ring-1 ring-primary/50',
                    clickable && 'cursor-pointer hover:bg-accent/80',
                    !clickable && 'cursor-default'
                  )}
                >
                  <div
                    className={cn(
                      'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                      status === 'complete' &&
                        'bg-success text-success-foreground',
                      status === 'current' &&
                        'bg-primary text-primary-foreground',
                      status === 'upcoming' && !clickable && 'bg-muted text-muted-foreground',
                      status === 'upcoming' && clickable && hasResults && 'bg-success text-success-foreground',
                      status === 'upcoming' && clickable && !hasResults && 'bg-primary/20 text-primary'
                    )}
                  >
                    {status === 'complete' ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : status === 'current' ? (
                      // Show checkmark for researching when all agents done
                      step.id === 'researching' && allAgentsDone ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : 
                      // Show checkmark for results when phase is complete
                      step.id === 'complete' && phase === 'complete' ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )
                    ) : clickable && hasResults ? (
                      // Show checkmark for clickable steps with results (synthesis, results)
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Circle className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      <span
                        className={cn(
                          'font-medium text-sm',
                          status === 'upcoming' && !clickable && 'text-muted-foreground'
                        )}
                      >
                        {step.label}
                      </span>
                      {clickable && status === 'upcoming' && (
                        <span className="text-xs text-primary">(live)</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {step.id === 'researching' && totalAgents > 0
                        ? `${completedAgents}/${totalAgents} agents complete`
                        : step.description}
                    </p>
                  </div>
                </button>
                {index < steps.length - 1 && (
                  <div className="ml-7 h-4 border-l-2 border-border" />
                )}
              </motion.li>
            )
          })}
        </ul>
      </nav>

      {seedCompany && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.3 }}
          className="p-4 border-t border-border bg-gradient-to-r from-primary/[0.05] to-transparent"
        >
          <p className="text-xs text-primary/70 mb-1 font-medium">Analyzing</p>
          <p className="font-medium text-sm truncate">{seedCompany.name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {seedCompany.url}
          </p>
        </motion.div>
      )}
    </aside>
  )
}
