import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AgentStatus } from "@/components/AgentCard";

export interface SiteAgent {
  id: string;
  siteName: string;
  siteUrl: string;
  status: AgentStatus;
  statusMessage?: string;
  streamingUrl?: string;
}

export function useMangaSearch() {
  const [isSearching, setIsSearching] = useState(false);
  const [agents, setAgents] = useState<SiteAgent[]>([]);
  const [mangaTitle, setMangaTitle] = useState("");

  const updateAgent = useCallback((id: string, updates: Partial<SiteAgent>) => {
    setAgents((prev) =>
      prev.map((agent) => (agent.id === id ? { ...agent, ...updates } : agent))
    );
  }, []);

  const searchSite = useCallback(
    async (agent: SiteAgent, title: string) => {
      updateAgent(agent.id, { status: "searching", statusMessage: "Connecting to agent..." });

      try {
        // Use fetch directly to handle SSE stream
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        
        const response = await fetch(`${supabaseUrl}/functions/v1/search-manga`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseKey}`,
            "apikey": supabaseKey,
          },
          body: JSON.stringify({ url: agent.siteUrl, mangaTitle: title }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }

        const contentType = response.headers.get("content-type");
        
        // Handle SSE stream
        if (contentType?.includes("text/event-stream")) {
          const reader = response.body?.getReader();
          if (!reader) throw new Error("No response body");
          
          const decoder = new TextDecoder();
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split("\n");
            
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                try {
                  const data = JSON.parse(line.slice(6));
                  
                  if (data.type === "stream" && data.streamingUrl) {
                    updateAgent(agent.id, { 
                      streamingUrl: data.streamingUrl,
                      statusMessage: "Agent browsing..." 
                    });
                  }
                  
                  if (data.type === "complete") {
                    updateAgent(agent.id, {
                      status: data.found ? "found" : "not_found",
                      statusMessage: data.found ? "Manga found on this site!" : "Not available on this site",
                      streamingUrl: undefined,
                    });
                  }
                  
                  if (data.type === "error") {
                    updateAgent(agent.id, {
                      status: "error",
                      statusMessage: data.error || "Search failed",
                      streamingUrl: undefined,
                    });
                  }
                } catch {
                  // Ignore parse errors
                }
              }
            }
          }
        } else {
          // Handle JSON response (fallback)
          const data = await response.json();
          
          if (data?.found !== undefined) {
            updateAgent(agent.id, {
              status: data.found ? "found" : "not_found",
              statusMessage: data.found ? "Manga found on this site!" : "Not available on this site",
            });
          } else if (data?.error) {
            updateAgent(agent.id, {
              status: "error",
              statusMessage: data.error,
            });
          }
        }
      } catch (error) {
        console.error(`Error searching ${agent.siteName}:`, error);
        updateAgent(agent.id, {
          status: "error",
          statusMessage: error instanceof Error ? error.message : "Search failed",
          streamingUrl: undefined,
        });
      }
    },
    [updateAgent]
  );

  const search = useCallback(
    async (title: string) => {
      setIsSearching(true);
      setMangaTitle(title);
      setAgents([]);

      try {
        // Step 1: Get manga site URLs from Gemini
        const { data: urlsData, error: urlsError } = await supabase.functions.invoke(
          "discover-manga-sites",
          { body: { mangaTitle: title } }
        );

        if (urlsError) {
          throw new Error(urlsError.message);
        }

        const sites: Array<{ name: string; url: string }> = urlsData?.sites || [];

        if (sites.length === 0) {
          setIsSearching(false);
          return;
        }

        // Initialize agents
        const initialAgents: SiteAgent[] = sites.map((site, index) => ({
          id: `agent-${index}`,
          siteName: site.name,
          siteUrl: site.url,
          status: "idle" as AgentStatus,
        }));

        setAgents(initialAgents);

        // Step 2: Start searching each site in parallel
        await Promise.all(
          initialAgents.map((agent) => searchSite(agent, title))
        );
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsSearching(false);
      }
    },
    [searchSite]
  );

  return {
    isSearching,
    agents,
    mangaTitle,
    search,
  };
}
