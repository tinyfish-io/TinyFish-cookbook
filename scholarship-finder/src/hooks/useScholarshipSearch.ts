"use client";

import { useState, useCallback } from "react";
import type { Scholarship, SearchParams, SearchResponse, SearchState } from "@/types/scholarship";

const emptyState = (): SearchState => ({
  step: 0,
  stepMessage: "",
  urls: [],
  agents: {},
  completedScholarships: [],
});

export function useScholarshipSearch() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null);
  const [searchState, setSearchState] = useState<SearchState>(emptyState());

  const search = useCallback(async (params: SearchParams) => {
    setIsLoading(true);
    setSearchParams(params);
    setResults(null);
    setSearchState({ ...emptyState(), stepMessage: "Initializing search..." });

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      if (!response.ok) throw new Error("Search failed");
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr || jsonStr === "[DONE]") continue;

          try {
            const data = JSON.parse(jsonStr);

            if (data.type === "STEP") {
              setSearchState((prev) => ({ ...prev, step: data.step, stepMessage: data.message }));
            }
            if (data.type === "URLS_FOUND") {
              setSearchState((prev) => ({ ...prev, urls: data.urls, stepMessage: data.message }));
            }
            if (data.type === "AGENT_STARTED") {
              setSearchState((prev) => ({
                ...prev,
                agents: {
                  ...prev.agents,
                  [data.agentId]: { agentId: data.agentId, siteName: data.siteName, siteUrl: data.siteUrl, description: data.description, status: "pending", message: "Starting..." },
                },
              }));
            }
            if (data.type === "AGENT_STREAMING") {
              setSearchState((prev) => ({
                ...prev,
                agents: { ...prev.agents, [data.agentId]: { ...prev.agents[data.agentId], status: "running", streamingUrl: data.streamingUrl, message: "Browsing..." } },
              }));
            }
            if (data.type === "AGENT_PROGRESS") {
              setSearchState((prev) => ({
                ...prev,
                agents: { ...prev.agents, [data.agentId]: { ...prev.agents[data.agentId], message: data.message } },
              }));
            }
            if (data.type === "AGENT_COMPLETE") {
              setSearchState((prev) => ({
                ...prev,
                agents: { ...prev.agents, [data.agentId]: { ...prev.agents[data.agentId], status: "complete", scholarships: data.scholarships, message: `Found ${data.scholarships?.length || 0} scholarships` } },
                completedScholarships: [...prev.completedScholarships, ...(data.scholarships || [])],
              }));
            }
            if (data.type === "AGENT_ERROR") {
              setSearchState((prev) => ({
                ...prev,
                agents: { ...prev.agents, [data.agentId]: { ...prev.agents[data.agentId], status: "error", error: data.error, message: "Failed" } },
              }));
            }
            if (data.type === "ALL_COMPLETE") {
              setResults({ scholarships: data.scholarships || [], searchSummary: data.searchSummary || "" });
              setIsLoading(false);
              return;
            }
            if (data.type === "ERROR") throw new Error(data.error);
          } catch { /* ignore parse errors */ }
        }
      }
    } catch (error) {
      console.error("Search error:", error);
      setResults({ scholarships: [], searchSummary: "An error occurred while searching." });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResults(null);
    setSearchParams(null);
    setSearchState(emptyState());
  }, []);

  return { isLoading, results, searchParams, searchState, search, reset };
}
