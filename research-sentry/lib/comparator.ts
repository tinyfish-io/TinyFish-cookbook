import OpenAI from 'openai';
import { ResearchPaper } from './types';

function getOpenAI() {
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
}

export interface ComparisonResult {
    similarities: string[];
    differences: string[];
    methodology: { paper: number; method: string }[];
    strengths: { paper: number; strengths: string[] }[];
    weaknesses: { paper: number; weaknesses: string[] }[];
    recommendation: string;
    points?: { metric: string; papers: Record<string, string>; insight: string }[];
    summary?: string;
}

export async function comparePapers(papers: ResearchPaper[]): Promise<ComparisonResult> {
    const paperSummaries = papers.map((p, i) => {
        const year = p.publishedDate ? new Date(p.publishedDate).getFullYear() : 'N/A';
        return `Paper ${i + 1}: "${p.title}" by ${p.authors.join(', ')} (${year})\nAbstract: ${p.abstract?.substring(0, 400) || 'N/A'}`;
    }).join('\n\n');

    const prompt = `Compare these ${papers.length} research papers:\n\n${paperSummaries}\n\nReturn a JSON object with:\n- similarities: string[]\n- differences: string[]\n- methodology: {paper: number, method: string}[]\n- strengths: {paper: number, strengths: string[]}[]\n- weaknesses: {paper: number, weaknesses: string[]}[]\n- recommendation: string\n\nReturn ONLY valid JSON, no markdown.`;

    try {
        const response = await getOpenAI().chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: 'You are a research paper comparison expert. Compare papers objectively and return structured JSON only.' },
                { role: 'user', content: prompt }
            ],
            max_tokens: 1000,
        });
        const content = response.choices[0]?.message?.content ?? '{}';
        return JSON.parse(content.replace(/```json\n?|```/g, '').trim());
    } catch {
        return { similarities: [], differences: [], methodology: [], strengths: [], weaknesses: [], recommendation: 'Unable to compare papers.' };
    }
}
