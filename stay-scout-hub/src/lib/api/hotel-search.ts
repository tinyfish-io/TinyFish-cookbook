import { Platform, PlatformResult, SearchParams } from '@/types/hotel';

const API_BASE = import.meta.env.VITE_SUPABASE_URL;

export async function discoverPlatforms(params: SearchParams): Promise<Platform[]> {
  const response = await fetch(`${API_BASE}/functions/v1/discover-platforms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error('Failed to discover platforms');
  }

  const data = await response.json();
  return data.platforms;
}

export function checkPlatform(
  platform: Platform,
  params: SearchParams,
  onStatus: (result: Partial<PlatformResult>) => void,
  onComplete: (result: PlatformResult) => void,
  onError: (error: string) => void
): AbortController {
  const controller = new AbortController();
  let completed = false;

  // Timeout after 60 seconds - mark as available so user can still visit website
  const timeoutId = setTimeout(() => {
    if (!completed) {
      completed = true;
      controller.abort();
      onComplete({
        platformId: platform.id,
        platformName: platform.name,
        searchUrl: platform.searchUrl,
        status: 'complete',
        available: true,
        hotelsFound: 0,
        message: 'Search timed out - click to check availability',
      });
    }
  }, 60000);

  const fetchStream = async () => {
    try {
      const response = await fetch(`${API_BASE}/functions/v1/check-platform`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ platform, params }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No reader available');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') continue;

            try {
              const event = JSON.parse(jsonStr);
              
              if (event.type === 'STATUS') {
                onStatus({
                  platformId: platform.id,
                  platformName: platform.name,
                  searchUrl: platform.searchUrl,
                  status: 'searching',
                  statusMessage: event.message,
                });
              } else if (event.type === 'SCREENSHOT' && event.data?.streamingUrl) {
                // Live browser streaming URL received
                onStatus({
                  platformId: platform.id,
                  platformName: platform.name,
                  searchUrl: platform.searchUrl,
                  status: 'searching',
                  streamingUrl: event.data.streamingUrl,
                });
              } else if (event.type === 'COMPLETE') {
                if (!completed) {
                  completed = true;
                  clearTimeout(timeoutId);
                  onComplete({
                    platformId: platform.id,
                    platformName: platform.name,
                    searchUrl: event.data?.searchResultsUrl || platform.searchUrl,
                    status: 'complete',
                    available: event.data?.available || true,
                    hotelsFound: event.data?.hotelsFound || 0,
                    message: event.data?.message,
                  });
                }
              } else if (event.type === 'ERROR') {
                if (!completed) {
                  completed = true;
                  clearTimeout(timeoutId);
                  onError(event.message || 'Unknown error');
                }
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }

      // If stream ends without COMPLETE, mark as available anyway
      if (!completed) {
        completed = true;
        clearTimeout(timeoutId);
        onComplete({
          platformId: platform.id,
          platformName: platform.name,
          searchUrl: platform.searchUrl,
          status: 'complete',
          available: true,
          hotelsFound: 0,
          message: 'Search completed',
        });
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        if (!completed) {
          completed = true;
          clearTimeout(timeoutId);
          // On error, still show as available so user can visit the website
          onComplete({
            platformId: platform.id,
            platformName: platform.name,
            searchUrl: platform.searchUrl,
            status: 'complete',
            available: true,
            hotelsFound: 0,
            message: 'Click to check availability',
          });
        }
      }
    }
  };

  fetchStream();
  return controller;
}
