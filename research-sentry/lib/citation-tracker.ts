import OpenAI from 'openai';
import { ResearchPaper } from './types';

function getOpenAI() {
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
}

export interface TrackedPaper {
    paperId: string;
    title: string;
    currentCitationCount: number;
    trend: 'up' | 'down' | 'stable';
    velocity: number;
    impactProjections: { nextYear: number; fiveYear: number };
    topicScore: number;
    lastUpdated: string;
}

export async function analyzeCitationNetwork(paper: ResearchPaper): Promise<TrackedPaper> {
    const currentCitations = paper.citations ?? 0;
    const prompt = `Analyze this academic paper and predict its citation trajectory.

Paper: "${paper.title}"
Authors: ${Array.isArray(paper.authors) ? paper.authors.join(', ') : paper.authors}
Year: ${paper.publishedDate ? new Date(paper.publishedDate).getFullYear() : 'unknown'}
Current citations: ${currentCitations}
Source: ${paper.source}

Return ONLY valid JSON, no markdown:
{ "trend": "up", "velocity": 5, "nextYear": 150, "fiveYear": 400, "topicScore": 75 }`;

    try {
        const response = await getOpenAI().chat.completions.create({
            model: 'gpt-4o-mini',
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
            trend, velocity,
            impactProjections: { nextYear, fiveYear },
            topicScore: Number(parsed.topicScore ?? 60),
            lastUpdated: new Date().toISOString(),
        };
    } catch {
        const velocity = Math.max(1, Math.round(currentCitations / 12));
        return {
            paperId: paper.id ?? paper.title,
            title: paper.title,
            currentCitationCount: currentCitations,
            trend: 'stable', velocity,
            impactProjections: { nextYear: currentCitations + velocity * 12, fiveYear: currentCitations + velocity * 60 },
            topicScore: 60,
            lastUpdated: new Date().toISOString(),
        };
    }
}
