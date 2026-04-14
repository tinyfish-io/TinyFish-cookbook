import { useState, useCallback } from "react";
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
  const [error, setError] = useState<string | null>(null);

  const updateAgent = useCallback((id: string, updates: Partial<SiteAgent>) => {
    setAgents((prev) =>
      prev.map((agent) => (agent.id === id ? { ...agent, ...updates } : agent))
    );
  }, []);

  const searchSite = useCallback(
    async (agent: SiteAgent, title: string) => {
      updateAgent(agent.id, {
        status: "searching",
        statusMessage: "Connecting to agent...",
      });

      try {
        const response = await fetch(
          `/api/search-manga`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ url: agent.siteUrl, mangaTitle: title }),
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }

        const contentType = response.headers.get("content-type");

        if (contentType?.includes("text/event-stream")) {
          const reader = response.body?.getReader();
          if (!reader) throw new Error("No response body");

          const decoder = new TextDecoder();

          let buffer = ""; 
          let receivedTerminalEvent = false; 

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;

              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === "stream" && data.streamingUrl) {
                  updateAgent(agent.id, {
                    streamingUrl: data.streamingUrl,
                    statusMessage: "Agent browsing...",
                  });
                }

                if (data.type === "complete") {
                  receivedTerminalEvent = true; 
                  updateAgent(agent.id, {
                    status: data.found ? "found" : "not_found",
                    statusMessage: data.found
                      ? "Manga found on this site!"
                      : "Not available on this site",
                    streamingUrl: undefined,
                  });
                }

                if (data.type === "error") {
                  receivedTerminalEvent = true; 
                  updateAgent(agent.id, {
                    status: "error",
                    statusMessage: data.error || "Search failed",
                    streamingUrl: undefined,
                  });
                }
              } catch {
                // Ignore parse errors (partial JSON handled by buffering)
              }
            }
          }

          if (!receivedTerminalEvent) {
            updateAgent(agent.id, {
              status: "error",
              statusMessage: "Stream ended without completion signal",
              streamingUrl: undefined,
            });
          }
        } else {
          const data = await response.json();

          if (data?.found !== undefined) {
            updateAgent(agent.id, {
              status: data.found ? "found" : "not_found",
              statusMessage: data.found
                ? "Manga found on this site!"
                : "Not available on this site",
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
          statusMessage:
            error instanceof Error ? error.message : "Search failed",
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
      setError(null);

      try {
        const discoveryRes = await fetch(`/api/discover-manga-sites`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ mangaTitle: title }),
        });

        if (!discoveryRes.ok) {
          const errorText = await discoveryRes.text().catch(() => "");
          throw new Error(`discover-manga-sites failed: ${discoveryRes.status} ${errorText}`);
        }

        const urlsData = await discoveryRes.json();
        const sites: Array<{ name: string; url: string }> = urlsData?.sites || [];

        if (sites.length === 0) {
          setIsSearching(false);
          return;
        }

        const initialAgents: SiteAgent[] = sites.map((site, index) => ({
          id: `agent-${index}`,
          siteName: site.name,
          siteUrl: site.url,
          status: "idle" as AgentStatus,
        }));

        setAgents(initialAgents);

        await Promise.all(
          initialAgents.map((agent) => searchSite(agent, title))
        );
      } catch (error) {
        console.error("Search error:", error);
        setError(error instanceof Error ? error.message : "Search failed");
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
    error,
    search,
  };
}
