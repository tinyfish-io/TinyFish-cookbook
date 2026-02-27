import OpenAI from 'openai';
import { SearchCriteria } from './types';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function parseSearchIntent(query: string): Promise<SearchCriteria> {
    const res = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
            {
                role: 'system',
                content: `Parse research query into JSON: {searchKeywords, sources[], refinedAgenticGoal}.
                - searchKeywords: Short, high-quality search terms for API search (e.g., "LLM hallucinations").
                - refinedAgenticGoal: Detailed instructions for an AI agent (e.g., "Look for papers on X and focus on their methodology sections").
                Allowed sources: 'arxiv', 'pubmed', 'semantic_scholar', 'google_scholar', 'ieee', 'ssrn', 'core', 'doaj'.`
            },
            { role: 'user', content: query }
        ],
        response_format: { type: 'json_object' },
    });
    const parsed = JSON.parse(res.choices[0].message.content!);
    return {
        topic: parsed.searchKeywords || query,
        keywords: [],
        sources: parsed.sources || ['arxiv', 'semantic_scholar'],
        maxResults: 20,
        fullPrompt: parsed.refinedAgenticGoal || query
    };
}
