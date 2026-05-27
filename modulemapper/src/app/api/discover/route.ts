import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

const GROQ_API = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_KEY = process.env.GROQ_API_KEY!

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')?.trim().toUpperCase()
  const university = req.nextUrl.searchParams.get('university')?.trim()

  if (!code || !university) {
    return Response.json({ error: 'Missing code or university' }, { status: 400 })
  }

  const prompt = `You are a university course research assistant. Given a university and course code, return the best sources to scrape for student reviews.

University: ${university}
Course code: ${code}

Return ONLY valid JSON (no markdown, no explanation):
{
  "title": "<course title if you know it, otherwise just '${code}'>",
  "subreddits": ["<university's own subreddit e.g. nus, berkeley>", "<regional academic sub e.g. SGExams, UniUK, college>"],
  "courseplatformUrl": "<direct URL to this course on a student-run review platform like NUSMods, Bruinwalk, Carta, etc. null if unsure>",
  "courseplatformName": "<platform name e.g. NUSMods. null if unsure>",
  "officialUrl": "<direct URL to the official university course catalog page for this code. null if unsure>",
  "rmpQuery": "${code} ${university}",
  "blogQuery": "${code} ${university} course review"
}

Rules:
- Only include URLs you are confident are real and specific to this course. Use null if unsure — do not hallucinate URLs.
- subreddits[0] = university's own sub (e.g. "nus", "berkeley", "uoft"). subreddits[1] = best regional/general academic sub.`

  try {
    const response = await fetch(GROQ_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 400
      })
    })

    if (!response.ok) throw new Error('Groq failed')

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content || ''
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    return Response.json({ code, university, ...parsed })
  } catch {
    // Safe fallback if LLM call fails
    const uniSlug = university.toLowerCase().replace(/\s+/g, '')
    return Response.json({
      code,
      university,
      title: code,
      subreddits: [uniSlug, 'college'],
      courseplatformUrl: null,
      courseplatformName: null,
      officialUrl: null,
      rmpQuery: `${code} ${university}`,
      blogQuery: `${code} ${university} course review`
    })
  }
}
