import { NextRequest } from 'next/server';
import { TinyFish } from '@tiny-fish/sdk';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const { url, datasetName, useCase } = await request.json();

    if (!url) {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!process.env.TINYFISH_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'TINYFISH_API_KEY not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const client = new TinyFish();

    const useCaseLabel =
      useCase === 'machine-learning'
        ? 'Machine Learning'
        : useCase === 'academic-research'
          ? 'Academic Research'
          : useCase === 'visualization'
            ? 'Data Visualization'
            : 'General Analysis';

    const goal = `You are extracting user-facing metadata for the dataset "${datasetName}" to help users decide if this dataset is right for them.

GOAL: Create a simple, factual dataset card that answers "Should I use this dataset?"

SOURCE PRIORITY (use first accessible):
1. Official documentation or institutional website
2. GitHub README
3. HuggingFace dataset card
4. Research paper
5. Open data portals (UCI, data.gov)
6. Platform pages (Kaggle) - last resort

INSPECTION RULES:
- Use the FIRST accessible authoritative source, then STOP.
- If blocked (CAPTCHA, login wall, 403), try next source.
- Only mark as Blocked if ALL sources fail.
- Report ONLY what you can directly observe on the page.
- Do NOT guess, infer, or speculate.

EXTRACT THESE FIELDS (from the page):

1. description: One sentence about what the data contains
2. best_for: Array of 2-4 specific use cases this data is good for
3. data_type: "Tabular" | "Images" | "Text" | "Audio" | "Video" | "Mixed"
4. source: The platform name (GitHub, HuggingFace, UCI, Official Website, etc.)
5. access: "Direct Download" | "API" | "Request Required" | "Unknown"
6. what_you_get:
   - columns: List key columns/fields if visible
   - coverage: Time range or scope if stated
   - frequency: Data frequency if applicable
   - size: Exact size if shown
7. notes: Array of 1-3 important caveats
8. status: "Accessible" | "Partial" | "Blocked"
9. usability_risk: "Low" (all metadata clear) | "Medium" (some gaps) | "High" (major issues) | "Cannot Assess"

User's intended use case: ${useCaseLabel}

STRICT OUTPUT (return exactly this JSON and nothing else):
{
  "name": "${datasetName}",
  "description": "One sentence about the data",
  "best_for": ["Use case 1", "Use case 2", "Use case 3"],
  "data_type": "Tabular | Images | Text | Audio | Video | Mixed",
  "source": "Platform name",
  "access": "Direct Download | API | Request Required | Unknown",
  "what_you_get": {
    "columns": "column1, column2, column3",
    "coverage": "Time range or scope",
    "frequency": "Daily | Hourly | etc.",
    "size": "50,000 rows or 2.3GB"
  },
  "notes": ["Important caveat 1", "Important caveat 2"],
  "direct_link": "${url}",
  "status": "Accessible | Partial | Blocked",
  "usability_risk": "Low | Medium | High | Cannot Assess"
}

FINAL RULE: Return ONLY the JSON object above. No planning text, no step reports, no reasoning traces.`;

    const stream = await client.agent.stream({ url, goal });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            const line = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(line));
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        } catch (error) {
          console.error('Stream error:', error);
          const errPayload = { type: 'ERROR', message: error instanceof Error ? error.message : 'Stream failed' };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errPayload)}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in analyze-dataset:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
