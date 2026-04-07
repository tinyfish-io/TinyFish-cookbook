'use client'

import { useState, useCallback } from 'react'
import { TinyFishAgentState } from '@/lib/types'

interface DiscoveredPlatform {
  id: string
  name: string
  searchUrl: string
}

export function useAnimeSearch() {
  const [isSearching, setIsSearching] = useState(false)
  const [isDiscovering, setIsDiscovering] = useState(false)
  const [agents, setAgents] = useState<TinyFishAgentState[]>([])
  const [error, setError] = useState<string | null>(null)

  const updateAgent = useCallback((platformId: string, updates: Partial<TinyFishAgentState>) => {
    setAgents((prev) =>
      prev.map((agent) =>
        agent.platformId === platformId ? { ...agent, ...updates } : agent
      )
    )
  }, [])

  const checkPlatform = useCallback(
    async (animeTitle: string, platform: DiscoveredPlatform) => {
      updateAgent(platform.id, { status: 'connecting', statusMessage: 'Connecting to TinyFish agent...' })

      try {
        const response = await fetch('/api/check-platform', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            animeTitle,
            platformName: platform.name,
            searchUrl: platform.searchUrl,
          }),
        })

        if (!response.ok || !response.body) {
          throw new Error('Failed to start platform check')
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))

                if (data.type === 'STREAMING_URL' && data.streaming_url) {
                  updateAgent(platform.id, {
                    status: 'browsing',
                    streamingUrl: data.streaming_url,
                    statusMessage: 'Browsing platform...',
                  })
                }

                if (data.type === 'PROGRESS' && data.purpose) {
                  updateAgent(platform.id, { statusMessage: data.purpose })
                }

                if (data.type === 'COMPLETE') {
                  if (data.status === 'failed') {
                    updateAgent(platform.id, {
                      status: 'error',
                      statusMessage: data.error?.message ?? 'Automation failed',
                      streamingUrl: undefined,
                    })
                  } else {
                    updateAgent(platform.id, {
                      status: 'complete',
                      result: data.result,
                      statusMessage: undefined,
                      streamingUrl: undefined,
                    })
                  }
                }

                if (data.status === 'FAILED') {
                  updateAgent(platform.id, {
                    status: 'error',
                    statusMessage: data.message || 'An error occurred',
                  })
                }
              } catch {
                // Skip malformed JSON lines
              }
            }
          }
        }
      } catch (err) {
        console.error(`Error checking ${platform.name}:`, err)
        updateAgent(platform.id, {
          status: 'error',
          statusMessage: 'Failed to check platform',
        })
      }
    },
    [updateAgent]
  )

  const search = useCallback(
    async (animeTitle: string) => {
      if (!animeTitle.trim()) {
        setError('Please enter an anime title')
        return
      }

      setError(null)
      setIsSearching(true)
      setIsDiscovering(true)
      setAgents([])

      try {
        // Step 1: Discover platform URLs using OpenAI
        const discoverResponse = await fetch('/api/discover-platforms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ animeTitle }),
        })

        if (!discoverResponse.ok) {
          const errorData = await discoverResponse.json()
          throw new Error(errorData.error || 'Failed to discover platforms')
        }

        const { platforms } = await discoverResponse.json() as { platforms: DiscoveredPlatform[] }
        setIsDiscovering(false)

        if (!platforms || platforms.length === 0) {
          setError('No streaming platforms found')
          setIsSearching(false)
          return
        }

        // Initialize agents for each platform
        const initialAgents: TinyFishAgentState[] = platforms.map((p: DiscoveredPlatform) => ({
          platformId: p.id,
          platformName: p.name,
          url: p.searchUrl,
          status: 'idle',
        }))
        setAgents(initialAgents)

        // Step 2: Check each platform in parallel using TinyFish
        await Promise.all(platforms.map((platform: DiscoveredPlatform) => checkPlatform(animeTitle, platform)))
      } catch (err) {
        console.error('Search error:', err)
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsSearching(false)
        setIsDiscovering(false)
      }
    },
    [checkPlatform]
  )

  const reset = useCallback(() => {
    setIsSearching(false)
    setIsDiscovering(false)
    setAgents([])
    setError(null)
  }, [])

  return {
    search,
    reset,
    isSearching,
    isDiscovering,
    agents,
    error,
  }
}
