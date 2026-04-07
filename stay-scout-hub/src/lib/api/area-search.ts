import { AreaSuggestion, AreaResearchResult, SearchParams } from '@/types/hotel';

export async function discoverAreas(params: SearchParams): Promise<AreaSuggestion[]> {
  const response = await fetch('/api/discover-areas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) throw new Error('Failed to discover areas');
  const data = await response.json();
  return data.areas;
}

export function researchArea(
  area: AreaSuggestion,
  params: SearchParams,
  onStatus: (result: Partial<AreaResearchResult>) => void,
  onComplete: (result: AreaResearchResult) => void,
  onError: (error: string) => void
): AbortController {
  const controller = new AbortController();
  let completed = false;

  const timeoutId = setTimeout(() => {
    if (!completed) {
      completed = true;
      controller.abort();
      onComplete({
        areaId: area.id,
        areaName: area.name,
        status: 'complete',
        analysis: {
          suitability: 'moderate',
          suitabilityScore: 5,
          summary: `Research timed out. ${area.name} appears to be a valid area for your stay, but we couldn't complete the full analysis.`,
          pros: [area.whyRecommended],
          cons: ['Limited research data available'],
          risks: ['Consider doing your own research'],
        },
      });
    }
  }, 180000);

  const fetchStream = async () => {
    try {
      const response = await fetch('/api/research-area', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ area, params }),
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

            if (event.data?.streamingUrl) {
              onStatus({
                areaId: area.id,
                areaName: area.name,
                status: 'researching',
                streamingUrl: event.data.streamingUrl,
              });
            }

            if (event.type === 'STATUS') {
              onStatus({
                areaId: area.id,
                areaName: area.name,
                status: 'researching',
                currentAction: event.message,
              });
            } else if (event.type === 'COMPLETE') {
              if (!completed) {
                completed = true;
                clearTimeout(timeoutId);
                onComplete({
                  areaId: area.id,
                  areaName: area.name,
                  status: 'complete',
                  analysis: event.data?.analysis,
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
          areaId: area.id,
          areaName: area.name,
          status: 'complete',
          analysis: {
            suitability: 'good',
            suitabilityScore: 6,
            summary: `${area.name} is a commonly recommended area. ${area.whyRecommended}`,
            pros: [area.whyRecommended],
            cons: [],
            risks: [],
          },
        });
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError' && !completed) {
        completed = true;
        clearTimeout(timeoutId);
        onComplete({
          areaId: area.id,
          areaName: area.name,
          status: 'complete',
          analysis: {
            suitability: 'moderate',
            suitabilityScore: 5,
            summary: `Could not complete full research for ${area.name}. ${area.whyRecommended}`,
            pros: [area.whyRecommended],
            cons: ['Research incomplete'],
            risks: [],
          },
        });
      }
    }
  };

  fetchStream();
  return controller;
}
