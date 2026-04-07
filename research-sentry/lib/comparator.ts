import Groq from 'groq-sdk';
import { ResearchPaper } from './types';

function getGroq() {
    return new Groq({ apiKey: process.env.GROQ_API_KEY! });
}

export async function comparePapers(papers: ResearchPaper[]): Promise<any> {
    const paperSummaries = papers.map((p, i) =>
        `Paper ${i + 1}: "${p.title}" by ${p.authors.join(', ')} (${p.year || 'N/A'})\nAbstract: ${p.abstract?.substring(0, 400) || 'N/A'}`
    ).join('\n\n');

    const response = await getGroq().chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
            {
                role: 'system',
                content: 'You are a research paper comparison expert. Compare papers objectively and return structured JSON only.'
            },
            {
                role: 'user',
                content: `Compare these ${papers.length} research papers:\n\n${paperSummaries}\n\nReturn a JSON object with:\n- similarities: string[]\n- differences: string[]\n- methodology: {paper: number, method: string}[]\n- strengths: {paper: number, strengths: string[]}[]\n- weaknesses: {paper: number, weaknesses: string[]}[]\n- recommendation: string\n\nReturn ONLY valid JSON, no markdown.`
            }
        ],
        max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content ?? '{}';
    try {
        return JSON.parse(content.replace(/```json\n?|```/g, '').trim());
    } catch {
        return { similarities: [], differences: [], recommendation: 'Unable to compare papers.' };
    }
}
