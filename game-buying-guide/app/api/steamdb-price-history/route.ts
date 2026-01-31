import { NextResponse } from 'next/server'

// Allow streaming responses up to 300 seconds (requires Vercel Pro plan)
export const maxDuration = 300

const MINO_API_KEY = process.env.MINO_API_KEY

export async function POST(request: Request) {
  try {
    const { gameTitle } = await request.json()

    if (!gameTitle) {
      return NextResponse.json({ error: 'Game title is required' }, { status: 400 })
    }

    if (!MINO_API_KEY) {
      return NextResponse.json({ error: 'Mino API key not configured' }, { status: 500 })
    }

    const url = `https://steamdb.info/search/?a=app&q=${encodeURIComponent(gameTitle)}`

    const goal = `You are analyzing SteamDB to find the historic lowest price for "${gameTitle}".

STEP 1 - SEARCH & NAVIGATE:
1. You are on the SteamDB search page with results for "${gameTitle}"
2. Find the correct game in the search results (match the title as closely as possible)
3. Click on the game to go to its detail page

STEP 2 - FIND PRICE HISTORY:
1. Look for the "Price History" section or chart on the game's page
2. Find the "Lowest recorded price" or historic low price information
3. Note the date when this historic low occurred
4. Note what discount percentage that was

STEP 3 - COMPARE WITH CURRENT:
1. Find the current Steam price
2. Check if there's an active discount
3. Determine if the current price matches or is close to the historic low

STEP 4 - RETURN STRUCTURED DATA:
Return a JSON object with this exact format:
{
  "game_name": "Full game name as shown on SteamDB",
  "historic_lowest_price": "$XX.XX (the all-time lowest price)",
  "historic_lowest_date": "Date when historic low occurred (e.g., 'June 2024')",
  "historic_lowest_discount": "XX% (the discount when at historic low)",
  "current_steam_price": "$XX.XX (current price on Steam)",
  "current_discount": "XX% or null if no discount",
  "is_current_historic_low": true/false,
  "recommendation": "Brief recommendation based on price history (1-2 sentences)"
}

Be accurate with the prices. If you cannot find certain information, use null for that field.
Focus on finding the LOWEST price the game has EVER been sold for on Steam.`

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const abortController = new AbortController()
        const timeoutId = setTimeout(() => {
          abortController.abort()
        }, 295000)

        try {
          const response = await fetch('https://mino.ai/v1/automation/run-sse', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': MINO_API_KEY,
            },
            body: JSON.stringify({
              url,
              goal,
              timeout: 300000,
            }),
            signal: abortController.signal,
          })

          if (!response.ok) {
            const errorText = await response.text()
            console.error('Mino API error:', errorText)
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'ERROR', error: 'Failed to start SteamDB analysis' })}\n\n`)
            )
            controller.close()
            clearTimeout(timeoutId)
            return
          }

          if (!response.body) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'ERROR', error: 'No response stream from Mino' })}\n\n`)
            )
            controller.close()
            clearTimeout(timeoutId)
            return
          }

          const reader = response.body.getReader()
          const decoder = new TextDecoder()
          let buffer = ''
          let hasCompleted = false

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

                  const streamingUrl = data.streamingUrl || data.liveUrl || data.previewUrl || data.live_url || data.browser_url
                  if (streamingUrl) {
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ type: 'STREAMING_URL', streamingUrl })}\n\n`)
                    )
                  }

                  const statusMessage = data.message || data.status || data.action || data.step
                  if (statusMessage && typeof statusMessage === 'string' && !data.result && !data.output) {
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ type: 'STATUS', message: statusMessage })}\n\n`)
                    )
                  }

                  const resultData = data.result || data.resultJson || data.output || data.response || data.data
                  if (data.type === 'COMPLETE' || data.type === 'complete' || data.type === 'done' || (resultData && typeof resultData === 'object')) {
                    hasCompleted = true
                    let resultJson = resultData

                    if (typeof resultJson === 'string') {
                      try {
                        const jsonMatch = resultJson.match(/\{[\s\S]*\}/)
                        if (jsonMatch) {
                          resultJson = JSON.parse(jsonMatch[0])
                        }
                      } catch {
                        // Keep as string
                      }
                    }

                    if (resultJson) {
                      controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ type: 'COMPLETE', result: resultJson })}\n\n`)
                      )
                    }
                  }

                  if (data.type === 'ERROR' || data.type === 'error' || data.error) {
                    hasCompleted = true
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ type: 'ERROR', error: data.error || data.message || 'Unknown error' })}\n\n`)
                    )
                  }
                } catch {
                  // Skip non-JSON lines
                }
              }
            }
          }

          clearTimeout(timeoutId)

          if (!hasCompleted) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'ERROR', error: 'SteamDB analysis ended without results' })}\n\n`)
            )
          }

          controller.close()
        } catch (error) {
          clearTimeout(timeoutId)
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'

          if (error instanceof Error && error.name === 'AbortError') {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'ERROR', error: 'SteamDB analysis timed out' })}\n\n`)
            )
          } else {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'ERROR', error: `SteamDB analysis failed: ${errorMessage}` })}\n\n`)
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
    console.error('Error in steamdb-price-history:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
