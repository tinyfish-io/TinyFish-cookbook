import { useState, useCallback, useRef } from 'react';
import { AreaSuggestion, AreaResearchResult, SearchParams } from '@/types/hotel';
import { discoverAreas, researchArea } from '@/lib/api/area-search';

export function useAreaSearch() {
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<AreaResearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const abortControllers = useRef<AbortController[]>([]);

  const cancelSearch = useCallback(() => {
    abortControllers.current.forEach(controller => controller.abort());
    abortControllers.current = [];
  }, []);

  const search = useCallback(async (params: SearchParams) => {
    cancelSearch();
    setIsSearching(true);
    setError(null);
    setResults([]);

    try {
      // Stage 1: Discover areas via Gemini
      const areas = await discoverAreas(params);

      // Initialize results with pending status
      const initialResults: AreaResearchResult[] = areas.map(area => ({
        areaId: area.id,
        areaName: area.name,
        status: 'pending',
      }));
      setResults(initialResults);

      // Stage 2: Research each area in parallel via Mino
      let completedCount = 0;
      const totalAreas = areas.length;

      const promises = areas.map((area) => {
        return new Promise<void>((resolve) => {
          // Update to researching status
          setResults(prev => prev.map(r =>
            r.areaId === area.id
              ? { ...r, status: 'researching' as const }
              : r
          ));

          const controller = researchArea(
            area,
            params,
            // onStatus
            (update) => {
              setResults(prev => prev.map(r =>
                r.areaId === area.id
                  ? { ...r, ...update }
                  : r
              ));
            },
            // onComplete
            (result) => {
              setResults(prev => prev.map(r =>
                r.areaId === area.id ? result : r
              ));
              completedCount++;
              if (completedCount === totalAreas) {
                setIsSearching(false);
              }
              resolve();
            },
            // onError
            (errorMsg) => {
              setResults(prev => prev.map(r =>
                r.areaId === area.id
                  ? { ...r, status: 'error' as const, error: errorMsg }
                  : r
              ));
              completedCount++;
              if (completedCount === totalAreas) {
                setIsSearching(false);
              }
              resolve();
            }
          );

          abortControllers.current.push(controller);
        });
      });

      await Promise.all(promises);
    } catch (e) {
      setError((e as Error).message);
      setIsSearching(false);
    }
  }, [cancelSearch]);

  return {
    search,
    isSearching,
    results,
    error,
    cancelSearch,
  };
}
