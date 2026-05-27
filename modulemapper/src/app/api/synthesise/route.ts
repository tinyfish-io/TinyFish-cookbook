import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

const GROQ_API = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_KEY = process.env.GROQ_API_KEY!

export async function POST(req: NextRequest) {
  const { code, university, results } = await req.json()

  const rawDataText = results
    .filter((r: { raw: string; error?: string }) => r.raw && !r.error)
    .map((r: { source: string; raw: string }) => `=== SOURCE: ${r.source} ===\n${r.raw}`)
    .join('\n\n')

  if (!rawDataText.trim()) {
    return Response.json({ error: 'No data scraped' }, { status: 400 })
  }

  const prompt = `You are an expert at analysing student course reviews. Analyse the following scraped data about the course ${code} at ${university} and return a structured JSON verdict.

The data may include Reddit posts with fields like "reviews", "workloadMentions", "examTips", "professorMentions", "gradingInfo" — use ALL of these fields when building your verdict.

SCRAPED DATA:
${rawDataText.slice(0, 14000)}

Return ONLY valid JSON (no markdown, no explanation) with this exact structure:
{
  "score": <number 1-10 based on overall sentiment>,
  "verdict": <short verdict string like "Generally recommended" or "Mixed reviews">,
  "summary": <2-3 sentence AI-written paragraph summarising the course experience>,
  "difficulty": <number 1-10>,
  "workload": <number 1-10>,
  "hoursPerWeek": <string like "~6 hrs/week">,
  "hasExam": <boolean>,
  "examDifficulty": <string: "Easy", "Moderate", "Hard", or "Very Hard">,
  "averageGrade": <string like "B+" or "B / B+" or "Unknown">,
  "gradingPattern": <string like "Bell curved" or "Absolute grading">,
  "assessment": <string describing assessment components>,
  "attendance": <string like "Affects grade" or "Not graded">,
  "whatYouLearn": <array of 4-6 strings, each a learning outcome>,
  "tags": [
    {"label": <string>, "color": <"blue"|"green"|"amber"|"red">}
  ],
  "bestFor": <string describing who should take this>,
  "notGreatIf": <string describing who should avoid this>,
  "reviews": [
    {
      "text": <actual quote from a student>,
      "source": <source name>,
      "sentiment": <"positive"|"negative"|"mixed">,
      "date": <date string if available, else "">
    }
  ],
  "sourceCounts": {
    <source name>: <number of reviews found>
  }
}

Rules:
- score reflects genuine student sentiment (not just your opinion)
- Extract real student quotes for reviews, at least 8 if available
- whatYouLearn should come from the official course page if available
- tags: blue=general info, green=positive trait, amber=neutral/warning, red=negative
- If data is insufficient for a field, use sensible defaults or "Unknown"`

  const response = await fetch(GROQ_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 3000
    })
  })

  if (!response.ok) {
    const err = await response.text()
    return Response.json({ error: `Groq error: ${err}` }, { status: 500 })
  }

  const data = await response.json()
  const text = data.choices?.[0]?.message?.content || ''

  try {
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    return Response.json(parsed)
  } catch {
    return Response.json({ error: 'Failed to parse Groq response', raw: text }, { status: 500 })
  }
}
