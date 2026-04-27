"use client";

import { useState, useCallback, useRef } from "react";
import type { Platform, AgentStatus, PlatformAnalysis, SteamDBAgentStatus, SteamDBPriceHistory } from "@/lib/types";

export function useGameSearch() {
  const [isLoading, setIsLoading] = useState(false);
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [gameName, setGameName] = useState<string>("");
  const [steamDBAgent, setSteamDBAgent] = useState<SteamDBAgentStatus>({ status: "pending" });
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  const updateAgent = useCallback((platformName: string, updates: Partial<AgentStatus>) => {
    setAgents((prev) =>
      prev.map((agent) => (agent.platformName === platformName ? { ...agent, ...updates } : agent))
    );
  }, []);

  const analyzePlatform = useCallback(
    async (platform: Platform, gameTitle: string) => {
      const controller = new AbortController();
      abortControllersRef.current.set(platform.name, controller);
      updateAgent(platform.name, { status: "running", currentAction: "Starting browser agent..." });

      try {
        const response = await fetch("/api/analyze-platform", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platformName: platform.name, url: platform.url, gameTitle }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) throw new Error("Failed to start analysis");

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
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === "STREAMING_URL") {
                updateAgent(platform.name, { streamingUrl: data.streamingUrl });
              } else if (data.type === "STATUS") {
                updateAgent(platform.name, { currentAction: data.message });
              } else if (data.type === "COMPLETE") {
                updateAgent(platform.name, {
                  status: "complete",
                  result: data.result as PlatformAnalysis,
                  currentAction: undefined,
                });
              } else if (data.type === "ERROR") {
                updateAgent(platform.name, {
                  status: "error",
                  error: data.error || "Unknown error",
                  currentAction: undefined,
                });
              }
            } catch {
              // skip malformed chunks
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        updateAgent(platform.name, {
          status: "error",
          error: err instanceof Error ? err.message : "Unknown error",
          currentAction: undefined,
        });
      } finally {
        abortControllersRef.current.delete(platform.name);
      }
    },
    [updateAgent]
  );

  const analyzeSteamDB = useCallback(async (gameTitle: string) => {
    const controller = new AbortController();
    abortControllersRef.current.set("steamdb", controller);
    setSteamDBAgent({ status: "running", currentAction: "Starting SteamDB analysis..." });

    try {
      const response = await fetch("/api/steamdb-price-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameTitle }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) throw new Error("Failed to start SteamDB analysis");

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
          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === "STREAMING_URL") {
              setSteamDBAgent((prev) => ({ ...prev, streamingUrl: data.streamingUrl }));
            } else if (data.type === "STATUS") {
              setSteamDBAgent((prev) => ({ ...prev, currentAction: data.message }));
            } else if (data.type === "COMPLETE") {
              setSteamDBAgent({
                status: "complete",
                result: data.result as SteamDBPriceHistory,
                currentAction: undefined,
              });
            } else if (data.type === "ERROR") {
              setSteamDBAgent({
                status: "error",
                error: data.error || "Unknown error",
                currentAction: undefined,
              });
            }
          } catch {
            // skip malformed chunks
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setSteamDBAgent({
        status: "error",
        error: err instanceof Error ? err.message : "Unknown error",
        currentAction: undefined,
      });
    } finally {
      abortControllersRef.current.delete("steamdb");
    }
  }, []);

  const search = useCallback(
    async (gameTitle: string) => {
      abortControllersRef.current.forEach((c) => c.abort());
      abortControllersRef.current.clear();

      setIsLoading(true);
      setError(null);
      setAgents([]);
      setGameName(gameTitle);
      setSteamDBAgent({ status: "pending" });

      try {
        const discoverResponse = await fetch("/api/discover-platforms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameTitle }),
        });

        if (!discoverResponse.ok) throw new Error("Failed to discover platforms");

        const { platforms } = await discoverResponse.json() as { platforms: Platform[] };
        if (!platforms?.length) throw new Error("No platforms found for this game");

        const initialAgents: AgentStatus[] = platforms.map((platform) => ({
          platformName: platform.name,
          url: platform.url,
          status: "pending",
        }));
        setAgents(initialAgents);

        // Run all platform agents + SteamDB in parallel
        await Promise.allSettled([
          ...platforms.map((platform) => analyzePlatform(platform, gameTitle)),
          analyzeSteamDB(gameTitle),
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    },
    [analyzePlatform, analyzeSteamDB]
  );

  const reset = useCallback(() => {
    abortControllersRef.current.forEach((c) => c.abort());
    abortControllersRef.current.clear();
    setIsLoading(false);
    setAgents([]);
    setError(null);
    setGameName("");
    setSteamDBAgent({ status: "pending" });
  }, []);

  return { search, reset, isLoading, agents, error, gameName, steamDBAgent };
}
