'use client'

import { useState, useCallback, useRef } from 'react'
import type { Platform, AgentStatus, PlatformAnalysis, SteamDBAgentStatus, SteamDBPriceHistory } from '@/lib/types'

export function useGameSearch() {
  const [isLoading, setIsLoading] = useState(false)
  const [agents, setAgents] = useState<AgentStatus[]>([])
  const [error, setError] = useState<string | null>(null)
  const [gameName, setGameName] = useState<string>('')
  const [steamDBAgent, setSteamDBAgent] = useState<SteamDBAgentStatus>({ status: 'pending' })
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map())

  const updateAgent = useCallback((platformName: string, updates: Partial<AgentStatus>) => {
    setAgents((prev) =>
      prev.map((agent) => (agent.platformName === platformName ? { ...agent, ...updates } : agent))
    )
  }, [])

  const analyzeplatform = useCallback(
    async (platform: Platform, gameTitle: string) => {
      const controller = new AbortController()
      abortControllersRef.current.set(platform.name, controller)

      updateAgent(platform.name, { status: 'running', currentAction: 'Starting browser agent...' })

      try {
        const response = await fetch('/api/analyze-platform', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            platformName: platform.name,
            url: platform.url,
            gameTitle,
          }),
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error('Failed to start analysis')
        }

        if (!response.body) {
          throw new Error('No response stream')
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let hasReceivedComplete = false

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          
          // Process complete lines from buffer
          const lines = buffer.split('\n')
          buffer = lines.pop() || '' // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const jsonStr = line.slice(6).trim()
                if (!jsonStr || jsonStr === '[DONE]') continue
                
                const data = JSON.parse(jsonStr)

                if (data.type === 'STREAMING_URL' || data.streamingUrl) {
                  const streamingUrl = data.streamingUrl || data.url
                  if (streamingUrl) {
                    updateAgent(platform.name, { streamingUrl })
                  }
                }

                if (data.type === 'STATUS' || data.status) {
                  const message = data.message || data.status
                  if (message) {
                    updateAgent(platform.name, { currentAction: message })
                  }
                }

                if (data.type === 'COMPLETE' || data.result || data.resultJson) {
                  hasReceivedComplete = true
                  let result = data.result || data.resultJson
                  
                  // Parse if string
                  if (typeof result === 'string') {
                    try {
                      const jsonMatch = result.match(/\{[\s\S]*\}/)
                      if (jsonMatch) {
                        result = JSON.parse(jsonMatch[0])
                      }
                    } catch {
                      // Keep as is
                    }
                  }
                  
                  if (result && typeof result === 'object') {
                    updateAgent(platform.name, {
                      status: 'complete',
                      result: result as PlatformAnalysis,
                      currentAction: undefined,
                    })
                  }
                }

                if (data.type === 'ERROR' || data.error) {
                  updateAgent(platform.name, {
                    status: 'error',
                    error: data.error || data.message || 'Unknown error',
                    currentAction: undefined,
                  })
                }
              } catch {
                // Skip malformed JSON
              }
            }
          }
        }
        
        // Process any remaining buffer content
        if (buffer.trim() && buffer.startsWith('data: ')) {
          try {
            const jsonStr = buffer.slice(6).trim()
            if (jsonStr && jsonStr !== '[DONE]') {
              const data = JSON.parse(jsonStr)
              if (data.type === 'COMPLETE' || data.result || data.resultJson) {
                hasReceivedComplete = true
                let result = data.result || data.resultJson
                if (typeof result === 'string') {
                  const jsonMatch = result.match(/\{[\s\S]*\}/)
                  if (jsonMatch) {
                    result = JSON.parse(jsonMatch[0])
                  }
                }
                if (result && typeof result === 'object') {
                  updateAgent(platform.name, {
                    status: 'complete',
                    result: result as PlatformAnalysis,
                    currentAction: undefined,
                  })
                }
              }
            }
          } catch {
            // Ignore parse errors
          }
        }
        
        // Only mark as error if we truly didn't receive any completion
        if (!hasReceivedComplete) {
          // Check if we're still in running state (agent might have already been updated)
          setAgents((prev) => {
            const agent = prev.find((a) => a.platformName === platform.name)
            if (agent && agent.status === 'running') {
              return prev.map((a) =>
                a.platformName === platform.name
                  ? { ...a, status: 'error' as const, error: 'Analysis timed out or connection lost', currentAction: undefined }
                  : a
              )
            }
            return prev
          })
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return
        }
        updateAgent(platform.name, {
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error',
          currentAction: undefined,
          streamingUrl: undefined,
        })
      } finally {
        abortControllersRef.current.delete(platform.name)
      }
    },
    [updateAgent]
  )

  const analyzeSteamDB = useCallback(async (gameTitle: string) => {
    const controller = new AbortController()
    abortControllersRef.current.set('steamdb', controller)

    setSteamDBAgent({ status: 'running', currentAction: 'Starting SteamDB analysis...' })

    try {
      const response = await fetch('/api/steamdb-price-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameTitle }),
        signal: controller.signal,
      })

      if (!response.ok || !response.body) {
        throw new Error('Failed to start SteamDB analysis')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let hasReceivedComplete = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6).trim()
              if (!jsonStr || jsonStr === '[DONE]') continue

              const data = JSON.parse(jsonStr)

              if (data.type === 'STREAMING_URL' || data.streamingUrl) {
                const streamingUrl = data.streamingUrl || data.url
                if (streamingUrl) {
                  setSteamDBAgent((prev) => ({ ...prev, streamingUrl }))
                }
              }

              if (data.type === 'STATUS' || data.status) {
                const message = data.message || data.status
                if (message) {
                  setSteamDBAgent((prev) => ({ ...prev, currentAction: message }))
                }
              }

              if (data.type === 'COMPLETE' || data.result || data.resultJson) {
                hasReceivedComplete = true
                let result = data.result || data.resultJson

                if (typeof result === 'string') {
                  try {
                    const jsonMatch = result.match(/\{[\s\S]*\}/)
                    if (jsonMatch) {
                      result = JSON.parse(jsonMatch[0])
                    }
                  } catch {
                    // Keep as is
                  }
                }

                if (result && typeof result === 'object') {
                  setSteamDBAgent({
                    status: 'complete',
                    result: result as SteamDBPriceHistory,
                    currentAction: undefined,
                  })
                }
              }

              if (data.type === 'ERROR' || data.error) {
                setSteamDBAgent({
                  status: 'error',
                  error: data.error || data.message || 'Unknown error',
                  currentAction: undefined,
                })
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }

      if (!hasReceivedComplete) {
        setSteamDBAgent((prev) => {
          if (prev.status === 'running') {
            return { status: 'error', error: 'SteamDB analysis timed out', currentAction: undefined }
          }
          return prev
        })
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }
      setSteamDBAgent({
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error',
        currentAction: undefined,
      })
    } finally {
      abortControllersRef.current.delete('steamdb')
    }
  }, [])

  const search = useCallback(
    async (gameTitle: string) => {
      // Abort any existing analyses
      abortControllersRef.current.forEach((controller) => controller.abort())
      abortControllersRef.current.clear()

      setIsLoading(true)
      setError(null)
      setAgents([])
      setGameName(gameTitle)
      setSteamDBAgent({ status: 'pending' })

      try {
        // Step 1: Discover platforms using Gemini
        const discoverResponse = await fetch('/api/discover-platforms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameTitle }),
        })

        if (!discoverResponse.ok) {
          const errorData = await discoverResponse.json()
          throw new Error(errorData.error || 'Failed to discover platforms')
        }

        const { platforms } = (await discoverResponse.json()) as { platforms: Platform[] }

        if (!platforms || platforms.length === 0) {
          throw new Error('No platforms found for this game')
        }

        // Initialize agent states
        const initialAgents: AgentStatus[] = platforms.map((platform) => ({
          platformName: platform.name,
          url: platform.url,
          status: 'pending',
        }))
        setAgents(initialAgents)

        // Step 2: Launch ALL Mino agents in parallel (no concurrency limit)
        // Also launch SteamDB price history agent separately
        await Promise.all([
          ...platforms.map((platform) => analyzeplatform(platform, gameTitle)),
          analyzeSteamDB(gameTitle),
        ])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    },
    [analyzeplatform, analyzeSteamDB]
  )

  const reset = useCallback(() => {
    abortControllersRef.current.forEach((controller) => controller.abort())
    abortControllersRef.current.clear()
    setIsLoading(false)
    setAgents([])
    setError(null)
    setGameName('')
    setSteamDBAgent({ status: 'pending' })
  }, [])

  return {
    search,
    reset,
    isLoading,
    agents,
    error,
    gameName,
    steamDBAgent,
  }
}
