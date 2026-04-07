import Groq from 'groq-sdk';

function getGroq() {
    return new Groq({ apiKey: process.env.GROQ_API_KEY! });
}

export interface Message { role: 'user' | 'assistant' | 'system'; content: string; }

export async function continueConversation(messages: Message[]): Promise<string> {
    try {
        const response = await getGroq().chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages,
            max_tokens: 1000,
        });
        return response.choices[0]?.message?.content ?? '';
    } catch (err) {
        console.error('Groq conversation error', err);
        return '';
    }
}
