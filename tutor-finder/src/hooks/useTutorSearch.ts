"use client";

import { useState, useCallback } from "react";
import type { ExamType, Tutor, AgentStatus, SearchState } from "@/types/tutor";

const genId = () => Math.random().toString(36).substring(2, 15);

export function useTutorSearch() {
  const [state, setState] = useState<SearchState>({
    exam: null,
    location: "",
    isSearching: false,
    isDiscovering: false,
    agents: [],
    tutors: [],
    selectedTutorIds: new Set(),
  });

  const setExam = (exam: ExamType | null) => setState((prev) => ({ ...prev, exam }));

  const toggleTutorSelection = (tutorId: string) => {
    setState((prev) => {
      const next = new Set(prev.selectedTutorIds);
      next.has(tutorId) ? next.delete(tutorId) : next.add(tutorId);
      return { ...prev, selectedTutorIds: next };
    });
  };

  const resetSearch = () =>
    setState({ exam: null, location: "", isSearching: false, isDiscovering: false, agents: [], tutors: [], selectedTutorIds: new Set() });

  const startSearch = useCallback(async (exam: ExamType, location: string) => {
    setState((prev) => ({ ...prev, location, isSearching: true, isDiscovering: true, agents: [], tutors: [], selectedTutorIds: new Set() }));

    try {
      // Step 1 — Groq discovers websites
      const discoverRes = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exam, location }),
      });
      const { websites } = await discoverRes.json();

      if (!websites?.length) {
        setState((prev) => ({ ...prev, isSearching: false, isDiscovering: false }));
        return;
      }

      // Initialize agents
      const initialAgents: AgentStatus[] = websites.map(
        (site: { name: string; url: string }, index: number) => ({
          id: `agent-${index}`,
          websiteName: site.name,
          websiteUrl: site.url,
          streamingUrl: null,
          status: "searching" as const,
          message: "Starting search...",
          tutors: [],
        })
      );

      setState((prev) => ({ ...prev, isDiscovering: false, agents: initialAgents }));

      // Step 2 — parallel TinyFish agents
      const agentPromises = websites.map(
        async (site: { name: string; url: string }, index: number) => {
          const agentId = `agent-${index}`;
          try {
            const response = await fetch("/api/scrape", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ websiteUrl: site.url, websiteName: site.name, exam, agentId }),
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const reader = response.body?.getReader();
            if (!reader) throw new Error("No reader");

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
                if (jsonStr === "[DONE]") continue;
                try {
                  const data = JSON.parse(jsonStr);

                  if (data.type === "STREAMING_URL" && data.streamingUrl) {
                    setState((prev) => ({
                      ...prev,
                      agents: prev.agents.map((a) =>
                        a.id === agentId ? { ...a, streamingUrl: data.streamingUrl, message: "Browsing..." } : a
                      ),
                    }));
                  }

                  if (data.type === "PROGRESS" && data.message) {
                    setState((prev) => ({
                      ...prev,
                      agents: prev.agents.map((a) =>
                        a.id === agentId ? { ...a, message: data.message } : a
                      ),
                    }));
                  }

                  if (data.type === "COMPLETE" && data.resultJson?.tutors) {
                    const newTutors: Tutor[] = data.resultJson.tutors
                      .filter((t: Record<string, unknown>) => t.tutorName && t.tutorName !== "Unknown")
                      .map((t: Record<string, unknown>, i: number) => ({
                        id: `${agentId}-tutor-${i}-${genId()}`,
                        tutorName: t.tutorName as string || "Unknown",
                        examsTaught: (t.examsTaught as string[]) || [],
                        subjects: (t.subjects as string[]) || [],
                        teachingMode: (t.teachingMode as string) || null,
                        location: (t.location as string) || null,
                        experience: (t.experience as string) || null,
                        qualifications: (t.qualifications as string) || null,
                        pricing: (t.pricing as string) || null,
                        pastResults: (t.pastResults as string) || null,
                        contactMethod: (t.contactMethod as string) || null,
                        profileLink: (t.profileLink as string) || null,
                        sourceWebsite: (t.sourceWebsite as string) || site.name,
                      }));

                    setState((prev) => ({
                      ...prev,
                      tutors: [...prev.tutors, ...newTutors],
                      agents: prev.agents.map((a) =>
                        a.id === agentId ? { ...a, tutors: newTutors, status: "complete", message: `Found ${newTutors.length} tutors` } : a
                      ),
                    }));
                  }

                  if (data.type === "ERROR") {
                    setState((prev) => ({
                      ...prev,
                      agents: prev.agents.map((a) =>
                        a.id === agentId ? { ...a, status: "error", message: "Search failed" } : a
                      ),
                    }));
                  }
                } catch { /* ignore parse errors */ }
              }
            }
          } catch (error) {
            setState((prev) => ({
              ...prev,
              agents: prev.agents.map((a) =>
                a.id === agentId ? { ...a, status: "error", message: "Search failed" } : a
              ),
            }));
          }
        }
      );

      await Promise.allSettled(agentPromises);
      setState((prev) => ({ ...prev, isSearching: false }));
    } catch {
      setState((prev) => ({ ...prev, isSearching: false, isDiscovering: false }));
    }
  }, []);

  return { state, setExam, startSearch, toggleTutorSelection, resetSearch };
}
