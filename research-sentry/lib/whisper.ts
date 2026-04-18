import Groq from 'groq-sdk';

function getGroq() {
    return new Groq({ apiKey: process.env.GROQ_API_KEY! });
}

export async function transcribeAudio(buffer: Buffer, filename = 'audio.webm') {
    const file = new File([new Uint8Array(buffer)], filename, { type: 'audio/webm' });
    const result = await getGroq().audio.transcriptions.create({
        file,
        model: 'whisper-large-v3',
    });
    return result.text;
}
