import Groq from 'groq-sdk';
import { ResearchPaper } from './types';

const getGroq = () => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY is not configured');
    return new Groq({ apiKey });
};

// Shape the CitationTracker component expects
export interface TrackedPaper {
    paperId: string;
    title: string;
    currentCitationCount: number;
    trend: 'up' | 'down' | 'stable';
    velocity: number; // citations per month
    impactProjections: {
        nextYear: number;
        fiveYear: number;
    };
    topicScore: number;
    lastUpdated: string;
}

export async function analyzeCitationNetwork(paper: ResearchPaper): Promise<TrackedPaper> {
    const groq = getGroq();

    const currentCitations = paper.citations ?? 0;

    const prompt = `Analyze this academic paper and predict its citation trajectory.

Paper: "${paper.title}"
Authors: ${Array.isArray(paper.authors) ? paper.authors.join(', ') : paper.authors}
Year: ${paper.publishedDate ? new Date(paper.publishedDate).getFullYear() : 'unknown'}
Current citations: ${currentCitations}
Source: ${paper.source}

Based on the paper's topic, age, and current citation count, estimate:
1. Citation trend: "up", "down", or "stable"
2. Monthly velocity (citations per month as a number)
3. Projected citations in 1 year (integer)
4. Projected citations in 5 years (integer)
5. Topic relevance score 1-100

Return ONLY valid JSON, no markdown:
{
  "trend": "up",
  "velocity": 5,
  "nextYear": 150,
  "fiveYear": 400,
  "topicScore": 75
}`;

    try {
        const response = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 200,
        });

        const content = response.choices[0]?.message?.content ?? '{}';
        let parsed: Record<string, unknown>;
        try {
            parsed = JSON.parse(content.replace(/```json\n?|```/g, '').trim());
        } catch {
            parsed = {};
        }

        const trend = (['up', 'down', 'stable'].includes(parsed.trend as string)
            ? parsed.trend
            : currentCitations > 50 ? 'up' : 'stable') as 'up' | 'down' | 'stable';

        const velocity = Number(parsed.velocity ?? Math.max(1, Math.round(currentCitations / 12)));
        const nextYear = Number(parsed.nextYear ?? currentCitations + velocity * 12);
        const fiveYear = Number(parsed.fiveYear ?? currentCitations + velocity * 60);

        return {
            paperId: paper.id ?? paper.url ?? paper.title,
            title: paper.title,
            currentCitationCount: currentCitations,
            trend,
            velocity,
            impactProjections: { nextYear, fiveYear },
            topicScore: Number(parsed.topicScore ?? 60),
            lastUpdated: new Date().toISOString(),
        };
    } catch {
        // Fallback with sensible defaults if Groq fails
        const velocity = Math.max(1, Math.round(currentCitations / 12));
        return {
            paperId: paper.id ?? paper.title,
            title: paper.title,
            currentCitationCount: currentCitations,
            trend: 'stable',
            velocity,
            impactProjections: {
                nextYear: currentCitations + velocity * 12,
                fiveYear: currentCitations + velocity * 60,
            },
            topicScore: 60,
            lastUpdated: new Date().toISOString(),
        };
    }
}
