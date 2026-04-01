import { generateRetailerUrls } from '@/lib/openai-client'
import type { GenerateUrlsRequest } from '@/types'

export async function POST(request: Request) {
  try {
    const body: GenerateUrlsRequest = await request.json()

    if (!body.legoSetName) {
      return Response.json({ error: 'legoSetName is required' }, { status: 400 })
    }

    const retailers = await generateRetailerUrls(body.legoSetName)

    return Response.json({ retailers })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Error generating URLs:', message)
    return Response.json(
      { error: message },
      { status: 500 }
    )
  }
}
