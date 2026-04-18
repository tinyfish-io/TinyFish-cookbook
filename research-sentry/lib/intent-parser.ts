import Groq from 'groq-sdk';

function getGroq() {
    return new Groq({ apiKey: process.env.GROQ_API_KEY! });
}

export async function parseSearchIntent(query: string): Promise<any> {
    const res = await getGroq().chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
            {
                role: 'system',
                content: 'You are a research search intent parser. Extract structured search parameters from natural language queries and return JSON only.'
            },
            {
                role: 'user',
                content: `Parse this research search query into structured parameters:\n"${query}"\n\nReturn JSON with:\n- keywords: string[]\n- authors: string[]\n- yearFrom: number | null\n- yearTo: number | null\n- topics: string[]\n- intent: "find_papers" | "compare" | "summarize" | "cite"\n\nReturn ONLY valid JSON, no markdown.`
            }
        ],
        max_tokens: 300,
    });

    const content = res.choices[0]?.message?.content ?? '{}';
    try {
        return JSON.parse(content.replace(/```json\n?|```/g, '').trim());
    } catch {
        return { keywords: [query], authors: [], yearFrom: null, yearTo: null, topics: [], intent: 'find_papers' };
    }
}
