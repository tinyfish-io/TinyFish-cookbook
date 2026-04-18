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
      .filter((s) => s.programName && s.programName !== "Not specified");
  };

  const search = useCallback(async (searchData: SearchFormData) => {
    setIsSearching(true);
    setError(null);
    setResults([]);
    setAgents([]);

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(searchData),
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

            if (data.type === "URLS" && Array.isArray(data.urls)) {
              // Initialise agent cards as soon as we know the URLs
              const newAgents: AgentStatus[] = data.urls.map(
                (url: string, idx: number) => ({
                  id: `agent-${idx}`,
                  url,
                  status: "pending" as const,
                  message: "Waiting to start...",
                })
              );
              setAgents(newAgents);
            }

            if (data.type === "AGENT_STARTED") {
              setAgents((prev) =>
                prev.map((a) =>
                  a.id === data.agentId
                    ? { ...a, status: "running", message: "Starting browser agent..." }
                    : a
                )
              );
            }

            if (data.type === "STREAMING_URL" && data.streaming_url) {
              setAgents((prev) =>
                prev.map((a) =>
                  a.id === data.agentId
                    ? { ...a, streamingUrl: data.streaming_url, message: "Browser connected..." }
                    : a
                )
              );
            }

            if (data.type === "PROGRESS" && data.purpose) {
              setAgents((prev) =>
                prev.map((a) =>
                  a.id === data.agentId ? { ...a, message: data.purpose } : a
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
                      a.id === data.agentId
                        ? {
                            ...a,
                            status: "completed",
                            message: `Found ${schools.length} program${schools.length > 1 ? "s" : ""}`,
                            result: schools[0],
                          }
                        : a
                    )
                  );
                } else {
                  setAgents((prev) =>
                    prev.map((a) =>
                      a.id === data.agentId
                        ? { ...a, status: "completed", message: "No programs found" }
                        : a
                    )
                  );
                }
              } else {
                setAgents((prev) =>
                  prev.map((a) =>
                    a.id === data.agentId
                      ? {
                          ...a,
                          status: "error",
                          message: data.error?.message || "Automation failed",
                          error: data.error?.message || "Automation failed",
                        }
                      : a
                  )
                );
              }
            }

            if (data.type === "ERROR") {
              setError(data.message || "Search failed");
            }
          } catch {
            // Ignore parse errors for incomplete chunks
          }
        }
      }
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
