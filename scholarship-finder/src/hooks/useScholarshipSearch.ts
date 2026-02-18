import { useState, useCallback } from "react";
import { Scholarship, SearchParams, SearchResponse } from "@/types/scholarship";
import { useToast } from "@/hooks/use-toast";

interface ScholarshipUrl {
  name: string;
  url: string;
  description: string;
}

interface AgentStatus {
  agentId: string;
  siteName: string;
  siteUrl?: string;
  description?: string;
  status: "pending" | "running" | "complete" | "error";
  message?: string;
  streamingUrl?: string;
  scholarships?: Scholarship[];
  error?: string;
}

interface SearchState {
  step: number;
  stepMessage: string;
  urls: ScholarshipUrl[];
  agents: Record<string, AgentStatus>;
  completedScholarships: Scholarship[];
}

export function useScholarshipSearch() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null);
  const [searchState, setSearchState] = useState<SearchState>({
    step: 0,
    stepMessage: "",
    urls: [],
    agents: {},
    completedScholarships: [],
  });
  const { toast } = useToast();

  const search = useCallback(async (params: SearchParams) => {
    setIsLoading(true);
    setSearchParams(params);
    setResults(null);
    setSearchState({
      step: 0,
      stepMessage: "Initializing search...",
      urls: [],
      agents: {},
      completedScholarships: [],
    });

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search-scholarships`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify(params),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Search failed");
      }

      if (!response.body) {
        throw new Error("No response body");
      }

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
          if (line.startsWith("data: ")) {
            const jsonStr = line.slice(6).trim();
            if (!jsonStr || jsonStr === "[DONE]") continue;

            try {
              const data = JSON.parse(jsonStr);

              // Handle step updates
              if (data.type === "STEP") {
                setSearchState(prev => ({
                  ...prev,
                  step: data.step,
                  stepMessage: data.message,
                }));
              }

              // Handle URLs found
              if (data.type === "URLS_FOUND") {
                setSearchState(prev => ({
                  ...prev,
                  urls: data.urls,
                  stepMessage: data.message,
                }));
              }

              // Handle agent started
              if (data.type === "AGENT_STARTED") {
                setSearchState(prev => ({
                  ...prev,
                  agents: {
                    ...prev.agents,
                    [data.agentId]: {
                      agentId: data.agentId,
                      siteName: data.siteName,
                      siteUrl: data.siteUrl,
                      description: data.description,
                      status: "pending",
                      message: "Starting...",
                    },
                  },
                }));
              }

              // Handle agent streaming URL
              if (data.type === "AGENT_STREAMING") {
                setSearchState(prev => ({
                  ...prev,
                  agents: {
                    ...prev.agents,
                    [data.agentId]: {
                      ...prev.agents[data.agentId],
                      status: "running",
                      streamingUrl: data.streamingUrl,
                      message: "Browsing...",
                    },
                  },
                }));
              }

              // Handle agent progress
              if (data.type === "AGENT_PROGRESS") {
                setSearchState(prev => ({
                  ...prev,
                  agents: {
                    ...prev.agents,
                    [data.agentId]: {
                      ...prev.agents[data.agentId],
                      message: data.message,
                    },
                  },
                }));
              }

              // Handle agent complete
              if (data.type === "AGENT_COMPLETE") {
                setSearchState(prev => ({
                  ...prev,
                  agents: {
                    ...prev.agents,
                    [data.agentId]: {
                      ...prev.agents[data.agentId],
                      status: "complete",
                      scholarships: data.scholarships,
                      message: `Found ${data.scholarships?.length || 0} scholarships`,
                    },
                  },
                  completedScholarships: [
                    ...prev.completedScholarships,
                    ...(data.scholarships || []),
                  ],
                }));
              }

              // Handle agent error
              if (data.type === "AGENT_ERROR") {
                setSearchState(prev => ({
                  ...prev,
                  agents: {
                    ...prev.agents,
                    [data.agentId]: {
                      ...prev.agents[data.agentId],
                      status: "error",
                      error: data.error,
                      message: "Failed",
                    },
                  },
                }));
              }

              // Handle all complete
              if (data.type === "ALL_COMPLETE") {
                setResults({
                  scholarships: data.scholarships || [],
                  searchSummary: data.searchSummary || "",
                });
                setIsLoading(false);
                return;
              }

              // Handle error
              if (data.type === "ERROR") {
                throw new Error(data.error);
              }
            } catch (parseError) {
              console.log("Parse error:", parseError);
            }
          }
        }
      }
    } catch (error) {
      console.error("Search error:", error);
      toast({
        title: "Search Failed",
        description: error instanceof Error ? error.message : "Unable to find scholarships.",
        variant: "destructive",
      });
      setResults({
        scholarships: [],
        searchSummary: "An error occurred while searching.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const reset = useCallback(() => {
    setResults(null);
    setSearchParams(null);
    setSearchState({
      step: 0,
      stepMessage: "",
      urls: [],
      agents: {},
      completedScholarships: [],
    });
  }, []);

  return {
    isLoading,
    results,
    searchParams,
    searchState,
    search,
    reset,
  };
}
