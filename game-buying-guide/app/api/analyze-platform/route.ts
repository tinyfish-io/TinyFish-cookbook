import { NextResponse } from 'next/server'

// Allow streaming responses up to 300 seconds (requires Vercel Pro plan)
export const maxDuration = 300

const MINO_API_KEY = process.env.MINO_API_KEY

export async function POST(request: Request) {
  try {
    const { platformName, url, gameTitle } = await request.json()

    if (!platformName || !url || !gameTitle) {
      return NextResponse.json({ error: 'Platform name, URL, and game title are required' }, { status: 400 })
    }

    if (!MINO_API_KEY) {
      return NextResponse.json({ error: 'Mino API key not configured' }, { status: 500 })
    }

    const currentDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    const goal = `You are analyzing a game store page to help a user decide whether to buy "${gameTitle}" now or wait.

CURRENT DATE: ${currentDate}

STEP 1 - NAVIGATE & OBSERVE:
Navigate to the store page and observe:
- Current price displayed
- Any sale/discount indicators
- Original price (if on sale)
- User ratings and review scores
- Any visible sale end dates or timers
- Bundle options or editions available

STEP 2 - ANALYZE PURCHASE TIMING:
Consider these factors:
- Is there an active discount? How significant?
- Are there any visible sale patterns (seasonal sales, etc.)?
- What do user reviews say about the game's value?
- Are there any upcoming DLCs or editions that might affect price?

STEP 3 - RETURN STRUCTURED ANALYSIS:
Return a JSON object with this exact format:
{
  "platform_name": "${platformName}",
  "store_url": "${url}",
  "current_price": "$XX.XX or regional equivalent",
  "original_price": "$XX.XX if on sale, null otherwise",
  "discount_percentage": "XX%" if on sale, null otherwise",
  "is_on_sale": true/false,
  "sale_ends": "Date/time if visible, null otherwise",
  "user_rating": "Rating score if available (e.g., '9/10', '95%', '4.5/5')",
  "review_count": "Number of reviews if visible",
  "recommendation": "buy_now" | "wait" | "consider",
  "reasoning": "2-3 sentence explanation of your recommendation",
  "pros": ["Up to 3 reasons to buy from this platform"],
  "cons": ["Up to 3 potential drawbacks or reasons to wait"]
}

RECOMMENDATION GUIDELINES:
- "buy_now": Significant discount (30%+), historic low price, or sale ending soon
- "wait": Full price with known upcoming sales, or better deals elsewhere
- "consider": Moderate discount, decent value, user's preference matters

Be accurate with prices and factual with observations. If you cannot find certain information, use null for that field.`

    // Create SSE stream
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        // Create abort controller for 300 second timeout
        const abortController = new AbortController()
        const timeoutId = setTimeout(() => {
          console.log(`[v0] Timeout reached for ${platformName}, aborting...`)
          abortController.abort()
        }, 295000) // 295 seconds (leaving buffer for response)

        try {
          console.log(`[v0] Starting Mino agent for ${platformName} at ${url}`)
          
          const response = await fetch('https://mino.ai/v1/automation/run-sse', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': MINO_API_KEY,
            },
            body: JSON.stringify({
              url,
              goal,
              timeout: 300000, // 300 second timeout
            }),
            signal: abortController.signal,
          })

          if (!response.ok) {
            const errorText = await response.text()
            console.error('Mino API error:', errorText)
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: 'ERROR', error: 'Failed to start browser agent' })}\n\n`
              )
            )
            controller.close()
            return
          }

          if (!response.body) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'ERROR', error: 'No response body' })}\n\n`))
            controller.close()
            return
          }

          const reader = response.body.getReader()
          const decoder = new TextDecoder()
          let buffer = ''
          let hasCompleted = false
          let lastResult: unknown = null

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            
            // Process complete lines
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const jsonStr = line.slice(6).trim()
                  if (!jsonStr || jsonStr === '[DONE]') continue
                  
                  const data = JSON.parse(jsonStr)
                  console.log(`[v0] ${platformName} event:`, JSON.stringify(data).slice(0, 200))
                  
                  // Forward streaming URL - check multiple possible field names
                  const streamingUrl = data.streamingUrl || data.liveUrl || data.previewUrl || data.live_url || data.preview_url || data.browserUrl || data.browser_url
                  if (streamingUrl) {
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ type: 'STREAMING_URL', streamingUrl })}\n\n`)
                    )
                  }

                  // Forward status updates - check multiple possible formats
                  const statusMessage = data.message || data.status || data.action || data.step || data.event
                  if (statusMessage && typeof statusMessage === 'string' && !data.result && !data.output) {
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ type: 'STATUS', message: statusMessage })}\n\n`)
                    )
                  }

                  // Handle completion - check multiple possible field names
                  const resultData = data.result || data.resultJson || data.output || data.response || data.answer || data.data
                  if (data.type === 'COMPLETE' || data.type === 'complete' || data.type === 'done' || data.type === 'finished' || data.completed || data.done || (resultData && typeof resultData === 'object')) {
                    hasCompleted = true
                    let resultJson = resultData
                    
                    // Try to parse if it's a string
                    if (typeof resultJson === 'string') {
                      try {
                        const jsonMatch = resultJson.match(/\{[\s\S]*\}/)
                        if (jsonMatch) {
                          resultJson = JSON.parse(jsonMatch[0])
                        }
                      } catch {
                        // Keep as string if parsing fails
                      }
                    }

                    if (resultJson) {
                      lastResult = resultJson
                      console.log(`[v0] ${platformName} completed with result`)
                      controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ type: 'COMPLETE', result: resultJson })}\n\n`)
                      )
                    }
                  }

                  // Handle errors
                  if (data.type === 'ERROR' || data.type === 'error' || data.error) {
                    hasCompleted = true
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ type: 'ERROR', error: data.error || data.message || 'Unknown error' })}\n\n`)
                    )
                  }
                } catch (parseError) {
                  // Log non-JSON lines for debugging
                  console.log(`[v0] ${platformName} non-JSON line:`, line.slice(0, 100))
                }
              }
            }
          }

          // Process remaining buffer
          if (buffer.trim() && buffer.startsWith('data: ')) {
            try {
              const jsonStr = buffer.slice(6).trim()
              if (jsonStr && jsonStr !== '[DONE]') {
                const data = JSON.parse(jsonStr)
                if (data.result || data.resultJson || data.output) {
                  hasCompleted = true
                  let resultJson = data.result || data.resultJson || data.output
                  if (typeof resultJson === 'string') {
                    const jsonMatch = resultJson.match(/\{[\s\S]*\}/)
                    if (jsonMatch) {
                      resultJson = JSON.parse(jsonMatch[0])
                    }
                  }
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: 'COMPLETE', result: resultJson })}\n\n`)
                  )
                }
              }
            } catch {
              // Ignore
            }
          }

          // Clear timeout since we completed normally
          clearTimeout(timeoutId)
          
          console.log(`[v0] Stream ended for ${platformName}, hasCompleted: ${hasCompleted}`)

          // Ensure we send a completion event if stream ended without one
          if (!hasCompleted) {
            console.log(`[v0] No completion received for ${platformName}, sending error`)
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'ERROR', error: 'Analysis ended without results - the agent may still be processing on the Mino dashboard' })}\n\n`)
            )
          }

          controller.close()
        } catch (error) {
          clearTimeout(timeoutId)
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          console.error(`[v0] Stream error for ${platformName}:`, errorMessage)
          
          // Check if it was an abort
          if (error instanceof Error && error.name === 'AbortError') {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'ERROR', error: 'Analysis timed out' })}\n\n`)
            )
          } else {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'ERROR', error: `Stream processing failed: ${errorMessage}` })}\n\n`)
            )
          }
          controller.close()
        }
      },
    })

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Error in analyze-platform:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
