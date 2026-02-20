import { useCallback, useRef } from 'react';
import { useSearchContext } from '@/context/SearchContext';
import type { SearchParams } from '@/types';
import { buildAgentGoal } from '@/lib/goal-builder';
import { startMinoAgent } from '@/lib/mino-client';

export function useRestaurantSearch() {
  const { state, dispatch } = useSearchContext();
  const controllersRef = useRef<AbortController[]>([]);

  const cancelAll = useCallback(() => {
    controllersRef.current.forEach(c => c.abort());
    controllersRef.current = [];
  }, []);

  const search = useCallback((params: SearchParams) => {
    cancelAll();
    dispatch({ type: 'START_SEARCH', payload: params });

    params.restaurants.forEach((restaurantName) => {
      const id = `${restaurantName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      dispatch({ type: 'AGENT_CONNECTING', payload: { id, restaurantName } });

      const { url, goal } = buildAgentGoal(
        restaurantName,
        params.city,
        params.allergens,
        params.preferences
      );

      const controller = startMinoAgent(
        { url, goal },
        {
          onStep: (event) => {
            const msg = event.purpose || event.action || event.message || 'Processing...';
            dispatch({ type: 'AGENT_STEP', payload: { id, step: msg } });
          },
          onStreamingUrl: (streamingUrl) => {
            dispatch({ type: 'AGENT_STREAMING_URL', payload: { id, streamingUrl } });
          },
          onComplete: (resultJson) => {
            dispatch({
              type: 'AGENT_COMPLETE',
              payload: { id, result: resultJson as import('@/types').RestaurantSafetyData },
            });
          },
          onError: (error) => {
            dispatch({ type: 'AGENT_ERROR', payload: { id, error } });
          },
        }
      );

      controllersRef.current.push(controller);
    });
  }, [cancelAll, dispatch]);

  const reset = useCallback(() => {
    cancelAll();
    dispatch({ type: 'RESET' });
  }, [cancelAll, dispatch]);

  return { search, cancelAll, reset, state };
}
