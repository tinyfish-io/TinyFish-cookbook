"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import type { TestCase, TestResult, TestEvent } from '@/types';

/**
 * Hook for localStorage with SSR support
 * Uses lazy initialization to avoid setState in effect
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // Use lazy initialization to read from localStorage on first render
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    setStoredValue((currentValue) => {
      try {
        const valueToStore = value instanceof Function ? value(currentValue) : value;
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
        return valueToStore;
      } catch (error) {
        console.error('Error writing to localStorage:', error);
        return currentValue;
      }
    });
  }, [key]);

  return [storedValue, setValue];
}

/**
 * Hook for managing test execution with SSE
 */
export function useTestExecution(onComplete?: (finalResults: Map<string, TestResult>) => void) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [results, setResults] = useState<Map<string, TestResult>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const resultsRef = useRef<Map<string, TestResult>>(new Map());

  // Define handleTestEvent before executeTests so it can be used as a dependency
  const handleTestEvent = useCallback((event: TestEvent) => {
    const { testCaseId, data } = event;

    setResults((prev) => {
      const newResults = new Map(prev);
      const existing = newResults.get(testCaseId) || {
        id: `result-${testCaseId}`,
        testCaseId,
        status: 'running' as const,
        startedAt: Date.now(),
      };

      switch (event.type) {
        case 'test_start':
          newResults.set(testCaseId, {
            ...existing,
            status: 'running' as const,
            startedAt: event.timestamp,
          });
          break;

        case 'streaming_url':
          newResults.set(testCaseId, {
            ...existing,
            streamingUrl: data?.streamingUrl,
          });
          break;

        case 'step_progress':
          newResults.set(testCaseId, {
            ...existing,
            currentStep: data?.currentStep,
            totalSteps: data?.totalSteps,
            currentStepDescription: data?.stepDescription,
          });
          break;

        case 'test_complete':
          if (data?.result) {
            newResults.set(testCaseId, data.result);
            // Also update the ref for immediate access
            resultsRef.current.set(testCaseId, data.result);
          }
          break;

        case 'test_error': {
          const errorResult = {
            ...existing,
            status: 'error' as const,
            error: data?.error,
            completedAt: event.timestamp,
          };
          newResults.set(testCaseId, errorResult);
          // Also update the ref for immediate access
          resultsRef.current.set(testCaseId, errorResult);
          break;
        }
      }

      return newResults;
    });
  }, []);

  const executeTests = useCallback(async (
    testCases: TestCase[],
    websiteUrl: string,
    parallelLimit: number = 3
  ) => {
    if (isExecuting) return;

    setIsExecuting(true);
    setError(null);
    setResults(new Map());
    resultsRef.current = new Map();

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/execute-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testCases,
          websiteUrl,
          parallelLimit,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event: TestEvent = JSON.parse(line.slice(6));
              handleTestEvent(event);
            } catch (e) {
              console.error('Failed to parse SSE event:', e);
            }
          }
        }
      }

      // Pass the final results to onComplete
      onComplete?.(resultsRef.current);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Test execution cancelled');
      } else {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
      }
    } finally {
      setIsExecuting(false);
      abortControllerRef.current = null;
    }
  }, [isExecuting, onComplete, handleTestEvent]);

  const cancelExecution = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const getResult = useCallback((testCaseId: string): TestResult | undefined => {
    return results.get(testCaseId);
  }, [results]);

  const skipTest = useCallback((testCaseId: string) => {
    setResults((prev) => {
      const newResults = new Map(prev);
      const existing = newResults.get(testCaseId);
      if (existing && (existing.status === 'running' || existing.status === 'pending')) {
        newResults.set(testCaseId, {
          ...existing,
          status: 'skipped',
          completedAt: Date.now(),
          duration: existing.startedAt ? Date.now() - existing.startedAt : 0,
        });
      }
      return newResults;
    });
  }, []);

  return {
    isExecuting,
    results: Array.from(results.values()),
    resultsMap: results,
    error,
    executeTests,
    cancelExecution,
    getResult,
    skipTest,
  };
}

/**
 * Hook for debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook for window resize
 */
export function useWindowSize() {
  const [size, setSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    function handleResize() {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
}

/**
 * Hook for keyboard shortcuts
 */
export function useKeyboardShortcut(
  key: string,
  callback: () => void,
  modifiers: { ctrl?: boolean; meta?: boolean; shift?: boolean; alt?: boolean } = {}
) {
  // Use a ref to store the callback to avoid stale closures
  const callbackRef = useRef(callback);
  
  // Update the ref whenever callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const { ctrl, meta, shift, alt } = modifiers;
      const modifierMatch =
        (ctrl === undefined || event.ctrlKey === ctrl) &&
        (meta === undefined || event.metaKey === meta) &&
        (shift === undefined || event.shiftKey === shift) &&
        (alt === undefined || event.altKey === alt);

      if (event.key.toLowerCase() === key.toLowerCase() && modifierMatch) {
        event.preventDefault();
        callbackRef.current();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [key, modifiers.ctrl, modifiers.meta, modifiers.shift, modifiers.alt]);
}

/**
 * Hook for click outside detection
 */
export function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  callback: () => void
) {
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [ref, callback]);
}

/**
 * Hook for elapsed time counter
 */
export function useElapsedTime(startTime: number | null, isRunning: boolean): number {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isRunning || !startTime) {
      return;
    }

    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 100);

    return () => clearInterval(interval);
  }, [startTime, isRunning]);

  return elapsed;
}
