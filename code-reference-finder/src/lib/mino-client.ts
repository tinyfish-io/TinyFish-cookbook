import { MINO_API_URL } from './constants';
import type { MinoRequestConfig, MinoCallbacks, MinoSSEEvent } from './types';

function parseSSELine(line: string): MinoSSEEvent | null {
  if (!line.startsWith('data: ')) return null;
  try {
    return JSON.parse(line.slice(6)) as MinoSSEEvent;
  } catch {
    return null;
  }
}

/**
 * Start a Mino agent and handle SSE stream (server-side).
 * Returns an AbortController for cancellation.
 */
export function startMinoAgent(
  config: MinoRequestConfig,
  callbacks: MinoCallbacks
): AbortController {
  const controller = new AbortController();
  const apiKey = process.env.TINYFISH_API_KEY;

  if (!apiKey || apiKey.includes('placeholder')) {
    callbacks.onError('TINYFISH_API_KEY is not configured');
    return controller;
  }

  fetch(MINO_API_URL, {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: config.url,
      goal: config.goal,
    }),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Mino HTTP error: ${response.status}`);
      }
      if (!response.body) {
        throw new Error('Mino response body is null');
      }

      const reader = response.body.getReader();
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

          // Capture streaming URL (comes early, only once)
          if (event.streamingUrl && !streamingUrlCaptured) {
            streamingUrlCaptured = true;
            callbacks.onStreamingUrl(event.streamingUrl);
          }

          // Progress steps
          if (event.type === 'STEP' || event.purpose || event.action) {
            callbacks.onStep(event);
          }

          // Final result
          if (event.type === 'COMPLETE' || event.status === 'COMPLETED') {
            if (event.resultJson) {
              callbacks.onComplete(event.resultJson);
            }
            return;
          }

          // Error
          if (event.type === 'ERROR' || event.status === 'FAILED') {
            callbacks.onError(event.message || 'Agent automation failed');
            return;
          }
        }
      }
    })
    .catch((error) => {
      if ((error as Error).name !== 'AbortError') {
        callbacks.onError((error as Error).message);
      }
    });

  return controller;
}
