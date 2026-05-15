import { NextRequest, NextResponse } from 'next/server';
import { continueConversation, Message } from '@/lib/conversation';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
    try {
        const { history, context } = await req.json();

        if (!history || !Array.isArray(history)) {
            return NextResponse.json({ error: 'Invalid history format' }, { status: 400 });
        }

        // Build messages array — prepend context as system message if provided
        const messages: Message[] = [];
        if (context) {
            messages.push({ role: 'system', content: `Research context: ${JSON.stringify(context)}` });
        }
        messages.push(...(history as Message[]));

        const response = await continueConversation(messages);

        return NextResponse.json({ response });
    } catch (error) {
        console.error('Conversation API Error:', error);
        return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 });
    }
}
