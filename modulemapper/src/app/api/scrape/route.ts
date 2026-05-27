import { NextRequest } from 'next/server'
import { TinyFish, EventType, RunStatus } from '@tiny-fish/sdk'

export const runtime = 'nodejs'

interface AgentConfig {
  id: string
  source: string
  url: string
  goal: string
}

function buildAgents(params: {
  code: string
  university: string
  subreddits: string[]
  courseplatformUrl: string | null
  courseplatformName: string | null
  officialUrl: string | null
  rmpQuery: string
  blogQuery: string
}): AgentConfig[] {
  const agents: AgentConfig[] = []

  // Rate My Professors
  agents.push({
    id: 'rmp',
    source: 'Rate My Professor',
    url: `https://www.ratemyprofessors.com/search/professors?q=${encodeURIComponent(params.rmpQuery)}`,
    goal: `Extract professor reviews for ${params.code} at ${params.university}.

You are on the search results page. Do this efficiently:
1. Look at the professors listed. Only click into professors who clearly teach ${params.code} or its department.
2. For each relevant professor (max 3), read their ratings and the written reviews visible on their profile page. Do NOT paginate or load more — just read what is immediately visible.
3. Return immediately as JSON:
{
  "professors": [
    { "name": "...", "overallRating": 4.2, "difficultyRating": 3.1, "reviews": ["review text", ...] }
  ]
}

Stay focused. Do not explore unrelated professors or pages.`
  })

  // Reddit — one agent per subreddit, max 2
  for (let i = 0; i < Math.min(params.subreddits.length, 2); i++) {
    const sub = params.subreddits[i]
    agents.push({
      id: `reddit_${sub}`,
      source: `r/${sub}`,
      url: `https://www.reddit.com/r/${sub}/search/?q=${encodeURIComponent(params.code)}&sort=relevance&t=all`,
      goal: `Extract student reviews of ${params.code} at ${params.university} from this Reddit search page.

You are already on the search results. Do this efficiently:
1. Scan the post titles on this page. Identify posts that are specifically about ${params.code} (reviews, advice, "is it worth it", experience posts). Ignore unrelated posts entirely.
2. Click into the 2 most relevant posts only. Read the post body and the top 5-8 comments. Do NOT scroll endlessly or load more comments.
3. Extract key info: workload, difficulty, grading, exam tips, professor mentions, overall recommendation.
4. Return immediately as JSON:
{
  "reviews": ["student quote or paraphrase with context", ...],
  "workloadMentions": ["..."],
  "examTips": ["..."],
  "professorMentions": ["..."],
  "gradingInfo": ["..."]
}

Be precise. 2 posts maximum. Do not click anything unrelated.`
    })
  }

  // Course platform (NUSMods, Bruinwalk, etc.)
  if (params.courseplatformUrl && params.courseplatformName) {
    agents.push({
      id: 'platform',
      source: params.courseplatformName,
      url: params.courseplatformUrl,
      goal: `Extract course reviews and ratings for ${params.code} from this page.

You are already on the course page. Read what is visible:
- Overall rating, workload rating, difficulty rating (numbers)
- All written student reviews shown on this page

Do NOT navigate away. Do NOT click into individual reviews if they require separate page loads — just extract what is visible here.

Return as JSON:
{ "overallRating": 4.1, "workloadRating": 3.5, "difficultyRating": 3.8, "reviews": ["...", ...] }`
    })
  }

  // Official course page
  if (params.officialUrl) {
    agents.push({
      id: 'official',
      source: 'Official course page',
      url: params.officialUrl,
      goal: `Extract the official course info for ${params.code} from this page.

You are already on the page. Read only what is visible here — do NOT navigate elsewhere.
Extract: course title, description, learning outcomes, topics, prerequisites, assessment breakdown (exam %, CA %, project %).

Return as JSON:
{ "title": "...", "description": "...", "learningOutcomes": ["..."], "topics": ["..."], "prerequisites": "...", "assessmentBreakdown": "..." }`
    })
  }

  // Student blogs
  agents.push({
    id: 'blogs',
    source: 'Student blogs',
    url: `https://www.google.com/search?q=${encodeURIComponent(params.blogQuery)}`,
    goal: `Find student blog reviews of ${params.code} at ${params.university}.

You are on Google search results. Do this efficiently:
1. Scan the results. Click any result whose title/snippet clearly indicates it is a personal student review or experience post about ${params.code}. Try to find up to 3 such articles — if fewer exist, that is fine.
2. On each article, read only the main content. Extract the student's verdict, workload comments, exam tips, and recommendation.
3. Return as JSON:
{
  "reviews": ["detailed paraphrase of student experience and advice", ...],
  "source_urls": ["url1", ...]
}

If no results look relevant at all, return { "reviews": [], "source_urls": [] } immediately. Do not guess or click unrelated links.`
  })

  return agents
}

async function runTinyFishAgent(agent: AgentConfig, apiKey: string): Promise<{ source: string; raw: string; error?: string }> {
  try {
    const client = new TinyFish({ apiKey })
    let finalResult = ''

    const stream = await client.agent.stream(
      { url: agent.url, goal: agent.goal, browser_profile: 'stealth' },
      {
        onComplete: (event) => {
          if (event.status === RunStatus.COMPLETED && event.result != null) {
            finalResult = typeof event.result === 'string'
              ? event.result
              : JSON.stringify(event.result)
          }
        },
      }
    )

    // Drain stream so callbacks fire
    for await (const event of stream) {
      if (event.type === EventType.COMPLETE && !finalResult) {
        if (event.status === RunStatus.COMPLETED && event.result != null) {
          finalResult = typeof event.result === 'string'
            ? event.result
            : JSON.stringify(event.result)
        }
        break
      }
    }

    if (!finalResult) {
      return { source: agent.source, raw: '', error: 'No result returned from agent' }
    }

    return { source: agent.source, raw: finalResult }
  } catch (err) {
    return { source: agent.source, raw: '', error: String(err) }
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { code, university, subreddits, courseplatformUrl, courseplatformName, officialUrl, rmpQuery, blogQuery } = body

  const apiKey = process.env.TINYFISH_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Missing TINYFISH_API_KEY' }), { status: 500 })
  }

  const agents = buildAgents({ code, university, subreddits, courseplatformUrl, courseplatformName, officialUrl, rmpQuery, blogQuery })

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      send({ type: 'agents', agents: agents.map(a => ({ id: a.id, source: a.source })) })

      const promises = agents.map(async (agent) => {
        send({ type: 'agent_start', id: agent.id, source: agent.source })
        const result = await runTinyFishAgent(agent, apiKey)
        send({ type: 'agent_done', id: agent.id, source: agent.source, raw: result.raw, error: result.error })
        return result
      })

      const results = await Promise.all(promises)
      send({ type: 'all_done', results })
      controller.close()
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  })
}
