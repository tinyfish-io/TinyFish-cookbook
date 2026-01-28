"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { usePricing } from "@/lib/pricing-context";
import { Card, CardContent } from "@/components/ui/card";
import { Check, X, Globe, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ScrapingStatus, CompetitorPricing } from "@/types";

export default function AnalysisPage() {
  const router = useRouter();
  const { state, setScrapingStatus, setAnalysis, setStep, clearScrapingResults } = usePricing();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState("");
  const [allComplete, setAllComplete] = useState(false);
  const [localResults, setLocalResults] = useState<Record<string, ScrapingStatus>>({});
  const hasStarted = useRef(false);

  // Clear previous results and redirect if no competitors
  useEffect(() => {
    if (!state.baseline || state.competitors.length === 0) {
      router.push("/");
    } else {
      // Clear previous results when entering analysis page
      console.log("[Analysis] Clearing previous scraping results");
      clearScrapingResults();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Calculate progress
  const totalCompetitors = state.competitors.length;
  const results = Object.keys(localResults).length > 0 ? localResults : state.scrapingResults;
  const completedCount = Object.values(results).filter(
    (r) => r.status === "complete" || r.status === "error"
  ).length;
  const successCount = Object.values(results).filter(
    (r) => r.status === "complete"
  ).length;
  const progress = totalCompetitors > 0 ? (completedCount / totalCompetitors) * 100 : 0;
  const canViewDashboard = successCount >= 1;

  // Start scraping when page loads
  const startScraping = useCallback(async () => {
    console.log("[Analysis] startScraping called, hasStarted:", hasStarted.current);
    if (hasStarted.current) {
      console.log("[Analysis] Already started, returning");
      return;
    }
    hasStarted.current = true;
    console.log("[Analysis] Starting scraping for", state.competitors.length, "competitors");

    // Initialize all competitors as pending
    const initialResults: Record<string, ScrapingStatus> = {};
    state.competitors.forEach((comp) => {
      initialResults[comp.id] = {
        status: "pending",
        steps: [],
        startedAt: Date.now(),
      };
    });
    setLocalResults(initialResults);

    try {
      // First, generate URLs if needed
      const competitorsNeedingUrls = state.competitors.filter((c) => !c.url);
      let enrichedCompetitors = [...state.competitors];

      if (competitorsNeedingUrls.length > 0) {
        competitorsNeedingUrls.forEach((comp) => {
          setLocalResults(prev => ({
            ...prev,
            [comp.id]: {
              status: "generating-url",
              steps: ["Generating pricing page URL..."],
              startedAt: Date.now(),
            },
          }));
        });

        const urlResponse = await fetch("/api/generate-urls", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ competitors: state.competitors }),
        });

        if (urlResponse.ok) {
          const { competitors: withUrls } = await urlResponse.json();
          enrichedCompetitors = withUrls;
        }
      }

      // Start scraping
      const scrapingPayload = {
        competitors: enrichedCompetitors.map((c: { id: string; name: string; url?: string; generatedUrl?: string }) => ({
          id: c.id,
          name: c.name,
          url: c.url || c.generatedUrl || `https://${c.name.toLowerCase().replace(/\s+/g, "")}.com/pricing`,
        })),
        detailLevel: state.detailLevel,
      };
      console.log("[Analysis] Calling /api/scrape-pricing with:", scrapingPayload, "Detail level:", state.detailLevel);

      const response = await fetch("/api/scrape-pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scrapingPayload),
      });

      console.log("[Analysis] Response status:", response.status);
      if (!response.ok) {
        throw new Error("Failed to start scraping");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event = JSON.parse(line.slice(6));
              console.log("[Analysis] Received event:", event.type, event.id || event.competitor);

              if (event.type === "competitor_start") {
                setLocalResults(prev => ({
                  ...prev,
                  [event.id]: {
                    status: "scraping",
                    steps: ["Starting extraction..."],
                    streamingUrl: event.streamingUrl,
                    startedAt: Date.now(),
                  },
                }));
              } else if (event.type === "competitor_streaming") {
                // Update with streaming URL
                setLocalResults(prev => ({
                  ...prev,
                  [event.id]: {
                    ...prev[event.id],
                    streamingUrl: event.streamingUrl,
                  },
                }));
              } else if (event.type === "competitor_step") {
                setLocalResults(prev => ({
                  ...prev,
                  [event.id]: {
                    ...prev[event.id],
                    steps: [...(prev[event.id]?.steps || []), event.step],
                  },
                }));
              } else if (event.type === "competitor_complete") {
                setLocalResults(prev => ({
                  ...prev,
                  [event.id]: {
                    ...prev[event.id],
                    status: "complete",
                    data: event.data as CompetitorPricing,
                    completedAt: Date.now(),
                  },
                }));
                // Also save to context
                setScrapingStatus(event.id, {
                  status: "complete",
                  steps: [],
                  data: event.data as CompetitorPricing,
                  completedAt: Date.now(),
                });
              } else if (event.type === "competitor_error") {
                setLocalResults(prev => ({
                  ...prev,
                  [event.id]: {
                    ...prev[event.id],
                    status: "error",
                    error: event.error,
                    completedAt: Date.now(),
                  },
                }));
                setScrapingStatus(event.id, {
                  status: "error",
                  steps: [],
                  error: event.error,
                  completedAt: Date.now(),
                });
              } else if (event.type === "all_complete") {
                setAllComplete(true);
                console.log("[Analysis] All scraping complete, running AI analysis...");
                // Start AI analysis in background - don't block
                runAnalysis(event.data?.results || []);
              }
            } catch (e) {
              console.error("Error parsing event:", e);
            }
          }
        }
      }
    } catch (error) {
      console.error("Scraping error:", error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.competitors, state.detailLevel, setScrapingStatus]);

  const runAnalysis = async (scrapingResults: object[]) => {
    setIsAnalyzing(true);
    setAnalysisStep("Analyzing pricing structures with AI...");

    try {
      const response = await fetch("/api/analyze-pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseline: state.baseline,
          pricingData: scrapingResults,
        }),
      });

      if (response.ok) {
        const { analysis } = await response.json();
        setAnalysis(analysis);
        setStep(4);
        setIsAnalyzing(false);
        setAnalysisStep("Analysis complete!");
      }
    } catch (error) {
      console.error("Analysis error:", error);
      setIsAnalyzing(false);
      setAnalysisStep("Analysis failed - view dashboard for raw data");
    }
  };

  const handleViewDashboard = () => {
    setStep(4);
    router.push("/dashboard");
  };

  useEffect(() => {
    console.log("[Analysis] Effect check - competitors:", state.competitors.length, "scrapingResults:", Object.keys(state.scrapingResults).length, "hasStarted:", hasStarted.current);
    if (state.competitors.length > 0 && Object.keys(state.scrapingResults).length === 0) {
      console.log("[Analysis] Starting scraping...");
      startScraping();
    } else {
      console.log("[Analysis] NOT starting scraping - conditions not met");
    }
  }, [state.competitors, state.scrapingResults, startScraping]);

  return (
    <div className="min-h-screen bg-[#F4F3F2] relative overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Progress Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                  step <= 3 ? "bg-[#D76228]" : "bg-[#165762]/10"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider text-[#165762]/50">
              Step 3 of 4 — Analyzing Competitors
            </p>
            <p className="text-sm text-[#165762]/60">
              {completedCount} of {totalCompetitors} complete
            </p>
          </div>
        </div>

        {/* Overall Progress Bar */}
        <div className="mb-6 sm:mb-8">
          <div className="h-2 bg-[#165762]/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#D76228] rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Scraping Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-12">
          {state.competitors.map((competitor, index) => {
            const status = results[competitor.id];
            const currentStatus = status?.status || "pending";

            return (
              <Card
                key={competitor.id}
                className={`bg-white shadow-sm border-0 overflow-hidden transition-all duration-500 animate-in fade-in slide-in-from-bottom-4 ${
                  currentStatus === "complete"
                    ? "ring-2 ring-[#165762]/20"
                    : currentStatus === "error"
                    ? "ring-2 ring-red-200"
                    : ""
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="p-0">
                  {/* Browser Preview Area */}
                  <div className="aspect-video bg-[#F4F3F2] relative flex items-center justify-center">
                    {status?.streamingUrl ? (
                      <iframe
                        src={status.streamingUrl}
                        className="w-full h-full border-0"
                        sandbox="allow-same-origin allow-scripts"
                        title={`${competitor.name} preview`}
                      />
                    ) : (
                      <div className="text-center">
                        {currentStatus === "pending" && (
                          <div className="w-10 h-10 rounded-xl bg-[#165762]/5 flex items-center justify-center mx-auto mb-2">
                            <Globe className="w-5 h-5 text-[#165762]/30" />
                          </div>
                        )}
                        {(currentStatus === "generating-url" ||
                          currentStatus === "scraping") && (
                          <div className="relative">
                            <div className="w-12 h-12 rounded-full border-2 border-[#D76228]/20 border-t-[#D76228] animate-spin" />
                          </div>
                        )}
                        {currentStatus === "complete" && (
                          <div className="w-12 h-12 rounded-full bg-[#165762] flex items-center justify-center mx-auto">
                            <Check className="w-6 h-6 text-white" />
                          </div>
                        )}
                        {currentStatus === "error" && (
                          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                            <X className="w-6 h-6 text-red-500" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Info Section */}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      {/* Favicon placeholder */}
                      <div className="w-5 h-5 rounded bg-[#F4F3F2] flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-medium text-[#165762]/40">
                          {competitor.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <h3 className="font-medium text-sm text-[#1a1a1a] truncate">
                        {competitor.name}
                      </h3>
                    </div>

                    {/* Status Text */}
                    <div className="min-h-[20px]">
                      {currentStatus === "pending" && (
                        <p className="text-xs text-[#165762]/40">Waiting...</p>
                      )}
                      {currentStatus === "generating-url" && (
                        <p className="text-xs text-[#D76228]">
                          Finding pricing page...
                        </p>
                      )}
                      {currentStatus === "scraping" && (
                        <p className="text-xs text-[#D76228] truncate">
                          {status?.steps?.[status.steps.length - 1] ||
                            "Extracting..."}
                        </p>
                      )}
                      {currentStatus === "complete" && (
                        <p className="text-xs text-[#165762]">Complete</p>
                      )}
                      {currentStatus === "error" && (
                        <p className="text-xs text-red-500 truncate">
                          {status?.error || "Failed"}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* View Dashboard Button - show when at least 1 competitor is done */}
        {canViewDashboard && (
          <div className="flex flex-col items-center justify-center py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {isAnalyzing ? (
              <div className="flex flex-col items-center mb-6">
                <div className="relative mb-4">
                  <div className="w-12 h-12 rounded-xl bg-[#D76228] flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-white animate-pulse" />
                  </div>
                </div>
                <p className="text-sm text-[#165762]/60 text-center px-4">{analysisStep}</p>
              </div>
            ) : (
              <p className="text-sm text-[#165762]/60 mb-4">
                {allComplete
                  ? `All ${successCount} competitors analyzed!`
                  : `${successCount} competitor${successCount > 1 ? 's' : ''} ready - more loading...`}
              </p>
            )}

            <Button
              onClick={handleViewDashboard}
              className="bg-[#D76228] hover:bg-[#c55620] text-white rounded-full px-8 h-12 text-base font-medium shadow-lg shadow-[#D76228]/20 hover:shadow-xl hover:shadow-[#D76228]/30"
            >
              View Dashboard
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>

            {!allComplete && (
              <p className="text-xs text-[#165762]/40 mt-3">
                Dashboard will update as more results come in
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
