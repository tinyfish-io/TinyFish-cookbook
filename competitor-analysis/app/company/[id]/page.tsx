"use client";

import { useParams, useRouter } from "next/navigation";
import { usePricing } from "@/lib/pricing-context";
import { ArrowLeft, ExternalLink, Clock, RefreshCw, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useCallback } from "react";
import type { CompetitorPricing } from "@/types";

function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined) return "—";
  if (price === 0) return "Free";
  return `$${price.toLocaleString()}`;
}

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;

  const { state, setScrapingStatus } = usePricing();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const competitor = state.competitors.find((c) => c.id === companyId);
  const scrapingResult = state.scrapingResults[companyId];
  const data = scrapingResult?.data;
  const tiers = data?.tiers || [];
  const baseline = state.baseline;

  // Calculate positioning - use starting price (lowest tier) from each competitor
  const competitorStartingPrices = Object.entries(state.scrapingResults)
    .filter(([, r]) => r.status === "complete" && r.data?.tiers)
    .map(([id, r]) => {
      const prices = r.data!.tiers
        .map((t) => t.monthlyPrice ?? t.price)
        .filter((p): p is number => typeof p === "number" && p > 0);
      return {
        id,
        price: prices.length > 0 ? Math.min(...prices) : 0,
      };
    })
    .filter((c) => c.price > 0);

  const allStartingPrices = competitorStartingPrices.map((c) => c.price).sort((a, b) => a - b);

  const companyPrice = tiers
    .map((t) => t.monthlyPrice ?? t.price)
    .filter((p): p is number => typeof p === "number" && p > 0)
    .sort((a, b) => a - b)[0] || 0;

  const position = allStartingPrices.filter((p) => p < companyPrice).length + 1;
  const totalCompetitors = competitorStartingPrices.length;

  const vsBaseline =
    baseline && companyPrice > 0
      ? ((companyPrice - baseline.pricePerUnit) / baseline.pricePerUnit) * 100
      : null;

  const pricingModel = data?.pricingModel || "Not specified";
  const primaryUnit = data?.primaryUnit || tiers[0]?.unit || "month";
  const unitDefinition = data?.unitDefinition;

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    if (!competitor) return;
    setIsRefreshing(true);

    try {
      let url = competitor.url || competitor.generatedUrl;
      if (!url) {
        const urlResponse = await fetch("/api/generate-urls", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ competitors: [competitor] }),
        });
        if (urlResponse.ok) {
          const { competitors: enriched } = await urlResponse.json();
          url = enriched[0]?.generatedUrl;
        }
        url = url || `https://${competitor.name.toLowerCase().replace(/\s+/g, "")}.com/pricing`;
      }

      const response = await fetch("/api/scrape-pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competitors: [{ ...competitor, url }],
          detailLevel: state.detailLevel,
        }),
      });

      if (!response.ok) throw new Error("Scraping failed");

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
              if (event.id === companyId && event.type === "competitor_complete") {
                setScrapingStatus(companyId, {
                  status: "complete",
                  data: event.data as CompetitorPricing,
                  steps: ["Complete"],
                  completedAt: Date.now(),
                });
              }
            } catch {}
          }
        }
      }
    } catch (error) {
      console.error("Refresh failed:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [competitor, companyId, setScrapingStatus, state.detailLevel]);

  const companyName = competitor?.name || data?.company || "Unknown Company";

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="p-1.5 -ml-1.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span className="text-sm text-slate-400">Back to Dashboard</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              variant="ghost"
              size="sm"
              className="text-slate-500"
            >
              {isRefreshing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
            {data?.url && (
              <a
                href={data.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 transition-colors"
              >
                View source
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Title */}
        <div className="mb-12">
          <h1 className="text-3xl font-semibold text-slate-900 mb-2">{companyName}</h1>
          {data?.url && (
            <p className="text-slate-400 text-sm">{data.url.replace(/^https?:\/\//, "")}</p>
          )}
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-4 gap-8 mb-16 pb-16 border-b border-slate-100">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
              Starting Price
            </p>
            <p className="text-2xl font-semibold text-slate-900">
              {formatPrice(companyPrice)}
              <span className="text-base font-normal text-slate-400">/mo</span>
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
              Market Position
            </p>
            <p className="text-2xl font-semibold text-slate-900">
              #{position}
              <span className="text-base font-normal text-slate-400"> of {totalCompetitors}</span>
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
              vs Your Price
            </p>
            <p className={`text-2xl font-semibold ${
              vsBaseline === null ? "text-slate-400" :
              vsBaseline < 0 ? "text-emerald-600" :
              vsBaseline > 0 ? "text-rose-600" : "text-slate-900"
            }`}>
              {vsBaseline === null ? "—" : `${vsBaseline > 0 ? "+" : ""}${vsBaseline.toFixed(0)}%`}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
              Pricing Model
            </p>
            <p className="text-lg font-medium text-slate-900 capitalize">
              {pricingModel.replace(/-/g, " ")}
            </p>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-16">

          {/* How They Charge */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-6">How They Charge</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-8">
                <div className="w-32 flex-shrink-0">
                  <p className="text-sm text-slate-400">Model</p>
                </div>
                <p className="text-sm text-slate-700 capitalize">{pricingModel.replace(/-/g, " ")}</p>
              </div>
              <div className="flex items-start gap-8">
                <div className="w-32 flex-shrink-0">
                  <p className="text-sm text-slate-400">Unit</p>
                </div>
                <p className="text-sm text-slate-700 capitalize">{primaryUnit.replace(/_/g, " ")}</p>
              </div>
              {unitDefinition && (
                <div className="flex items-start gap-8">
                  <div className="w-32 flex-shrink-0">
                    <p className="text-sm text-slate-400">Definition</p>
                  </div>
                  <p className="text-sm text-slate-700">{unitDefinition}</p>
                </div>
              )}
            </div>
          </section>

          {/* Pricing Tiers */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-6">
              Pricing Tiers
              <span className="text-slate-400 font-normal ml-2">({tiers.length})</span>
            </h2>

            {tiers.length > 0 ? (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Tier</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Monthly</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Annual</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Includes</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Concurrent</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Overage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tiers.map((tier, index) => (
                      <tr key={index} className="hover:bg-slate-50/50">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900">{tier.name}</span>
                            {tier.verified && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-600 text-xs rounded">
                                <Check className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className="font-medium text-slate-900">
                            {formatPrice(tier.monthlyPrice ?? tier.price)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right text-slate-500">
                          {tier.annualPrice ? `$${tier.annualPrice}` : tier.annualPriceNote || "—"}
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600 max-w-xs">
                          {tier.whatsIncluded || "—"}
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600">
                          {tier.concurrent && tier.concurrent !== "Not specified" && tier.concurrent !== "Unknown"
                            ? tier.concurrent
                            : "—"}
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600">
                          {tier.overage && tier.overage !== "Not specified" && tier.overage !== "N/A"
                            ? tier.overage
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-400">No pricing tiers found. Try refreshing.</p>
            )}
          </section>

          {/* Market Position */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-6">Market Position</h2>

            <div className="space-y-6">
              {/* Position bar */}
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span>Cheapest</span>
                  <span>Most Expensive</span>
                </div>
                <div className="relative h-2 bg-slate-100 rounded-full">
                  {(() => {
                    const minPrice = allStartingPrices.length > 0 ? Math.min(...allStartingPrices) : 0;
                    const maxPrice = allStartingPrices.length > 0 ? Math.max(...allStartingPrices) : 0;
                    const range = maxPrice - minPrice || 1;

                    return (
                      <>
                        {allStartingPrices.length > 0 && companyPrice > 0 && (
                          <div
                            className="absolute top-1/2 w-3 h-3 rounded-full bg-slate-900 border-2 border-white shadow-sm"
                            style={{
                              left: `${Math.min(Math.max(((companyPrice - minPrice) / range) * 100, 2), 98)}%`,
                              transform: "translate(-50%, -50%)",
                            }}
                          />
                        )}
                        {baseline && allStartingPrices.length > 0 && (
                          <div
                            className="absolute top-1/2 w-3 h-3 rounded-full bg-[#D76228] border-2 border-white shadow-sm"
                            style={{
                              left: `${Math.min(Math.max(((baseline.pricePerUnit - minPrice) / range) * 100, 2), 98)}%`,
                              transform: "translate(-50%, -50%)",
                            }}
                          />
                        )}
                      </>
                    );
                  })()}
                </div>
                <div className="flex items-center justify-center gap-6 mt-3 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-900" />
                    <span>{companyName}</span>
                  </div>
                  {baseline && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#D76228]" />
                      <span>You</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border border-slate-200 rounded-lg">
                  <p className="text-xs text-slate-400 mb-1">Cheaper than</p>
                  <p className="text-xl font-semibold text-slate-900">
                    {allStartingPrices.filter((p) => p > companyPrice).length}
                    <span className="text-sm font-normal text-slate-400 ml-1">competitors</span>
                  </p>
                </div>
                <div className="p-4 border border-slate-200 rounded-lg">
                  <p className="text-xs text-slate-400 mb-1">More expensive than</p>
                  <p className="text-xl font-semibold text-slate-900">
                    {allStartingPrices.filter((p) => p < companyPrice).length}
                    <span className="text-sm font-normal text-slate-400 ml-1">competitors</span>
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Notes */}
          {(data?.dataQualityNotes || data?.verificationSource) && (
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-6">Notes</h2>
              <div className="text-sm text-slate-600 space-y-2">
                {data.dataQualityNotes && <p>{data.dataQualityNotes}</p>}
                {data.verificationSource && (
                  <p className="text-slate-400">{data.verificationSource}</p>
                )}
              </div>
            </section>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-100 mt-16">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between text-sm text-slate-400">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>
              {data?.scrapedAt
                ? `Last updated ${new Date(data.scrapedAt).toLocaleDateString()}`
                : "No data"}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
