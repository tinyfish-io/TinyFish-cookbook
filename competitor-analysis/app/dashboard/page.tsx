"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  ScatterChart,
  Scatter,
  ZAxis,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { usePricing } from "@/lib/pricing-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { DashboardLayout } from "@/components/dashboard-layout";
import { SettingsPanel } from "@/components/settings-panel";
import { CompetitorInput } from "@/components/competitor-input";
import { SpreadsheetView } from "@/components/spreadsheet-view";
import {
  Lightbulb,
  Loader2,
  ArrowRight,
  Zap,
  ExternalLink,
  Pencil,
  Trash2,
  RefreshCw,
  Globe,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  EyeOff,
} from "lucide-react";
import type { Competitor, CompetitorPricing } from "@/types";

interface SortConfig {
  key: string;
  direction: "asc" | "desc";
}

export default function DashboardPage() {
  const {
    state,
    // reset,
    setAnalysis,
    setBaseline,
    addCompetitor,
    removeCompetitor,
    setScrapingStatus,
    editTierField,
    verifyTier,
    setFirstLoad,
  } = usePricing();

  const [sortConfig] = useState<SortConfig>({
    key: "name",
    direction: "asc",
  });
  const [selectedCompetitor, setSelectedCompetitor] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeView, setActiveView] = useState("spreadsheet");

  // State for panels
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(false);
  const [isAddingCompetitors, setIsAddingCompetitors] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState<Record<string, boolean>>({});
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [showAddInput, setShowAddInput] = useState(false);
  const [editingCompetitor, setEditingCompetitor] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [excludedFromChart, setExcludedFromChart] = useState<Set<string>>(new Set());

  // Track if initial scraping has been triggered
  const initialScrapingTriggered = useRef(false);

  // Open settings panel on first load if no baseline
  useEffect(() => {
    if (!state.baseline && state.isFirstLoad) {
      setSettingsPanelOpen(true);
    }
  }, [state.baseline, state.isFirstLoad]);

  // Auto-scrape on first load (hybrid approach)
  useEffect(() => {
    if (
      state.competitors.length > 0 &&
      state.isFirstLoad &&
      !initialScrapingTriggered.current &&
      Object.keys(state.scrapingResults).length === 0
    ) {
      initialScrapingTriggered.current = true;
      handleRefreshAll();
      setFirstLoad(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.competitors, state.isFirstLoad, state.scrapingResults]);

  // Scrape a single competitor
  const scrapeCompetitor = useCallback(async (competitor: Competitor) => {
    setScrapingStatus(competitor.id, {
      status: 'scraping',
      steps: ['Starting...'],
      startedAt: Date.now(),
    });

    try {
      let url = competitor.url || competitor.generatedUrl;

      if (!url) {
        setScrapingStatus(competitor.id, {
          status: 'generating-url',
          steps: ['Generating pricing page URL...'],
          startedAt: Date.now(),
        });

        const urlResponse = await fetch('/api/generate-urls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ competitors: [competitor] }),
        });

        if (urlResponse.ok) {
          const { competitors: enriched } = await urlResponse.json();
          url = enriched[0]?.generatedUrl || `https://${competitor.name.toLowerCase().replace(/\s+/g, '')}.com/pricing`;
        } else {
          url = `https://${competitor.name.toLowerCase().replace(/\s+/g, '')}.com/pricing`;
        }
      }

      const response = await fetch('/api/scrape-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          competitors: [{ ...competitor, url }],
          detailLevel: state.detailLevel,
        }),
      });

      if (!response.ok) {
        throw new Error('Scraping failed');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));

              if (event.id === competitor.id) {
                if (event.type === 'competitor_streaming') {
                  setScrapingStatus(competitor.id, {
                    status: 'scraping',
                    streamingUrl: event.streamingUrl,
                    steps: ['Scraping...'],
                    startedAt: Date.now(),
                  });
                } else if (event.type === 'competitor_step') {
                  setScrapingStatus(competitor.id, {
                    status: 'scraping',
                    steps: [event.step],
                    startedAt: Date.now(),
                  });
                } else if (event.type === 'competitor_complete') {
                  setScrapingStatus(competitor.id, {
                    status: 'complete',
                    data: event.data as CompetitorPricing,
                    steps: ['Complete'],
                    completedAt: Date.now(),
                  });
                } else if (event.type === 'competitor_error') {
                  setScrapingStatus(competitor.id, {
                    status: 'error',
                    error: event.error,
                    steps: ['Error'],
                    completedAt: Date.now(),
                  });
                }
              }
            } catch {
              // Parse error, ignore
            }
          }
        }
      }
    } catch (error) {
      setScrapingStatus(competitor.id, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        steps: ['Error'],
        completedAt: Date.now(),
      });
    }
  }, [setScrapingStatus, state.detailLevel]);

  // Refresh all competitors
  const handleRefreshAll = useCallback(async () => {
    if (state.competitors.length === 0) return;

    setIsRefreshingAll(true);
    await Promise.all(state.competitors.map(scrapeCompetitor));
    setIsRefreshingAll(false);
  }, [state.competitors, scrapeCompetitor]);

  // Refresh single competitor
  const handleRefreshCompetitor = useCallback(async (competitorId: string) => {
    const competitor = state.competitors.find(c => c.id === competitorId);
    if (!competitor) return;

    setIsRefreshing(prev => ({ ...prev, [competitorId]: true }));
    await scrapeCompetitor(competitor);
    setIsRefreshing(prev => ({ ...prev, [competitorId]: false }));
  }, [state.competitors, scrapeCompetitor]);

  // Add competitors from inline input and scrape
  const handleAddCompetitors = useCallback(async (competitors: { name: string; url?: string }[]) => {
    if (competitors.length === 0) return;

    setIsAddingCompetitors(true);
    setShowAddInput(false);

    const newCompetitors: Competitor[] = competitors.map((c, index) => ({
      id: `comp_${Date.now()}_${index}`,
      name: c.name,
      url: c.url,
    }));

    newCompetitors.forEach(comp => addCompetitor(comp));
    await Promise.all(newCompetitors.map(scrapeCompetitor));

    setIsAddingCompetitors(false);
  }, [addCompetitor, scrapeCompetitor]);

  // Run AI analysis on available data
  const runAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const pricingData = Object.entries(state.scrapingResults)
        .filter(([, result]) => result.status === "complete" && result.data)
        .map(([id, result]) => {
          const competitor = state.competitors.find((c) => c.id === id);
          return {
            company: competitor?.name || result.data?.company || "Unknown",
            url: competitor?.url || "",
            data: result.data,
          };
        });

      if (pricingData.length === 0) {
        console.error("No completed scraping data to analyze");
        setIsAnalyzing(false);
        return;
      }

      const response = await fetch("/api/analyze-pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseline: state.baseline,
          pricingData,
        }),
      });

      if (response.ok) {
        const { analysis } = await response.json();
        setAnalysis(analysis);
      }
    } catch (error) {
      console.error("Analysis error:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analysis = state.analysis;
  const baseline = state.baseline;

  // Count loading/pending competitors
  const pendingCount = Object.values(state.scrapingResults).filter(
    (r) => r.status === "scraping" || r.status === "pending" || r.status === "generating-url"
  ).length;

  // Build competitor data from scraping results
  const competitorData = Object.entries(state.scrapingResults)
    .filter(([, result]) => result.status === "complete" && result.data)
    .map(([id, result]) => {
      const competitor = state.competitors.find((c) => c.id === id);
      const data = result.data;
      const normalized = analysis?.normalizedPrices?.[data?.company || ""];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tiers: any[] = data?.tiers || [];
      const prices = tiers
        .map((t) => t?.monthlyPrice ?? t?.price)
        .filter((p): p is number => typeof p === "number" && p > 0);
      const lowestPrice = prices.length > 0 ? Math.min(...prices) : 0;

      const primaryUnit = data?.primaryUnit;
      const unitDefinition = data?.unitDefinition;
      const firstTier = tiers[0];
      const unitType = primaryUnit || firstTier?.unit || firstTier?.billingPeriod || firstTier?.period || "N/A";

      const yourPrice = baseline ? baseline.pricePerUnit : 0;
      const vsYou = yourPrice > 0 && lowestPrice > 0 ? ((lowestPrice - yourPrice) / yourPrice) * 100 : 0;

      return {
        id,
        name: competitor?.name || data?.company || "Unknown",
        pricingModel: data?.pricingModel || normalized?.pricingModel || "unknown",
        unitType,
        unitDefinition: unitDefinition || null,
        primaryUnit: primaryUnit || null,
        pricePerUnit: lowestPrice,
        normalizedCost: normalized?.normalizedCostPerWorkflow || lowestPrice,
        vsYou,
        data,
        normalized,
        additionalNotes: data?.additionalNotes || null,
      };
    });

  // Sort data
  const sortedData = [...competitorData].sort((a, b) => {
    const aValue = a[sortConfig.key as keyof typeof a];
    const bValue = b[sortConfig.key as keyof typeof b];

    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue;
    }

    const aStr = String(aValue).toLowerCase();
    const bStr = String(bValue).toLowerCase();
    return sortConfig.direction === "asc"
      ? aStr.localeCompare(bStr)
      : bStr.localeCompare(aStr);
  });

  // const handleSort = (key: string) => {
  //   setSortConfig((prev) => ({
  //     key,
  //     direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
  //   }));
  // };

  // Prepare spreadsheet data
  const spreadsheetData = Object.entries(state.scrapingResults)
    .filter(([, result]) => result.status === "complete" && result.data)
    .map(([id, result]) => ({ id, data: result.data }));

  // const SortIcon = ({ column }: { column: string }) => {
  //   if (sortConfig.key !== column) return null;
  //   return sortConfig.direction === "asc" ? (
  //     <ChevronUp className="w-3 h-3 ml-1" />
  //   ) : (
  //     <ChevronDown className="w-3 h-3 ml-1" />
  //   );
  // };

  // Render view content based on activeView
  const renderContent = () => {
    // Always show add input if no competitors or if toggled
    if (showAddInput || state.competitors.length === 0) {
      return (
        <div className="max-w-3xl mx-auto">
          <CompetitorInput
            onStartScraping={handleAddCompetitors}
            isLoading={isAddingCompetitors}
            existingCompetitors={state.competitors.map(c => c.name)}
          />
        </div>
      );
    }

    switch (activeView) {
      case "spreadsheet":
        return (
          <SpreadsheetView
            competitorPricing={spreadsheetData}
            onEditCell={editTierField}
            onVerifyTier={(competitorId, tierIndex) => {
              verifyTier({
                competitorId,
                tierIndex,
                verifiedBy: "User",
                verifiedAt: new Date().toISOString(),
              });
            }}
            onRefreshCompetitor={handleRefreshCompetitor}
            isRefreshing={isRefreshing}
          />
        );

      case "competitors":
        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-slate-900">Manage Competitors</h3>
                <p className="text-sm text-slate-500 mt-0.5">Edit, remove, or refresh competitor data</p>
              </div>
              <Button
                onClick={() => setShowAddInput(true)}
                size="sm"
                className="bg-slate-900 hover:bg-slate-800 text-white"
              >
                Add Competitor
              </Button>
            </div>

            {/* Competitors List */}
            <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
              {state.competitors.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <Globe className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">No competitors added yet</p>
                  <Button
                    onClick={() => setShowAddInput(true)}
                    variant="outline"
                    size="sm"
                    className="mt-4"
                  >
                    Add your first competitor
                  </Button>
                </div>
              ) : (
                state.competitors.map((competitor) => {
                  const scrapingResult = state.scrapingResults[competitor.id];
                  const isEditing = editingCompetitor === competitor.id;
                  const isLoading = isRefreshing[competitor.id];

                  return (
                    <div key={competitor.id} className="px-6 py-4">
                      {isEditing ? (
                        <div className="flex items-center gap-4">
                          <div className="flex-1 space-y-2">
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              placeholder="Company name"
                              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
                            />
                            <input
                              type="text"
                              value={editUrl}
                              onChange={(e) => setEditUrl(e.target.value)}
                              placeholder="Pricing page URL (optional)"
                              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingCompetitor(null)}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              className="bg-slate-900 hover:bg-slate-800 text-white"
                              onClick={() => {
                                // TODO: Update competitor in context
                                setEditingCompetitor(null);
                              }}
                            >
                              Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            {/* Status indicator */}
                            <div className="flex-shrink-0">
                              {scrapingResult?.status === "complete" ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                              ) : scrapingResult?.status === "error" ? (
                                <XCircle className="w-5 h-5 text-red-500" />
                              ) : scrapingResult?.status === "scraping" || scrapingResult?.status === "generating-url" ? (
                                <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                              ) : (
                                <Clock className="w-5 h-5 text-slate-300" />
                              )}
                            </div>

                            {/* Info */}
                            <div>
                              <p className="text-sm font-medium text-slate-900">{competitor.name}</p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {competitor.url || competitor.generatedUrl || "URL will be auto-generated"}
                              </p>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1">
                            {(competitor.url || competitor.generatedUrl) && (
                              <a
                                href={competitor.url || competitor.generatedUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-md transition-colors"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                            <button
                              onClick={() => {
                                setEditingCompetitor(competitor.id);
                                setEditName(competitor.name);
                                setEditUrl(competitor.url || competitor.generatedUrl || "");
                              }}
                              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-md transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleRefreshCompetitor(competitor.id)}
                              disabled={isLoading}
                              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-md transition-colors disabled:opacity-50"
                            >
                              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                            </button>
                            <button
                              onClick={() => removeCompetitor(competitor.id)}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Scraping status details */}
                      {scrapingResult && scrapingResult.status !== "complete" && scrapingResult.status !== "pending" && (
                        <div className="mt-3 pl-9">
                          {scrapingResult.status === "error" ? (
                            <p className="text-xs text-red-500">{scrapingResult.error}</p>
                          ) : (
                            <p className="text-xs text-slate-500">{scrapingResult.steps?.[scrapingResult.steps.length - 1] || "Processing..."}</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );

      case "agents":
        return (
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h3 className="text-lg font-medium text-slate-900">Agent Monitor</h3>
              <p className="text-sm text-slate-500 mt-0.5">Watch real-time browser automation</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Agent List */}
              <div className="lg:col-span-1">
                <div className="bg-white border border-slate-200 rounded-lg">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Agents</p>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-[600px] overflow-auto">
                    {(() => {
                      const activeAgents = Object.entries(state.scrapingResults)
                        .filter(([, result]) => result.streamingUrl || result.status === "scraping" || result.status === "generating-url")
                        .map(([id, result]) => ({
                          id,
                          competitor: state.competitors.find(c => c.id === id),
                          result,
                        }));

                      if (activeAgents.length === 0) {
                        return (
                          <div className="px-4 py-8 text-center">
                            <Play className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                            <p className="text-xs text-slate-400">No agents running</p>
                            <p className="text-xs text-slate-400 mt-1">Start scraping to see agents here</p>
                          </div>
                        );
                      }

                      return activeAgents.map(({ id, competitor, result }) => (
                        <button
                          key={id}
                          onClick={() => setSelectedAgentId(id)}
                          className={`w-full px-4 py-3 text-left transition-colors ${
                            selectedAgentId === id ? "bg-slate-50" : "hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0">
                              {result.status === "scraping" || result.status === "generating-url" ? (
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              ) : (
                                <div className="w-2 h-2 rounded-full bg-slate-300" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-slate-900 truncate">
                                {competitor?.name || "Unknown"}
                              </p>
                              <p className="text-xs text-slate-500 truncate">
                                {result.status === "generating-url" ? "Finding URL..." :
                                 result.status === "scraping" ? "Scraping..." :
                                 result.status}
                              </p>
                            </div>
                          </div>
                        </button>
                      ));
                    })()}
                  </div>

                  {/* Completed agents */}
                  {(() => {
                    const completedAgents = Object.entries(state.scrapingResults)
                      .filter(([, result]) => result.status === "complete" && result.streamingUrl)
                      .slice(0, 5);

                    if (completedAgents.length === 0) return null;

                    return (
                      <>
                        <div className="px-4 py-3 border-t border-b border-slate-100 bg-slate-50">
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Recent</p>
                        </div>
                        <div className="divide-y divide-slate-100">
                          {completedAgents.map(([id]) => {
                            const competitor = state.competitors.find(c => c.id === id);
                            return (
                              <button
                                key={id}
                                onClick={() => setSelectedAgentId(id)}
                                className={`w-full px-4 py-3 text-left transition-colors ${
                                  selectedAgentId === id ? "bg-slate-50" : "hover:bg-slate-50"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-slate-900 truncate">
                                      {competitor?.name || "Unknown"}
                                    </p>
                                    <p className="text-xs text-slate-500">Completed</p>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Browser View */}
              <div className="lg:col-span-2">
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-400" />
                        <div className="w-3 h-3 rounded-full bg-yellow-400" />
                        <div className="w-3 h-3 rounded-full bg-green-400" />
                      </div>
                      <p className="text-xs text-slate-500 ml-2">
                        {selectedAgentId ?
                          state.competitors.find(c => c.id === selectedAgentId)?.name || "Browser View" :
                          "Select an agent to view"
                        }
                      </p>
                    </div>
                    {selectedAgentId && state.scrapingResults[selectedAgentId]?.streamingUrl && (
                      <a
                        href={state.scrapingResults[selectedAgentId].streamingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
                      >
                        Open in new tab
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  <div className="aspect-video bg-slate-100 relative">
                    {selectedAgentId && state.scrapingResults[selectedAgentId]?.streamingUrl ? (
                      <iframe
                        src={state.scrapingResults[selectedAgentId].streamingUrl}
                        className="absolute inset-0 w-full h-full border-0"
                        title="Browser automation view"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                        <Globe className="w-12 h-12 text-slate-300 mb-4" />
                        <p className="text-sm text-slate-500">
                          {!selectedAgentId
                            ? "Select an agent from the list to view its browser session"
                            : state.scrapingResults[selectedAgentId]?.status === "scraping" || state.scrapingResults[selectedAgentId]?.status === "generating-url"
                            ? "Waiting for browser session to start..."
                            : "No browser session available for this agent"
                          }
                        </p>
                        {selectedAgentId && state.scrapingResults[selectedAgentId]?.streamingUrl && (
                          <a
                            href={state.scrapingResults[selectedAgentId].streamingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 text-xs text-slate-500 hover:text-slate-700 underline"
                          >
                            Try opening in new tab instead
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Agent details */}
                  {selectedAgentId && state.scrapingResults[selectedAgentId] && (
                    <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">
                          Status: <span className="font-medium text-slate-700 capitalize">{state.scrapingResults[selectedAgentId].status}</span>
                        </span>
                        {state.scrapingResults[selectedAgentId].steps && (
                          <span className="text-slate-500 truncate max-w-[60%]">
                            {state.scrapingResults[selectedAgentId].steps[state.scrapingResults[selectedAgentId].steps.length - 1]}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case "comparison": {
        // Filter out excluded companies
        const visibleData = sortedData.filter(c => !excludedFromChart.has(c.id));

        const toggleExcluded = (id: string) => {
          setExcludedFromChart(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
              next.delete(id);
            } else {
              next.add(id);
            }
            return next;
          });
        };

        return (
          <div className="space-y-8">
            {/* Scatterplot */}
            <div className="bg-white border border-slate-200 rounded-lg">
              <div className="px-6 py-4 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-slate-900">Price Comparison</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {excludedFromChart.size > 0
                        ? `${visibleData.length} of ${sortedData.length} shown · Click names below to toggle`
                        : "Click any point to view details"
                      }
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    {excludedFromChart.size > 0 && (
                      <button
                        onClick={() => setExcludedFromChart(new Set())}
                        className="text-xs text-slate-500 hover:text-slate-700 underline"
                      >
                        Show all
                      </button>
                    )}
                    <div className="flex items-center gap-6 text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-slate-900" />
                        <span>Competitors</span>
                      </div>
                      {baseline && (
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-slate-400" />
                          <span>You</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {(() => {
                  const scatterData = visibleData.map((c, index) => ({
                    x: c.pricePerUnit || 0,
                    y: index + 1,
                    z: 180,
                    name: c.name,
                    pricingModel: c.pricingModel,
                    unitType: c.unitType,
                    vsYou: c.vsYou,
                    id: c.id,
                    isYou: false,
                  }));

                  if (baseline) {
                    scatterData.push({
                      x: baseline.pricePerUnit || 0,
                      y: scatterData.length + 1,
                      z: 220,
                      name: `${baseline.companyName} (You)`,
                      pricingModel: baseline.pricingModel,
                      unitType: baseline.unitType,
                      vsYou: 0,
                      id: "baseline",
                      isYou: true,
                    });
                  }

                  scatterData.sort((a, b) => a.x - b.x);
                  scatterData.forEach((item, index) => {
                    item.y = index + 1;
                  });

                  const maxPrice = Math.max(...scatterData.map(d => d.x), 1);

                  if (scatterData.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <p className="text-sm text-slate-400">No pricing data available</p>
                      </div>
                    );
                  }

                  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: typeof scatterData[0] }> }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white px-3 py-2 rounded-md shadow-lg text-xs">
                          <p className="font-medium mb-1.5">{data.name}</p>
                          <div className="space-y-0.5 text-slate-300">
                            <p>${data.x.toFixed(2)}/mo · {data.pricingModel}</p>
                            {!data.isYou && baseline && (
                              <p className={data.vsYou < 0 ? "text-emerald-400" : data.vsYou > 0 ? "text-rose-400" : ""}>
                                {data.vsYou > 0 ? "+" : ""}{data.vsYou.toFixed(0)}% vs you
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  };

                  return (
                    <ResponsiveContainer width="100%" height={Math.max(350, scatterData.length * 45)}>
                      <ScatterChart margin={{ top: 10, right: 30, bottom: 30, left: 10 }}>
                        <CartesianGrid strokeDasharray="1 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis
                          type="number"
                          dataKey="x"
                          domain={[0, maxPrice * 1.1]}
                          tickFormatter={(value) => `$${value}`}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#64748b', fontSize: 10 }}
                          label={{ value: 'Monthly Price', position: 'bottom', offset: 10, fill: '#94a3b8', fontSize: 11 }}
                        />
                        <YAxis type="number" dataKey="y" domain={[0, scatterData.length + 1]} hide />
                        <ZAxis type="number" dataKey="z" range={[150, 300]} />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeDasharray: '3 3' }} />
                        {baseline && (
                          <ReferenceLine
                            x={baseline.pricePerUnit}
                            stroke="#94a3b8"
                            strokeDasharray="4 4"
                            strokeWidth={1}
                          />
                        )}
                        <Scatter
                          data={scatterData}
                          onClick={(data) => {
                            if (data && data.id !== "baseline") {
                              setSelectedCompetitor(data.id);
                            }
                          }}
                        >
                          {scatterData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.isYou ? '#94a3b8' : '#1e293b'}
                              stroke="white"
                              strokeWidth={2}
                              style={{ cursor: entry.isYou ? 'default' : 'pointer' }}
                            />
                          ))}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  );
                })()}
              </div>

              {/* Labels with toggle */}
              <div className="px-6 pb-5">
                <div className="flex flex-wrap gap-1.5">
                  {sortedData.map((item) => {
                    const isExcluded = excludedFromChart.has(item.id);
                    return (
                      <button
                        key={item.id}
                        onClick={() => toggleExcluded(item.id)}
                        className={`group inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md border transition-all ${
                          isExcluded
                            ? "border-slate-200 bg-slate-50 text-slate-400"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                        }`}
                      >
                        {isExcluded ? (
                          <EyeOff className="w-3 h-3 text-slate-400" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                        )}
                        <span className={isExcluded ? "line-through" : ""}>{item.name}</span>
                        <span className={isExcluded ? "text-slate-300" : "text-slate-400"}>
                          ${item.pricePerUnit?.toFixed(0) || '—'}
                        </span>
                      </button>
                    );
                  })}
                  {baseline && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-500 border border-transparent">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                      {baseline.companyName} (You)
                      <span className="text-slate-400">${baseline.pricePerUnit?.toFixed(0) || '—'}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-200 rounded-lg overflow-hidden">
              {(() => {
                const prices = visibleData.map(c => c.pricePerUnit).filter(p => p > 0);
                const yourPrice = baseline?.pricePerUnit || 0;
                const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
                const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
                const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
                const cheaperCount = prices.filter(p => p < yourPrice).length;
                const position = baseline ? cheaperCount + 1 : null;

                return (
                  <>
                    <div className="bg-white p-4">
                      <p className="text-xs text-slate-500 mb-1">Competitors</p>
                      <p className="text-xl font-medium text-slate-900">
                        {visibleData.length}
                        {excludedFromChart.size > 0 && (
                          <span className="text-sm font-normal text-slate-400 ml-1">of {sortedData.length}</span>
                        )}
                      </p>
                    </div>
                    <div className="bg-white p-4">
                      <p className="text-xs text-slate-500 mb-1">Average</p>
                      <p className="text-xl font-medium text-slate-900">${avgPrice.toFixed(0)}</p>
                    </div>
                    <div className="bg-white p-4">
                      <p className="text-xs text-slate-500 mb-1">Range</p>
                      <p className="text-xl font-medium text-slate-900">${minPrice.toFixed(0)}–${maxPrice.toFixed(0)}</p>
                    </div>
                    <div className="bg-white p-4">
                      <p className="text-xs text-slate-500 mb-1">Your Position</p>
                      <p className="text-xl font-medium text-slate-900">
                        {position ? `#${position}` : "—"}
                        {position && <span className="text-sm font-normal text-slate-400 ml-1">of {prices.length + 1}</span>}
                      </p>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        );
      }

      case "insights":
        return (
          <div className="space-y-6">
            {/* Generate Insights CTA */}
            {!analysis && competitorData.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-lg">
                <div className="px-6 py-5 flex items-center justify-between gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-slate-900">Ready for AI Analysis</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Generate strategic insights from {competitorData.length} competitors
                    </p>
                  </div>
                  <Button
                    onClick={runAnalysis}
                    disabled={isAnalyzing}
                    size="sm"
                    className="bg-slate-900 hover:bg-slate-800 text-white"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        Generate
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Insights Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Key Insights */}
              <div className="lg:col-span-2">
                <div className="bg-white border border-slate-200 rounded-lg h-full">
                  <div className="px-6 py-4 border-b border-slate-100">
                    <h3 className="text-sm font-medium text-slate-900">Key Insights</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Market intelligence summary</p>
                  </div>

                  <div className="p-6">
                    {analysis?.insights?.length ? (
                      <div className="space-y-4">
                        {analysis.insights.map((insight, i) => (
                          <div key={i} className="flex gap-3">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-medium">
                              {i + 1}
                            </span>
                            <p className="text-sm text-slate-700 leading-relaxed">{insight}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Lightbulb className="w-8 h-8 text-slate-300 mb-3" />
                        <p className="text-sm text-slate-400">Generate insights to see market intelligence</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Recommendations */}
                <div className="bg-white border border-slate-200 rounded-lg">
                  <div className="px-6 py-4 border-b border-slate-100">
                    <h3 className="text-sm font-medium text-slate-900">Recommendations</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Strategic actions</p>
                  </div>

                  <div className="p-6">
                    {analysis?.recommendations?.length ? (
                      <div className="space-y-3">
                        {analysis.recommendations.map((rec, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-md">
                            <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-slate-700 leading-relaxed">{rec}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <p className="text-sm text-slate-400">No recommendations yet</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Model Distribution */}
                <div className="bg-white border border-slate-200 rounded-lg">
                  <div className="px-6 py-4 border-b border-slate-100">
                    <h3 className="text-sm font-medium text-slate-900">Model Distribution</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Pricing strategies used</p>
                  </div>

                  <div className="p-6">
                    {analysis?.pricingModelBreakdown && Object.keys(analysis.pricingModelBreakdown).length > 0 ? (
                      <div className="space-y-4">
                        {(() => {
                          const entries = Object.entries(analysis.pricingModelBreakdown);
                          const total = entries.reduce((sum, [, count]) => sum + (count as number), 0);

                          return entries.map(([model, count]) => {
                            const percentage = total > 0 ? ((count as number) / total) * 100 : 0;
                            return (
                              <div key={model}>
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-sm text-slate-700 capitalize">
                                    {model.replace(/([A-Z])/g, ' $1').trim().replace(/-/g, ' ')}
                                  </span>
                                  <span className="text-sm font-medium text-slate-900">{count as number}</span>
                                </div>
                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-slate-800 rounded-full transition-all duration-500"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <p className="text-sm text-slate-400">No data yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <DashboardLayout
        activeView={activeView}
        onViewChange={setActiveView}
        onAddClick={() => setShowAddInput(!showAddInput)}
        onRefreshClick={handleRefreshAll}
        onSettingsClick={() => setSettingsPanelOpen(true)}
        isRefreshing={isRefreshingAll}
        showAddInput={showAddInput}
        competitorCount={competitorData.length}
        loadingCount={pendingCount}
        baselineName={baseline?.companyName}
      >
        {renderContent()}
      </DashboardLayout>

      {/* Competitor Detail Modal */}
      <Dialog open={!!selectedCompetitor} onOpenChange={() => setSelectedCompetitor(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto p-0">
          {(() => {
            const comp = sortedData.find(c => c.id === selectedCompetitor);
            if (!comp) return null;
            return (
              <div>
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100">
                  <h2 className="text-lg font-medium text-slate-900">{comp.name}</h2>
                  <p className="text-sm text-slate-500 mt-0.5">{comp.pricingModel} · {comp.primaryUnit || comp.unitType || "—"}</p>
                </div>

                {/* Content */}
                <div className="px-6 py-5 space-y-5">
                  {/* Quick stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Starting Price</p>
                      <p className="text-xl font-medium text-slate-900">
                        {comp.pricePerUnit ? `$${comp.pricePerUnit.toFixed(0)}` : "—"}
                        <span className="text-sm font-normal text-slate-400">/mo</span>
                      </p>
                    </div>
                    {baseline && (
                      <div>
                        <p className="text-xs text-slate-500 mb-1">vs Your Price</p>
                        <p className="text-xl font-medium text-slate-900">
                          {comp.vsYou > 0 ? "+" : ""}{comp.vsYou.toFixed(0)}%
                          <span className="text-sm font-normal text-slate-400 ml-1">
                            {comp.vsYou < 0 ? "cheaper" : comp.vsYou > 0 ? "higher" : "same"}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Unit definition */}
                  {comp.unitDefinition && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Unit Definition</p>
                      <p className="text-sm text-slate-700">{comp.unitDefinition}</p>
                    </div>
                  )}

                  {/* Tiers */}
                  {comp.data?.tiers && comp.data.tiers.length > 0 && (
                    <div>
                      <p className="text-xs text-slate-500 mb-2">Pricing Tiers</p>
                      <div className="border border-slate-200 rounded-md divide-y divide-slate-100">
                        {comp.data.tiers.map((tier, i) => (
                          <div key={i} className="px-4 py-3">
                            <div className="flex justify-between items-baseline">
                              <span className="text-sm font-medium text-slate-900">{tier.name}</span>
                              <span className="text-sm text-slate-900">
                                {tier.monthlyPrice != null ? `$${tier.monthlyPrice}` : "Custom"}
                                {tier.monthlyPrice != null && <span className="text-slate-400">/mo</span>}
                              </span>
                            </div>
                            {tier.whatsIncluded && tier.whatsIncluded !== "Not specified" && (
                              <p className="text-xs text-slate-500 mt-1">{tier.whatsIncluded}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Settings Panel */}
      <SettingsPanel
        open={settingsPanelOpen}
        onClose={() => setSettingsPanelOpen(false)}
        baseline={state.baseline}
        onSave={(newBaseline) => {
          setBaseline(newBaseline);
          setSettingsPanelOpen(false);
          setFirstLoad(false);
        }}
      />
    </>
  );
}
