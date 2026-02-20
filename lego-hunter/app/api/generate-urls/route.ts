import { generateRetailerUrls } from '@/lib/gemini-client'
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
    console.error('Error generating URLs:', error)
    return Response.json(
      { error: 'Failed to generate retailer URLs' },
      { status: 500 }
    )
  }
}
