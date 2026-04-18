import { NextRequest } from 'next/server'
import { TinyFish } from '@tiny-fish/sdk'

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()

  try {
    const { animeTitle, platformName, searchUrl } = await request.json()

    if (!animeTitle || !platformName || !searchUrl) {
      return new Response(
        encoder.encode(`data: ${JSON.stringify({ type: 'ERROR', message: 'Missing required fields' })}\n\n`),
        {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        }
      )
    }

    const apiKey = process.env.TINYFISH_API_KEY
    if (!apiKey) {
      return new Response(
        encoder.encode(`data: ${JSON.stringify({ type: 'ERROR', message: 'TinyFish API key not configured' })}\n\n`),
        {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        }
      )
    }

    const goal = `You are checking if the anime "${animeTitle}" is available to stream on ${platformName}.

STEP 1 - HANDLE POPUPS/MODALS:
If there are any cookie consent banners, login prompts, or promotional popups, dismiss them by clicking "Accept", "Close", "X", or "Continue".

STEP 2 - SEARCH FOR THE ANIME:
The page should already be on a search results page or the search has been initiated.
If there's a search box visible, search for: "${animeTitle}"

STEP 3 - ANALYZE SEARCH RESULTS:
Look at the search results carefully:
- Check if "${animeTitle}" or a very close match appears in the results
- Look for anime thumbnails, titles, and descriptions
- Verify it's the anime series, not just related content

STEP 4 - RETURN RESULT:
Return a JSON object with these fields:
{
  "available": true/false,
  "watchUrl": "URL to watch the anime if found",
  "subscriptionRequired": true/false,
  "message": "Brief description of what you found"
}

If the anime is NOT found or not available, set available to false and explain why in the message.
If you encounter a geo-restriction or region block, mention that in the message.`

    const client = new TinyFish({ apiKey })

    // Stream TinyFish SDK events directly to the client (SSE)
    const readable = new ReadableStream({
      async start(controller) {
        try {
          const stream = await client.agent.stream({
            url: searchUrl,
            goal,
          })

          for await (const event of stream) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
          }
        } catch (error) {
          console.error('Error streaming TinyFish response:', error)
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'ERROR', message: 'Stream interrupted' })}\n\n`
            )
          )
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Error in check-platform:', error)
    return new Response(
      encoder.encode(`data: ${JSON.stringify({ type: 'ERROR', message: 'Internal server error' })}\n\n`),
      {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      }
    )
  }
}
