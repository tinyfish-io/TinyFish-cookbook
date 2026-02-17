"use client";

import { useState, useCallback, useRef } from "react";
import type {
  GenerationPhase,
  IdentifiedSource,
  ScrapeProgress,
  SourceType,
  Settings,
} from "@/types";
import { DEFAULT_SETTINGS } from "@/types";
import { generateId, countWords } from "@/lib/utils";
import { saveSkill, addToHistory } from "@/lib/storage";

interface GenerationState {
  phase: GenerationPhase;
  topic: string;
  enabledSources: SourceType[];
  identifiedSources: IdentifiedSource[];
  scrapeProgress: Map<string, ScrapeProgress>;
  skillMd: string;
  error: string | null;
  startTime: number | null;
}

const initialState: GenerationState = {
  phase: "idle",
  topic: "",
  enabledSources: ["docs", "github", "stackoverflow", "blog"],
  identifiedSources: [],
  scrapeProgress: new Map(),
  skillMd: "",
  error: null,
  startTime: null,
};

export function useGeneration(settings: Settings = DEFAULT_SETTINGS) {
  const [state, setState] = useState<GenerationState>(initialState);
  const abortControllerRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setState({
      ...initialState,
      enabledSources: settings.defaultSources,
    });
  }, [settings.defaultSources]);

  const setTopic = useCallback((topic: string) => {
    setState((prev) => ({ ...prev, topic }));
  }, []);

  const toggleSource = useCallback((source: SourceType) => {
    setState((prev) => {
      const enabled = prev.enabledSources.includes(source);
      return {
        ...prev,
        enabledSources: enabled
          ? prev.enabledSources.filter((s) => s !== source)
          : [...prev.enabledSources, source],
      };
    });
  }, []);

  const generate = useCallback(async () => {
    if (!state.topic.trim()) {
      setState((prev) => ({ ...prev, error: "Please enter a topic" }));
      return;
    }

    if (state.enabledSources.length === 0) {
      setState((prev) => ({
        ...prev,
        error: "Please enable at least one source type",
      }));
      return;
    }

    // Reset and start
    abortControllerRef.current = new AbortController();
    const startTime = Date.now();

    setState((prev) => ({
      ...prev,
      phase: "identifying",
      error: null,
      identifiedSources: [],
      scrapeProgress: new Map(),
      skillMd: "",
      startTime,
    }));

    try {
      // Phase 1: Identify sources
      const identifyResponse = await fetch("/api/identify-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: state.topic,
          enabledSources: state.enabledSources,
          maxPerType: settings.maxSourcesPerType,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!identifyResponse.ok) {
        const error = await identifyResponse.json();
        throw new Error(error.error || "Failed to identify sources");
      }

      const { sources: identifiedSources } = await identifyResponse.json();

      if (!identifiedSources || identifiedSources.length === 0) {
        throw new Error("No sources found for this topic");
      }

      // Initialize scrape progress
      const scrapeProgress = new Map<string, ScrapeProgress>();
      for (const source of identifiedSources) {
        scrapeProgress.set(source.url, {
          source,
          status: "pending",
          steps: [],
        });
      }

      setState((prev) => ({
        ...prev,
        phase: "scraping",
        identifiedSources,
        scrapeProgress,
      }));

      // Phase 2: Scrape sources
      const scrapeResponse = await fetch("/api/scrape-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sources: identifiedSources,
          topic: state.topic,
          settings: {
            browserProfile: settings.browserProfile,
            enableProxy: settings.enableProxy,
            proxyCountry: settings.proxyCountry,
          },
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!scrapeResponse.ok) {
        throw new Error("Failed to start scraping");
      }

      // Process SSE stream
      const reader = scrapeResponse.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let finalResults: ScrapeProgress[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          try {
            const event = JSON.parse(line.slice(6));

            if (event.type === "source_start") {
              setState((prev) => {
                const newProgress = new Map(prev.scrapeProgress);
                const existing = newProgress.get(event.sourceUrl);
                if (existing) {
                  newProgress.set(event.sourceUrl, {
                    ...existing,
                    status: "scraping",
                  });
                }
                return { ...prev, scrapeProgress: newProgress };
              });
            } else if (event.type === "source_step") {
              setState((prev) => {
                const newProgress = new Map(prev.scrapeProgress);
                const existing = newProgress.get(event.sourceUrl);
                if (existing) {
                  newProgress.set(event.sourceUrl, {
                    ...existing,
                    steps: [...existing.steps, event.detail],
                  });
                }
                return { ...prev, scrapeProgress: newProgress };
              });
            } else if (event.type === "source_streaming") {
              setState((prev) => {
                const newProgress = new Map(prev.scrapeProgress);
                const existing = newProgress.get(event.sourceUrl);
                if (existing) {
                  newProgress.set(event.sourceUrl, {
                    ...existing,
                    streamingUrl: event.streamingUrl,
                  });
                }
                return { ...prev, scrapeProgress: newProgress };
              });
            } else if (event.type === "source_complete") {
              setState((prev) => {
                const newProgress = new Map(prev.scrapeProgress);
                const existing = newProgress.get(event.sourceUrl);
                if (existing) {
                  newProgress.set(event.sourceUrl, {
                    ...existing,
                    status: "complete",
                    content: event.content,
                    wordCount: event.wordCount,
                  });
                }
                return { ...prev, scrapeProgress: newProgress };
              });
            } else if (event.type === "source_error") {
              setState((prev) => {
                const newProgress = new Map(prev.scrapeProgress);
                const existing = newProgress.get(event.sourceUrl);
                if (existing) {
                  newProgress.set(event.sourceUrl, {
                    ...existing,
                    status: "error",
                    error: event.error,
                  });
                }
                return { ...prev, scrapeProgress: newProgress };
              });
            } else if (event.type === "scrape_complete") {
              finalResults = event.results;
            } else if (event.type === "error") {
              throw new Error(event.error);
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }

      // Check if we have any successful scrapes
      const successfulScrapes = finalResults.filter(
        (r) => r.status === "complete" && r.content
      );

      if (successfulScrapes.length === 0) {
        throw new Error("Failed to scrape any sources");
      }

      // Phase 3: Synthesize
      setState((prev) => ({ ...prev, phase: "synthesizing" }));

      const synthesizeResponse = await fetch("/api/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: state.topic,
          scrapedContent: successfulScrapes.map((r) => ({
            source: r.source,
            content: r.content,
          })),
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!synthesizeResponse.ok) {
        const error = await synthesizeResponse.json();
        throw new Error(error.error || "Failed to synthesize skill");
      }

      // Stream the synthesis output
      const synthesizeReader = synthesizeResponse.body?.getReader();
      if (!synthesizeReader) throw new Error("No synthesis response body");

      let skillMd = "";
      while (true) {
        const { done, value } = await synthesizeReader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        skillMd += chunk;

        setState((prev) => ({ ...prev, skillMd }));
      }

      // Complete!
      const duration = Date.now() - startTime;

      setState((prev) => ({
        ...prev,
        phase: "complete",
        skillMd,
      }));

      // Auto-save if enabled
      if (settings.autoSave && skillMd.trim()) {
        const skill = {
          id: generateId(),
          topic: state.topic,
          skillMd,
          sources: identifiedSources,
          generatedAt: new Date().toISOString(),
          duration,
        };
        saveSkill(skill);
      }

      // Add to history
      addToHistory({
        id: generateId(),
        topic: state.topic,
        timestamp: new Date().toISOString(),
        success: true,
        sourceCount: successfulScrapes.length,
        duration,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        // User cancelled, just reset
        reset();
        return;
      }

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setState((prev) => ({
        ...prev,
        phase: "error",
        error: errorMessage,
      }));

      // Add failed attempt to history
      addToHistory({
        id: generateId(),
        topic: state.topic,
        timestamp: new Date().toISOString(),
        success: false,
        sourceCount: 0,
        duration: Date.now() - (state.startTime || Date.now()),
      });
    }
  }, [state.topic, state.enabledSources, state.startTime, settings, reset]);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    reset();
  }, [reset]);

  return {
    // State
    phase: state.phase,
    topic: state.topic,
    enabledSources: state.enabledSources,
    identifiedSources: state.identifiedSources,
    scrapeProgress: state.scrapeProgress,
    skillMd: state.skillMd,
    error: state.error,

    // Computed
    isGenerating:
      state.phase !== "idle" &&
      state.phase !== "complete" &&
      state.phase !== "error",
    scrapeProgressArray: Array.from(state.scrapeProgress.values()),
    totalWords: countWords(state.skillMd),

    // Actions
    setTopic,
    toggleSource,
    generate,
    cancel,
    reset,
  };
}
