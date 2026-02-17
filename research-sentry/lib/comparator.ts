import OpenAI from 'openai';
import { ResearchPaper } from './types';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export interface ComparisonPoint {
    metric: string;
    papers: { [paperId: string]: string };
    insight: string;
}

export interface ComparisonResult {
    points: ComparisonPoint[];
    summary: string;
}

export async function comparePapers(papers: ResearchPaper[]): Promise<ComparisonResult> {
    const prompt = `Compare the following ${papers.length} research papers. 
  
  Papers:
  ${papers.map((p, i) => `[ID: ${p.id}] Title: ${p.title}\nAbstract: ${p.abstract}\n`).join('\n')}
  
  Generate a structured comparison focussing on:
  1. Methodology
  2. Dataset/Sample Size
  3. Key Results/Accuracy
  4. Limitations
  
  Return a JSON object with:
  - points: Array of objects { metric: string, papers: { [id]: string value }, insight: string }
  - summary: string (High-level synthesis of differences)
  `;

    const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
    });

    const content = JSON.parse(response.choices[0].message.content!);
    return content;
}
