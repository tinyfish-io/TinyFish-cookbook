import OpenAI from 'openai';
import { Message, ResearchPaper } from './types';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function generateConversationResponse(
  history: Message[], 
  context?: { papers?: ResearchPaper[], query?: string }
): Promise<{ content: string, relatedPapers?: ResearchPaper[] }> {
  
  const systemPrompt = `You are a sophisticated Research Assistant AI. 
  Your goal is to help users explore academic literature, understand paper details, and find connections.
  
  Context:
  ${context?.query ? `Current Search Query: "${context.query}"` : ''}
  ${context?.papers ? `Found Papers: ${context.papers.map(p => `- ${p.title} (${p.publishedDate})`).join('\n')}` : ''}
  
  Guidelines:
  1. Be concise but insightful.
  2. If discussing specific papers, cite them clearly.
  3. Can answer questions about methodology, results, and implications based on standard academic knowledge.
  4. If the user asks for a comparison, structure it clearly.
  5. Provide a conversational, professional tone.
  `;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map(m => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content }))
  ];

  let response;
  try {
    response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messages as any,
      temperature: 0.7,
      max_tokens: 500,
    });
  } catch (err) {
    console.error('OpenAI conversation error', err);
    return {
      content: "I couldn't generate a response.",
      relatedPapers: context?.papers,
    };
  }

  const content = response?.choices?.[0]?.message?.content;
  return {
    content: content || "I couldn't generate a response.",
    // in a real implementation, we might extract new paper references here
    relatedPapers: context?.papers // maintain context
  };
}
