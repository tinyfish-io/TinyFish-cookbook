import OpenAI from 'openai';

function getOpenAI() {
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
}

export interface Message { role: 'user' | 'assistant' | 'system'; content: string; }

export async function continueConversation(messages: Message[]): Promise<string> {
    try {
        const response = await getOpenAI().chat.completions.create({
            model: 'gpt-4o-mini',
            messages,
            max_tokens: 1000,
        });
        return response.choices[0]?.message?.content ?? '';
    } catch (err) {
        console.error('OpenAI conversation error', err);
        return '';
    }
}
