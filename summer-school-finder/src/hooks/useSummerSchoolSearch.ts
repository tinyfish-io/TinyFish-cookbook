"use client";

import { useState, useCallback } from "react";
import type { SearchFormData, SummerSchool, AgentStatus } from "@/types/summer-school";

export function useSummerSchoolSearch() {
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [results, setResults] = useState<SummerSchool[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseSchoolResults = (result: unknown): SummerSchool[] => {
    if (!result || typeof result !== "object") return [];
    const r = result as Record<string, unknown>;
    const schools = r.summerSchools as Record<string, string>[] | undefined;
    if (!schools || schools.length === 0) return [];

    return schools
      .map((school) => ({
        programName: school["Program Name"] || "",
        institution: school["Institution"] || "",
        location: school["Location"] || "",
        dates: school["Dates"] || "",
        duration: school["Duration"] || "",
        targetAge: school["Target Age / Grade"] || "",
        programType: school["Program Type / Focus"] || "",
        tuitionFees: school["Tuition / Fees"] || "",
        applicationDeadline: school["Application Deadline"] || "",
        officialUrl: school["Official Program URL"] || "",
        briefDescription: school["Brief Description"] || "",
        eligibilityCriteria: school["Eligibility Criteria"] || "",
        notes: school["Notes / Special Requirements"] || "",
      }))
      // Only keep entries that have an actual program name
      .filter((s) => s.programName && s.programName !== "Not specified");
  };

  const runAgent = async (
    url: string,
    agentId: string,
    searchData: SearchFormData
  ) => {
    const goal = `You are on a summer school program page. Extract up to 2-3 program listings from what is visible on screen.

STRICT RULES — follow exactly:
- Read only what is already visible on the page. Do NOT scroll, paginate, or load more content.
- Do NOT click any links, buttons, or navigation elements unless the specific program details are hidden behind a single clearly-labelled "Details" or "Apply" button on THIS page only.
- Do NOT navigate to any other page. Do NOT follow external links.
- Extract immediately and return. Be fast.
- If a field is not visible on the current page, set it to "Not specified". Do not search for it.
- Target criteria: ${searchData.programType} program, ${searchData.location}, for ${searchData.targetAge || "students"}.
- If the page has multiple programs listed, extract up to 3 of the most relevant ones.
- Only include programs that have at least a Program Name visible. Do not return empty entries.

Return ONLY this JSON with no extra text:
{
  "summerSchools": [
    {
      "Program Name": "",
      "Institution": "",
      "Location": "",
      "Dates": "",
      "Duration": "",
      "Target Age / Grade": "",
      "Program Type / Focus": "",
      "Tuition / Fees": "",
      "Application Deadline": "",
      "Official Program URL": "",
      "Brief Description": "",
      "Eligibility Criteria": "",
      "Notes / Special Requirements": ""
    }
  ]
}`;

    try {
      setAgents((prev) =>
        prev.map((a) =>
          a.id === agentId
            ? { ...a, status: "running", message: "Starting browser agent..." }
            : a
        )
      );

      const response = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, goal }),
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

            if (data.type === "STREAMING_URL" && data.streaming_url) {
              setAgents((prev) =>
                prev.map((a) =>
                  a.id === agentId
                    ? { ...a, streamingUrl: data.streaming_url, message: "Browser connected..." }
                    : a
                )
              );
            }

            if (data.type === "PROGRESS" && data.purpose) {
              setAgents((prev) =>
                prev.map((a) =>
                  a.id === agentId ? { ...a, message: data.purpose } : a
                )
              );
            }

            if (data.type === "COMPLETE") {
              if (data.status === "COMPLETED" && data.result) {
                const schools = parseSchoolResults(data.result);
                if (schools.length > 0) {
                  setResults((prev) => [...prev, ...schools]);
                  setAgents((prev) =>
                    prev.map((a) =>
                      a.id === agentId
                        ? { ...a, status: "completed", message: `Found ${schools.length} program${schools.length > 1 ? "s" : ""}`, result: schools[0] }
                        : a
                    )
                  );
                } else {
                  setAgents((prev) =>
                    prev.map((a) =>
                      a.id === agentId
                        ? { ...a, status: "completed", message: "No programs found" }
                        : a
                    )
                  );
                }
              } else {
                throw new Error(data.error?.message || "Automation failed");
              }
            }
          } catch {
            // Ignore parse errors for incomplete chunks
          }
        }
      }

      setAgents((prev) =>
        prev.map((a) =>
          a.id === agentId && a.status === "running"
            ? { ...a, status: "completed", message: "Search completed" }
            : a
        )
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setAgents((prev) =>
        prev.map((a) =>
          a.id === agentId ? { ...a, status: "error", message: msg, error: msg } : a
        )
      );
    }
  };

  const search = useCallback(async (searchData: SearchFormData) => {
    setIsSearching(true);
    setError(null);
    setResults([]);
    setAgents([]);

    try {
      // Step 1 — discover URLs via TinyFish Search API
      const discoverRes = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(searchData),
      });

      if (!discoverRes.ok) throw new Error("Failed to discover programs");

      const { urls } = await discoverRes.json();

      if (!urls || urls.length === 0) {
        setError("No summer school programs found. Try adjusting your filters.");
        return;
      }

      // Step 2 — create agent statuses
      const newAgents: AgentStatus[] = urls.map(
        (url: string, idx: number) => ({
          id: `agent-${idx}-${Date.now()}`,
          url,
          status: "pending" as const,
          message: "Waiting to start...",
        })
      );

      setAgents(newAgents);

      // Step 3 — run all agents in parallel
      await Promise.all(
        newAgents.map((agent) => runAgent(agent.url, agent.id, searchData))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setIsSearching(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setAgents([]);
    setError(null);
  }, []);

  return { agents, results, isSearching, error, search, clearResults };
}
