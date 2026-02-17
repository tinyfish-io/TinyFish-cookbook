import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function transcribeAudio(buffer: Buffer, filename = 'audio.webm') {
    const file = new File([new Uint8Array(buffer)], filename, { type: 'audio/webm' });
    const result = await openai.audio.transcriptions.create({
        file,
        model: 'whisper-1',
    });
    return result.text;
}
