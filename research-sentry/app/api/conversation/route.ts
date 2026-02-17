import { NextRequest, NextResponse } from 'next/server';
import { generateConversationResponse } from '@/lib/conversation';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
    try {
        const { history, context } = await req.json();

        if (!history || !Array.isArray(history)) {
            return NextResponse.json({ error: 'Invalid history format' }, { status: 400 });
        }

        const response = await generateConversationResponse(history, context);

        return NextResponse.json(response);
    } catch (error) {
        console.error('Conversation API Error:', error);
        return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 });
    }
}
