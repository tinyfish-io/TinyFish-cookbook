import type { TinyFishSSEEvent } from '@/types';
import { TINYFISH_API_URL } from './constants';

export interface TinyFishRequestConfig {
  url: string;
  goal: string;
}

export type SSECallbacks = {
  onStep: (event: TinyFishSSEEvent) => void;
  onComplete: (resultJson: unknown) => void;
  onError: (error: string) => void;
  onStreamingUrl: (url: string) => void;
};

function parseSSELine(line: string): TinyFishSSEEvent | null {
  if (!line.startsWith('data: ')) return null;
  try {
    return JSON.parse(line.slice(6)) as TinyFishSSEEvent;
  } catch {
    return null;
  }
}

export function startTinyFishAgent(
  config: TinyFishRequestConfig,
  callbacks: SSECallbacks
): AbortController {
  const controller = new AbortController();
  const apiKey = import.meta.env.VITE_TINYFISH_API_KEY;

  if (!apiKey) {
    callbacks.onError('VITE_TINYFISH_API_KEY is not configured. Add it to your .env file.');
    return controller;
  }

  const run = async () => {
    try {
      const response = await fetch(TINYFISH_API_URL, {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`TinyFish API returned ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body from TinyFish API');

      const decoder = new TextDecoder();
      let buffer = '';
      let streamingUrlCaptured = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const event = parseSSELine(line);
          if (!event) continue;

          if (event.streamingUrl && !streamingUrlCaptured) {
            streamingUrlCaptured = true;
            callbacks.onStreamingUrl(event.streamingUrl);
          }

          if (event.type === 'STEP' || event.purpose || event.action) {
            callbacks.onStep(event);
          }

          if (event.type === 'COMPLETE' || event.status === 'COMPLETED') {
            callbacks.onComplete(event.resultJson ?? event);
            return;
          }

          if (event.type === 'ERROR' || event.status === 'FAILED') {
            callbacks.onError(event.message || 'Agent automation failed');
            return;
          }
        }
      }

      callbacks.onError('Agent stream ended unexpectedly');
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        callbacks.onError((error as Error).message);
      }
    }
  };

  run();
  return controller;
}
