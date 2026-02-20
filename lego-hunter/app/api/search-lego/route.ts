import { analyzeBestDeal } from '@/lib/gemini-client'
import type { Retailer, ProductData, SSEEvent, MinoSSEEvent } from '@/types'

interface SearchLegoRequest {
  legoSetName: string
  maxBudget: number
  retailers: Retailer[]
}

export async function POST(request: Request) {
  const body: SearchLegoRequest = await request.json()
  const { legoSetName, maxBudget, retailers } = body

  if (!legoSetName || !retailers || retailers.length === 0) {
    return Response.json(
      { error: 'legoSetName and retailers are required' },
      { status: 400 }
    )
  }

  // Create a TransformStream for SSE
  const encoder = new TextEncoder()
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()

  // Helper to send SSE events
  const sendEvent = async (event: SSEEvent) => {
    const data = `data: ${JSON.stringify({ ...event, timestamp: Date.now() })}\n\n`
    await writer.write(encoder.encode(data))
  }

  // Start processing in background
  processRetailers(retailers, legoSetName, maxBudget, sendEvent, writer)

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    }
  })
}

async function processRetailers(
  retailers: Retailer[],
  legoSetName: string,
  maxBudget: number,
  sendEvent: (event: SSEEvent) => Promise<void>,
  writer: WritableStreamDefaultWriter<Uint8Array>
) {
  const results: ProductData[] = []

  try {
    // Launch all scraping tasks in parallel
    const scrapePromises = retailers.map(retailer =>
      scrapeRetailer(retailer, legoSetName, sendEvent)
        .then(data => {
          if (data) {
            results.push(data)
          }
          return data
        })
        .catch(async error => {
          console.error(`Error scraping ${retailer.name}:`, error)
          await sendEvent({
            type: 'retailer_error',
            retailer: retailer.name,
            error: error.message || 'Scraping failed'
          })
          return null
        })
    )

    // Wait for all scraping to complete
    await Promise.allSettled(scrapePromises)

    // Analyze results with Gemini if we have any
    if (results.length > 0) {
      try {
        const bestDeal = await analyzeBestDeal(legoSetName, maxBudget, results)
        await sendEvent({
          type: 'analysis_complete',
          bestDeal
        })
      } catch (error) {
        console.error('Error analyzing deals:', error)
        await sendEvent({
          type: 'error',
          error: 'Failed to analyze deals'
        })
      }
    } else {
      await sendEvent({
        type: 'analysis_complete',
        bestDeal: {
          bestRetailer: 'None',
          reason: 'No retailers returned results. Please try again.',
          totalCost: 'N/A',
          savings: 'N/A'
        }
      })
    }
  } catch (error) {
    console.error('Error processing retailers:', error)
    await sendEvent({
      type: 'error',
      error: 'Failed to process retailers'
    })
  } finally {
    await writer.close()
  }
}

async function scrapeRetailer(
  retailer: Retailer,
  legoSetName: string,
  sendEvent: (event: SSEEvent) => Promise<void>
): Promise<ProductData | null> {
  const MINO_API_KEY = process.env.MINO_API_KEY

  if (!MINO_API_KEY) {
    throw new Error('MINO_API_KEY not configured')
  }

  // Send start event
  await sendEvent({
    type: 'retailer_start',
    retailer: retailer.name
  })

  const minoResponse = await fetch('https://mino.ai/v1/automation/run-sse', {
    method: 'POST',
    headers: {
      'X-API-Key': MINO_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      url: retailer.url,
      goal: `Search for "${legoSetName}" Lego set on this retailer website and extract product information.

Your task:
1. Look for the Lego set on this page (it may be a search results page)
2. Find the specific product that matches "${legoSetName}"
3. Extract the following information:

Return the result as JSON with these exact fields:
{
  "inStock": true or false (whether the product is available to purchase),
  "price": "99.99" (just the number, no currency symbol),
  "currency": "USD" (or appropriate currency),
  "shipping": "Free shipping" or "Shipping: $X.XX" or "Check website for shipping",
  "productUrl": "full URL to the product page if found, otherwise the search page URL"
}

If the product is not found on this page, return:
{
  "inStock": false,
  "price": "0",
  "currency": "USD",
  "shipping": "N/A",
  "productUrl": "${retailer.url}"
}

Important: Return ONLY the JSON object, no additional text.`,
      browser_profile: 'lite'
    })
  })

  if (!minoResponse.ok) {
    throw new Error(`Mino API error: ${minoResponse.status}`)
  }

  const reader = minoResponse.body?.getReader()
  if (!reader) {
    throw new Error('No response body from Mino')
  }

  const decoder = new TextDecoder()
  let buffer = ''
  let streamingUrl: string | undefined
  let finalResult: ProductData | null = null

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue

        try {
          const minoEvent: MinoSSEEvent = JSON.parse(line.slice(6))

          // Capture streaming URL for browser preview
          if (minoEvent.streamingUrl && !streamingUrl) {
            streamingUrl = minoEvent.streamingUrl
            await sendEvent({
              type: 'retailer_start',
              retailer: retailer.name,
              streamingUrl
            })
          }

          // Forward step events for progress updates
          if (minoEvent.type === 'STEP') {
            await sendEvent({
              type: 'retailer_step',
              retailer: retailer.name,
              step: minoEvent.step || minoEvent.message || 'Processing...'
            })
          }

          // Handle completion
          if (minoEvent.type === 'COMPLETE' && minoEvent.status === 'COMPLETED') {
            let resultData = minoEvent.resultJson

            // Try to parse if it's a string
            if (typeof resultData === 'string') {
              try {
                resultData = JSON.parse(resultData)
              } catch {
                // If parsing fails, create default result
                resultData = {
                  retailer: retailer.name,
                  inStock: false,
                  price: '0',
                  currency: 'USD',
                  shipping: 'N/A',
                  productUrl: retailer.url
                }
              }
            }

            finalResult = {
              retailer: retailer.name,
              inStock: resultData?.inStock ?? false,
              price: String(resultData?.price ?? '0'),
              currency: resultData?.currency ?? 'USD',
              shipping: resultData?.shipping ?? 'N/A',
              productUrl: resultData?.productUrl ?? retailer.url
            }

            // Send stock found event if in stock
            if (finalResult.inStock) {
              await sendEvent({
                type: 'retailer_stock_found',
                retailer: retailer.name
              })
            }

            // Send completion event
            await sendEvent({
              type: 'retailer_complete',
              retailer: retailer.name,
              data: finalResult
            })

            break
          }

          // Handle errors from Mino
          if (minoEvent.type === 'ERROR' || minoEvent.status === 'FAILED') {
            throw new Error(minoEvent.message || 'Mino scraping failed')
          }
        } catch (parseError) {
          // Ignore parse errors for individual events
          console.warn('Failed to parse Mino event:', parseError)
        }
      }

      if (finalResult) break
    }
  } finally {
    reader.releaseLock()
  }

  return finalResult
}
