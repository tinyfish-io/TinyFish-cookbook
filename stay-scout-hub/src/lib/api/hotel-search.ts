import { Platform, PlatformResult, SearchParams } from '@/types/hotel';

export async function discoverPlatforms(params: SearchParams): Promise<Platform[]> {
  const response = await fetch('/api/discover-platforms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) throw new Error('Failed to discover platforms');
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
      const response = await fetch('/api/check-platform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, params }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!response.body) throw new Error('No reader available');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
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
                  available: event.data?.available ?? true,
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
          } catch {
            // ignore parse errors
          }
        }
      }

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
      if ((error as Error).name !== 'AbortError' && !completed) {
        completed = true;
        clearTimeout(timeoutId);
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
  };

  fetchStream();
  return controller;
}
