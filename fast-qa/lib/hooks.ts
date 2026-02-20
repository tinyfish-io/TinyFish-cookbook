"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import type { TestCase, TestResult } from '@/types';

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
 * Hook for managing test execution via SSE streaming.
 * 
 * Each test case is executed individually via POST /api/execute-test which returns
 * a streaming SSE response. The client manages parallelism (default 3 concurrent) 
 * and updates results in real-time as events arrive.
 */
export function useTestExecution(onComplete?: (finalResults: Map<string, TestResult>) => void) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [results, setResults] = useState<Map<string, TestResult>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const abortControllersRef = useRef<AbortController[]>([]);
  const cancelledRef = useRef(false);
  const resultsRef = useRef<Map<string, TestResult>>(new Map());
  const eventSourcesRef = useRef<EventSource[]>([]);

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
    abortControllersRef.current = [];
    eventSourcesRef.current = [];
    cancelledRef.current = false;

    // Mark all tests as pending
    setResults(() => {
      const initial = new Map<string, TestResult>();
      for (const tc of testCases) {
        initial.set(tc.id, {
          id: `result-${tc.id}`,
          testCaseId: tc.id,
          status: 'pending',
          startedAt: Date.now(),
        });
      }
      return initial;
    });

    const executeSingle = async (testCase: TestCase) => {
      if (cancelledRef.current) return;

      const controller = new AbortController();
      abortControllersRef.current.push(controller);

      // Mark as running when starting
      setResults((prev) => {
        const next = new Map(prev);
        next.set(testCase.id, {
          id: `result-${testCase.id}`,
          testCaseId: testCase.id,
          status: 'running',
          startedAt: Date.now(),
        });
        return next;
      });

      return new Promise<void>((resolve, reject) => {
        // Start the SSE stream
        fetch('/api/execute-test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ testCase, websiteUrl }),
          signal: controller.signal,
        })
        .then(async (response) => {
          if (!response.ok) {
            const errBody = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
            throw new Error(errBody.error || `HTTP error ${response.status}`);
          }

          if (!response.body) {
            throw new Error('Response body is null');
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              if (cancelledRef.current) {
                reader.cancel();
                resolve();
                return;
              }

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() ?? '';

              for (const line of lines) {
                if (!line.startsWith('data: ')) continue;

                try {
                  const eventData = JSON.parse(line.slice(6));
                  
                  switch (eventData.type) {
                    case 'test_start':
                      // Already marked as running above
                      break;

                    case 'streaming_url':
                      // Update with streaming URL
                      setResults((prev) => {
                        const next = new Map(prev);
                        const existing = next.get(testCase.id);
                        if (existing) {
                          next.set(testCase.id, {
                            ...existing,
                            streamingUrl: eventData.data.streamingUrl,
                          });
                        }
                        return next;
                      });
                      break;

                    case 'step_progress':
                      // Update with step progress
                      setResults((prev) => {
                        const next = new Map(prev);
                        const existing = next.get(testCase.id);
                        if (existing) {
                          next.set(testCase.id, {
                            ...existing,
                            currentStepDescription: eventData.data.stepDescription,
                            currentStep: eventData.data.currentStep,
                          });
                        }
                        return next;
                      });
                      break;

                    case 'test_complete':
                      // Final result
                      const finalResult = eventData.data.result;
                      setResults((prev) => {
                        const next = new Map(prev);
                        next.set(testCase.id, finalResult);
                        return next;
                      });
                      resultsRef.current.set(testCase.id, finalResult);
                      resolve();
                      return;

                    case 'test_error':
                      // Error result
                      const errorResult = eventData.data.result;
                      setResults((prev) => {
                        const next = new Map(prev);
                        next.set(testCase.id, errorResult);
                        return next;
                      });
                      resultsRef.current.set(testCase.id, errorResult);
                      resolve();
                      return;
                  }
                } catch (parseError) {
                  console.error('Failed to parse SSE event:', parseError);
                }
              }
            }

            // Stream ended without completion
            resolve();
          } catch (streamError) {
            reject(streamError);
          }
        })
        .catch((fetchError) => {
          if (fetchError instanceof Error && fetchError.name === 'AbortError') {
            resolve();
            return;
          }

          const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown error';
          const errorResult: TestResult = {
            id: `result-${testCase.id}`,
            testCaseId: testCase.id,
            status: 'error',
            startedAt: Date.now(),
            completedAt: Date.now(),
            error: errorMessage,
          };
          
          setResults((prev) => {
            const next = new Map(prev);
            next.set(testCase.id, errorResult);
            return next;
          });
          resultsRef.current.set(testCase.id, errorResult);
          reject(fetchError);
        });
      });
    };

    try {
      // Execute with controlled parallelism
      const queue = [...testCases];
      const executing = new Set<Promise<void>>();

      while (queue.length > 0 || executing.size > 0) {
        if (cancelledRef.current) break;

        while (queue.length > 0 && executing.size < parallelLimit) {
          const tc = queue.shift()!;
          const p = executeSingle(tc)
            .catch((err) => {
              console.error(`Test execution error for ${tc.id}:`, err);
            })
            .finally(() => { executing.delete(p); });
          executing.add(p);
        }

        if (executing.size > 0) {
          await Promise.race(executing);
        }
      }

      if (!cancelledRef.current) {
        onComplete?.(resultsRef.current);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setIsExecuting(false);
      abortControllersRef.current = [];
      eventSourcesRef.current = [];
    }
  }, [isExecuting, onComplete]);

  const cancelExecution = useCallback(() => {
    cancelledRef.current = true;
    
    // Abort all fetch requests
    for (const controller of abortControllersRef.current) {
      controller.abort();
    }

    // Close any event sources
    for (const eventSource of eventSourcesRef.current) {
      eventSource.close();
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
