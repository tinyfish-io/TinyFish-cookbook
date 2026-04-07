import { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 min timeout for long scrapes

export async function POST(req: NextRequest) {
  const { url, goal } = await req.json()

  if (!url || !goal) {
    return new Response(JSON.stringify({ error: 'Missing url or goal' }), { status: 400 })
  }

  const apiKey = process.env.TINYFISH_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), { status: 500 })
  }

  try {
    const tfResponse = await fetch('https://mino.ai/v1/automation/run-sse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({ url, goal }),
    })

    if (!tfResponse.ok) {
      const errText = await tfResponse.text()
      return new Response(JSON.stringify({ error: `TinyFish error: ${tfResponse.status}`, detail: errText }), { status: 502 })
    }

    // Stream the SSE response straight through to the client
    const stream = new ReadableStream({
      async start(controller) {
        const reader = tfResponse.body!.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() ?? ''

            for (const line of lines) {
              const trimmed = line.trim()
              if (!trimmed) continue
              controller.enqueue(new TextEncoder().encode(trimmed + '\n'))
            }
          }

          if (buffer.trim()) {
            controller.enqueue(new TextEncoder().encode(buffer.trim() + '\n'))
          }
        } catch (e) {
          console.error('Stream error:', e)
        } finally {
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
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
