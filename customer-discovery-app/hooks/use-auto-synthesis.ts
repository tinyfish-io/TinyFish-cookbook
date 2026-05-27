'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useDiscoveryStore, getCompletedFindings } from '@/lib/discovery-store'

export function useAutoSynthesis() {
  const {
    phase,
    seedCompany,
    companyProfile,
    agentStatuses,
    setCustomerSegments,
    setInsights,
    setPhase,
    setError,
  } = useDiscoveryStore()

  const lastSynthesizedCountRef = useRef(0)
  const isSynthesizingRef = useRef(false)
  const synthTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const completedAgents = agentStatuses.filter((a) => a.status === 'complete')
  const completedCount = completedAgents.length
  const allDone = agentStatuses.length > 0 && agentStatuses.every(
    (a) => a.status === 'complete' || a.status === 'error'
  )

  // Run synthesis
  const runSynthesis = useCallback(async () => {
    if (!seedCompany || !companyProfile || completedCount === 0) return
    if (isSynthesizingRef.current) return

    isSynthesizingRef.current = true

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
      lastSynthesizedCountRef.current = completedCount

      // If all agents are done, mark phase as complete
      if (allDone) {
        setPhase('complete')
      }
    } catch (error) {
      console.error('Auto-synthesis error:', error)
      // Don't set error for auto-synthesis failures to avoid disrupting UX
    } finally {
      isSynthesizingRef.current = false
    }
  }, [seedCompany, companyProfile, agentStatuses, completedCount, allDone, setCustomerSegments, setInsights, setPhase])

  // Auto-synthesize when new results come in (debounced)
  useEffect(() => {
    // Only run during researching phase
    if (phase !== 'researching' && phase !== 'synthesizing') return
    
    // Only auto-synthesize if we have new completed agents
    if (completedCount > lastSynthesizedCountRef.current && completedCount > 0 && !isSynthesizingRef.current) {
      // Clear existing timeout
      if (synthTimeoutRef.current) {
        clearTimeout(synthTimeoutRef.current)
      }

      // Debounce synthesis to avoid too many calls
      synthTimeoutRef.current = setTimeout(() => {
        runSynthesis()
      }, 3000) // Wait 3 seconds before synthesizing
    }

    return () => {
      if (synthTimeoutRef.current) {
        clearTimeout(synthTimeoutRef.current)
      }
    }
  }, [phase, completedCount, runSynthesis])

  return {
    isSynthesizing: isSynthesizingRef.current,
    lastSynthesizedCount: lastSynthesizedCountRef.current,
    runSynthesis,
  }
}
