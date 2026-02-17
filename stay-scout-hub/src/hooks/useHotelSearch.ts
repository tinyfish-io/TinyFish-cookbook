import { useState, useCallback, useRef } from 'react';
import { Platform, PlatformResult, SearchParams } from '@/types/hotel';
import { discoverPlatforms, checkPlatform } from '@/lib/api/hotel-search';

export function useHotelSearch() {
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<PlatformResult[]>([]);
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
      // Stage 1: Discover platforms via Gemini
      const platforms = await discoverPlatforms(params);
      
      // Initialize results with pending status
      const initialResults: PlatformResult[] = platforms.map(p => ({
        platformId: p.id,
        platformName: p.name,
        searchUrl: p.searchUrl,
        status: 'pending',
        available: false,
        hotelsFound: 0,
      }));
      setResults(initialResults);

      // Stage 2: Check each platform in parallel via Mino
      let completedCount = 0;
      const totalPlatforms = platforms.length;

      const promises = platforms.map((platform) => {
        return new Promise<void>((resolve) => {
          // Update to searching status
          setResults(prev => prev.map(r => 
            r.platformId === platform.id 
              ? { ...r, status: 'searching' as const }
              : r
          ));

          const controller = checkPlatform(
            platform,
            params,
            // onStatus
            (update) => {
              setResults(prev => prev.map(r => 
                r.platformId === platform.id 
                  ? { ...r, ...update }
                  : r
              ));
            },
            // onComplete
            (result) => {
              setResults(prev => prev.map(r => 
                r.platformId === platform.id ? result : r
              ));
              completedCount++;
              if (completedCount === totalPlatforms) {
                setIsSearching(false);
              }
              resolve();
            },
            // onError
            (errorMsg) => {
              setResults(prev => prev.map(r => 
                r.platformId === platform.id 
                  ? { ...r, status: 'error' as const, error: errorMsg }
                  : r
              ));
              completedCount++;
              if (completedCount === totalPlatforms) {
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
