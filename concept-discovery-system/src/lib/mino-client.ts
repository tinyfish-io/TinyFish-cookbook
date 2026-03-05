import { MINO_API_URL } from './constants';
import type { MinoRequestConfig, MinoCallbacks, MinoSSEEvent } from '@/types';

/**
 * Parse a single SSE line
 */
function parseSSELine(line: string): MinoSSEEvent | null {
  if (!line.startsWith('data: ')) return null;

  try {
    return JSON.parse(line.slice(6)) as MinoSSEEvent;
  } catch {
    return null;
  }
}

/**
 * Start a Mino agent and handle SSE stream
 * Returns an AbortController for cancellation
 */
export function startMinoAgent(
  config: MinoRequestConfig,
  callbacks: MinoCallbacks
): AbortController {
  const controller = new AbortController();
  const apiKey = import.meta.env.VITE_MINO_API_KEY;

  // Check API key
  if (!apiKey) {
    callbacks.onError('Mino API key is not configured. Add it to your .env file.');
    return controller;
  }

  // Start the fetch request
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
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
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
        buffer = lines.pop() ?? ''; // Keep incomplete line in buffer

        for (const line of lines) {
          const event = parseSSELine(line);
          if (!event) continue;

          // 1. Capture streaming URL (comes early, only once)
          if (event.streamingUrl && !streamingUrlCaptured) {
            streamingUrlCaptured = true;
            callbacks.onStreamingUrl(event.streamingUrl);
          }

          // 2. Progress steps
          if (event.type === 'STEP' || event.purpose || event.action) {
            callbacks.onStep(event);
          }

          // 3. Final result
          if (event.type === 'COMPLETE' || event.status === 'COMPLETED') {
            if (event.resultJson) {
              callbacks.onComplete(event.resultJson);
            }
            return;
          }

          // 4. Error
          if (event.type === 'ERROR' || event.status === 'FAILED') {
            callbacks.onError(event.message || 'Agent automation failed');
            return;
          }
        }
      }
    })
    .catch((error) => {
      // Don't trigger error for aborted requests
      if ((error as Error).name !== 'AbortError') {
        callbacks.onError((error as Error).message);
      }
    });

  return controller;
}
