import { NextRequest } from 'next/server'
import { TinyFish, EventType, RunStatus } from '@tiny-fish/sdk'

export const runtime = 'nodejs'
export const maxDuration = 300

const sseData = (payload: unknown) => `data: ${JSON.stringify(payload)}\n\n`

export async function POST(req: NextRequest) {
  const { url, goal } = await req.json()

  if (!url || !goal) {
    return new Response(JSON.stringify({ error: 'Missing url or goal' }), { status: 400 })
  }

  const apiKey = process.env.TINYFISH_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), { status: 500 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (payload: unknown) =>
        controller.enqueue(encoder.encode(sseData(payload)))

      try {
        const client = new TinyFish({ apiKey })
        let resultFound = false

        const tfStream = await client.agent.stream(
          { url, goal },
          {
            onStreamingUrl: (event) => {
              enqueue({ type: 'STREAMING_URL', streaming_url: event.streaming_url })
            },
            onComplete: (event) => {
              resultFound = true
              if (event.status === RunStatus.COMPLETED) {
                enqueue({ type: 'COMPLETE', result: event.result ?? null })
              } else {
                enqueue({ type: 'ERROR', message: event.error?.message ?? 'Agent run failed' })
              }
            },
          }
        )

        // Drain stream so callbacks fire
        for await (const event of tfStream) {
          if (event.type === EventType.COMPLETE && !resultFound) {
            resultFound = true
            if (event.status === RunStatus.COMPLETED) {
              enqueue({ type: 'COMPLETE', result: event.result ?? null })
            } else {
              enqueue({ type: 'ERROR', message: event.error?.message ?? 'Agent run failed' })
            }
          }
        }

        if (!resultFound) {
          enqueue({ type: 'ERROR', message: 'Stream ended without a result' })
        }
      } catch (e: any) {
        enqueue({ type: 'ERROR', message: e.message ?? 'Unknown error' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
    },
  })
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
