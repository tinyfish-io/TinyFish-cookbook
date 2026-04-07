import Groq from 'groq-sdk';
import { ResearchPaper } from './types';

function getGroq() {
    return new Groq({ apiKey: process.env.GROQ_API_KEY! });
}

export async function generatePaperSummary(paper: ResearchPaper, length: 'short' | 'medium' | 'long' = 'medium') {
    const words = length === 'short' ? 100 : length === 'medium' ? 300 : 600;

    const prompt = `Write a brief, practical written summary of this academic paper for a researcher.
  
Paper Title: ${paper.title}
Authors: ${paper.authors.join(', ')}
Abstract: ${paper.abstract}

Output format (plain text, no markdown):
- 1–2 short paragraphs max
- Then 3–5 bullet points (use "-" bullets) covering: problem, method, main results, and "why it matters"
- Avoid filler and "spoken" phrasing. Do NOT start with "This paper titled..."

Target length: ~${words} words.
Be concrete and professional.`;

    const response = await getGroq().chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 800,
    });

    return response.choices[0]?.message?.content ?? '';
}

// TTS not available in Groq — returns null, caller should handle gracefully
export async function synthesizeSpeech(_text: string): Promise<Buffer | null> {
    console.warn('[synthesizeSpeech] TTS not available with Groq — skipping audio synthesis');
    return null;
}
