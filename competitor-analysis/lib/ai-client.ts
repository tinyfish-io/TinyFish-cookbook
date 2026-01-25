import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateObject, generateText } from 'ai';
import { z } from 'zod';

// Create OpenRouter provider with API key
function createOpenRouterProvider() {
  return createOpenAICompatible({
    name: 'openrouter',
    baseURL: 'https://openrouter.ai/api/v1',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://pricing-intelligence.vercel.app',
      'X-Title': 'Pricing Intelligence Dashboard',
    },
  });
}

// Get the MiniMax M2.1 model via OpenRouter
export function getModel(modelId: string = 'minimax/minimax-m2.1') {
  const openrouter = createOpenRouterProvider();
  return openrouter.chatModel(modelId);
}

// Generate structured output with schema using generateObject
export async function generateStructured<T>(
  prompt: string,
  schema: z.ZodSchema<T>,
  options?: {
    modelId?: string;
    system?: string;
  }
): Promise<T> {
  const model = getModel(options?.modelId);

  try {
    // First try generateObject for proper structured output
    const { object } = await generateObject({
      model,
      schema,
      system: options?.system || 'You are a helpful assistant.',
      prompt,
    });

    return object as T;
  } catch (error) {
    // Fallback to generateText with JSON parsing if generateObject fails
    console.log('generateObject failed, falling back to generateText:', error);

    const { text } = await generateText({
      model,
      system: options?.system || 'You are a helpful assistant that always responds with valid JSON.',
      prompt: `${prompt}\n\nIMPORTANT: Respond with valid JSON only. No markdown, no code blocks, no explanations. All arrays must be actual arrays, not stringified JSON.`,
    });

    // Parse the JSON response - handle both array and object responses
    const jsonMatch = text.match(/[\[{][\s\S]*[\]}]/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response: ' + text.slice(0, 200));
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);

      // Handle case where model returns stringified nested objects
      for (const key of Object.keys(parsed)) {
        if (typeof parsed[key] === 'string' && (parsed[key].startsWith('[') || parsed[key].startsWith('{'))) {
          try {
            parsed[key] = JSON.parse(parsed[key]);
          } catch {
            // Keep as string if parsing fails
          }
        }
      }

      return schema.parse(parsed);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw text:', text.slice(0, 500));
      throw parseError;
    }
  }
}

// Simple text generation
export async function generateAIText(
  prompt: string,
  options?: {
    modelId?: string;
    system?: string;
  }
): Promise<string> {
  const model = getModel(options?.modelId);

  const { text } = await generateText({
    model,
    system: options?.system,
    prompt,
  });

  return text;
}
