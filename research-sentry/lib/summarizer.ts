import OpenAI from 'openai';
import { ResearchPaper } from './types';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

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
  Be concrete and professional.
  `;

    const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
    });

    return response.choices[0].message.content!;
}

export async function synthesizeSpeech(text: string) {
    const mp3 = await openai.audio.speech.create({
        model: 'tts-1',
        voice: 'alloy',
        input: text,
    });

    return Buffer.from(await mp3.arrayBuffer());
}
