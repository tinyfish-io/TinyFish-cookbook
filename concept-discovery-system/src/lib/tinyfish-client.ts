import type { TinyFishRequestConfig, TinyFishCallbacks, TinyFishSSEEvent } from '@/types';

function safeString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length ? value : undefined;
}

function parseSSELine(line: string): Record<string, unknown> | null {
  if (!line.startsWith('data: ')) return null;
  try {
    return JSON.parse(line.slice(6)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Start a TinyFish agent and handle streaming events.
 * Uses a same-origin dev proxy (Vite middleware) that calls the TinyFish SDK server-side.
 */
export function startTinyFishAgent(
  config: TinyFishRequestConfig,
  callbacks: TinyFishCallbacks
): AbortController {
  const controller = new AbortController();
  fetch('/api/tinyfish/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: config.url, goal: config.goal }),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(text || `HTTP error! status: ${response.status}`)
      }

      if (!response.body) throw new Error('Response body is null')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let streamingUrlCaptured = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const rawEvent = parseSSELine(line)
          if (!rawEvent) continue

          const type = safeString(rawEvent.type)
          if (!type || type === 'HEARTBEAT') continue

          if (type === 'STREAMING_URL') {
            const streamingUrl = safeString(rawEvent.streaming_url) ?? safeString(rawEvent.streamingUrl)
            if (streamingUrl && !streamingUrlCaptured) {
              streamingUrlCaptured = true
              callbacks.onStreamingUrl(streamingUrl)
            }
            continue
          }

          if (type === 'PROGRESS') {
            const event: TinyFishSSEEvent = {
              type: 'STEP',
              purpose: safeString(rawEvent.purpose),
              action: safeString(rawEvent.action),
              message: safeString(rawEvent.message),
            }
            callbacks.onStep(event)
            continue
          }

          if (type === 'COMPLETE') {
            const status = safeString(rawEvent.status)
            if (status === 'COMPLETED' && rawEvent.result) {
              callbacks.onComplete(rawEvent.result as unknown as any)
            } else {
              const errorMessage =
                safeString((rawEvent.error as { message?: unknown } | undefined)?.message) ??
                safeString(rawEvent.message) ??
                'Agent automation failed'
              callbacks.onError(errorMessage)
            }
            return
          }

          if (type === 'ERROR' || safeString(rawEvent.status) === 'FAILED') {
            callbacks.onError(safeString(rawEvent.message) ?? 'Agent automation failed')
            return
          }

          callbacks.onStep({
            type: 'STEP',
            message: safeString(rawEvent.message) ?? safeString(rawEvent.purpose) ?? `Event: ${type}`,
          })
        }
      }
    })
    .catch((error) => {
      if ((error as Error).name !== 'AbortError') {
        callbacks.onError((error as Error).message)
      }
    })

  return controller;
}
