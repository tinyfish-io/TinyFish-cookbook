"use client";

import { useState, useCallback, useRef } from "react";
import { Sector, Tender, AgentState, TenderSearchState } from "@/types/tender";

const generateId = () =>
  Math.random().toString(36).substring(2, 15) +
  Math.random().toString(36).substring(2, 15);

const currentDate = () =>
  new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

export function useTenderSearch() {
  const [state, setState] = useState<TenderSearchState>({
    isSearching: false,
    selectedSector: null,
    agents: [],
    tenders: [],
    selectedTenders: new Set(),
  });

  const abortControllersRef = useRef<AbortController[]>([]);

  const createAgentsFromLinks = (links: string[]): AgentState[] =>
    links.map((url, index) => {
      let name = "Unknown Site";
      try {
        name = new URL(url).hostname.replace("www.", "");
      } catch {
        name = url.substring(0, 30);
      }
      return {
        id: `agent-${index}`,
        url,
        name,
        status: "pending" as const,
        message: "Waiting to start...",
        tenders: [],
      };
    });

  const startSearch = useCallback(async (sector: Sector, links: string[]) => {
    const initialAgents = createAgentsFromLinks(links);

    setState((prev) => ({
      ...prev,
      isSearching: true,
      selectedSector: sector,
      agents: initialAgents,
      tenders: [],
      selectedTenders: new Set(),
    }));

    abortControllersRef.current.forEach((c) => c.abort());
    abortControllersRef.current = [];

    const goal = `TASK: Extract government tenders in Singapore for the field of ${sector}.

CURRENT DATE: ${currentDate()}
IMPORTANT: Only return tenders with submission deadlines AFTER today's date.

STRICT RULES:
- Read only what is visible on the page. Do NOT scroll or paginate.
- Do NOT click any links unless required to reveal tender details.
- Do NOT navigate away from this page.
- Extract immediately and return. Be fast and efficient.
- Find tenders with upcoming deadlines only.

Return ONLY this JSON with no extra text:
{
  "tenderdetails": [
    {
      "Tender Title": "",
      "Tender ID": "",
      "Issuing Authority": "",
      "Country / Region": "Singapore",
      "Tender Type": "",
      "Publication Date": "",
      "Submission Deadline": "",
      "Tender Status": "Open",
      "Official Tender URL": "",
      "Brief Description": "",
      "Eligibility Criteria": "",
      "Industry / Category": "${sector}"
    }
  ]
}`;

    const agentPromises = links.map(async (url, index) => {
      const agentId = `agent-${index}`;
      const abortController = new AbortController();
      abortControllersRef.current.push(abortController);

      try {
        setState((prev) => ({
          ...prev,
          agents: prev.agents.map((a) =>
            a.id === agentId
              ? { ...a, status: "connecting" as const, message: "Connecting..." }
              : a
          ),
        }));

        const response = await fetch("/api/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, goal, agentId }),
          signal: abortController.signal,
        });

        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

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
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === "STREAMING_URL" && data.streamingUrl) {
                setState((prev) => ({
                  ...prev,
                  agents: prev.agents.map((a) =>
                    a.id === agentId
                      ? { ...a, status: "searching" as const, message: "Browsing website...", streamingUrl: data.streamingUrl }
                      : a
                  ),
                }));
              }

              if (data.type === "STATUS" && data.message) {
                setState((prev) => ({
                  ...prev,
                  agents: prev.agents.map((a) =>
                    a.id === agentId ? { ...a, message: data.message } : a
                  ),
                }));
              }

              if (data.type === "COMPLETE" && data.tenders) {
                const newTenders: Tender[] = (data.tenders as Record<string, string>[])
                  .filter((t) => t["Tender Title"] && t["Tender Title"] !== "Not specified")
                  .map((t) => ({
                    id: generateId(),
                    tenderTitle: t["Tender Title"] || "Unknown",
                    tenderId: t["Tender ID"] || "N/A",
                    issuingAuthority: t["Issuing Authority"] || "Unknown",
                    countryRegion: t["Country / Region"] || "Singapore",
                    tenderType: t["Tender Type"] || "N/A",
                    publicationDate: t["Publication Date"] || "N/A",
                    submissionDeadline: t["Submission Deadline"] || "N/A",
                    tenderStatus: t["Tender Status"] || "Open",
                    officialTenderUrl: t["Official Tender URL"] || url,
                    briefDescription: t["Brief Description"] || "No description",
                    eligibilityCriteria: t["Eligibility Criteria"] || "See tender",
                    industryCategory: t["Industry / Category"] || sector,
                    sourceUrl: url,
                  }));

                setState((prev) => ({
                  ...prev,
                  tenders: [...prev.tenders, ...newTenders],
                  agents: prev.agents.map((a) =>
                    a.id === agentId
                      ? { ...a, status: "complete" as const, message: `Found ${newTenders.length} tenders`, tenders: newTenders }
                      : a
                  ),
                }));
              }

              if (data.type === "ERROR") {
                setState((prev) => ({
                  ...prev,
                  agents: prev.agents.map((a) =>
                    a.id === agentId
                      ? { ...a, status: "error" as const, message: data.error || "Error" }
                      : a
                  ),
                }));
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setState((prev) => ({
          ...prev,
          agents: prev.agents.map((a) =>
            a.id === agentId
              ? { ...a, status: "error" as const, message: error instanceof Error ? error.message : "Unknown error" }
              : a
          ),
        }));
      }
    });

    await Promise.allSettled(agentPromises);
    setState((prev) => ({ ...prev, isSearching: false }));
  }, []);

  const toggleTenderSelection = useCallback((tenderId: string) => {
    setState((prev) => {
      const newSelected = new Set(prev.selectedTenders);
      newSelected.has(tenderId) ? newSelected.delete(tenderId) : newSelected.add(tenderId);
      return { ...prev, selectedTenders: newSelected };
    });
  }, []);

  const clearSelection = useCallback(() => {
    setState((prev) => ({ ...prev, selectedTenders: new Set() }));
  }, []);

  const resetSearch = useCallback(() => {
    abortControllersRef.current.forEach((c) => c.abort());
    abortControllersRef.current = [];
    setState({
      isSearching: false,
      selectedSector: null,
      agents: [],
      tenders: [],
      selectedTenders: new Set(),
    });
  }, []);

  return { ...state, startSearch, toggleTenderSelection, clearSelection, resetSearch };
}
