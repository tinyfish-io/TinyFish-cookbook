import OpenAI from 'openai';
import { ResearchPaper } from './types';

// Mock database for tracked papers in this demo
// In a real app, this would be a database model
export interface TrackedPaper {
    id: string; // Paper ID
    paperTitle: string;
    originalCitationCount: number;
    currentCitationCount: number;
    velocity: number; // Citations per month
    lastChecked: number;
    trend: 'up' | 'stable' | 'down';
    impactProjections: {
        nextYear: number;
        fiveYear: number;
    };
}

const getOpenAI = () => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('OPENAI_API_KEY is not configured');
    }
    return new OpenAI({ apiKey });
};

export async function analyzeCitationTrend(paper: ResearchPaper): Promise<TrackedPaper> {
    const openai = getOpenAI();
    // Simulating citation analysis with AI since we don't have historical data access in this demo
    const prompt = `Analyze the potential citation impact of this research paper:
  Title: "${paper.title}"
  Current Citations: ${paper.citations || 0}
  Published: ${paper.publishedDate}
  Source: ${paper.source}
  
  Estimate the "Citation Velocity" (citations/month) and predict impact.
  Return JSON:
  {
    "velocity": number,
    "trend": "up" | "stable" | "down",
    "impactProjections": { "nextYear": number, "fiveYear": number }
  }
  `;

    const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
    });

    const choice = response.choices?.[0];
    if (!choice) {
        throw new Error('OpenAI returned no choices');
    }
    if (choice.finish_reason === 'length') {
        throw new Error('OpenAI response was truncated');
    }
    let analysis: any;
    try {
        analysis = JSON.parse(choice.message.content ?? '{}');
    } catch (error) {
        throw new Error('OpenAI returned invalid JSON');
    }

    return {
        id: paper.id,
        paperTitle: paper.title,
        originalCitationCount: paper.citations || 0,
        currentCitationCount: paper.citations || 0, // In real app, this updates
        lastChecked: Date.now(),
        velocity: analysis.velocity,
        trend: analysis.trend,
        impactProjections: analysis.impactProjections
    };
}
