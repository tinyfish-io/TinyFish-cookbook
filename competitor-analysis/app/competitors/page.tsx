"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePricing } from "@/lib/pricing-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  X,
  Building2,
  Link as LinkIcon,
  Zap,
  BarChart3,
  Sparkles,
  Clock,
} from "lucide-react";
import type { Competitor, DetailLevel } from "@/types";

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

const detailLevelConfig = {
  low: {
    label: "Quick Scan",
    description: "Basic pricing tiers and model",
    time: "~30 sec per competitor",
    icon: Zap,
    color: "emerald",
  },
  medium: {
    label: "Standard",
    description: "Tiers, units, and pricing structure",
    time: "~1 min per competitor",
    icon: BarChart3,
    color: "blue",
  },
  high: {
    label: "Comprehensive",
    description: "Full unit definitions, overage costs, notes",
    time: "~2 min per competitor",
    icon: Sparkles,
    color: "violet",
  },
} as const;

export default function CompetitorsPage() {
  const router = useRouter();
  const { state, setCompetitors, setStep, setDetailLevel } = usePricing();

  const [competitors, setLocalCompetitors] = useState<Competitor[]>(() => {
    if (state.competitors.length > 0) {
      return state.competitors;
    }
    // Start with 3 empty rows
    return [
      { id: generateId(), name: "", url: "" },
      { id: generateId(), name: "", url: "" },
      { id: generateId(), name: "", url: "" },
    ];
  });

  // Redirect if no baseline
  useEffect(() => {
    if (!state.baseline) {
      router.push("/");
    }
  }, [state.baseline, router]);

  const validCompetitors = competitors.filter((c) => c.name.trim() !== "");
  const isValid = validCompetitors.length >= 10;
  const progress = Math.min(validCompetitors.length, 10);

  const addCompetitor = () => {
    setLocalCompetitors([...competitors, { id: generateId(), name: "", url: "" }]);
  };

  const removeCompetitor = (id: string) => {
    if (competitors.length > 1) {
      setLocalCompetitors(competitors.filter((c) => c.id !== id));
    }
  };

  const updateCompetitor = (id: string, field: "name" | "url", value: string) => {
    setLocalCompetitors(
      competitors.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  // Handle paste - auto-populate multiple rows if list is detected
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>, currentId: string) => {
    const pastedText = e.clipboardData.getData("text");

    // Split by newlines, commas, or tabs
    const items = pastedText
      .split(/[\n,\t]+/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    // If multiple items detected, prevent default and bulk add
    if (items.length > 1) {
      e.preventDefault();

      // Find current competitor index
      const currentIndex = competitors.findIndex((c) => c.id === currentId);

      // Create new competitors array
      const newCompetitors = [...competitors];

      items.forEach((name, i) => {
        const targetIndex = currentIndex + i;

        if (targetIndex < newCompetitors.length) {
          // Fill existing empty slot
          if (!newCompetitors[targetIndex].name.trim()) {
            newCompetitors[targetIndex] = {
              ...newCompetitors[targetIndex],
              name,
            };
          } else {
            // Insert new row if current slot is filled
            newCompetitors.splice(targetIndex + 1, 0, {
              id: generateId(),
              name,
              url: "",
            });
          }
        } else {
          // Add new row
          newCompetitors.push({
            id: generateId(),
            name,
            url: "",
          });
        }
      });

      setLocalCompetitors(newCompetitors);
    }
  };

  const handleSubmit = () => {
    if (isValid) {
      setCompetitors(validCompetitors);
      setStep(3);
      router.push("/analysis");
    }
  };

  const handleBack = () => {
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-[#F4F3F2] relative overflow-hidden">
      {/* Subtle background texture */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      <main className="relative max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-24">
        {/* Progress Indicator */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-3">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                  step <= 2 ? "bg-[#D76228]" : "bg-[#165762]/10"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider text-[#165762]/50">
              Step 2 of 4 — Add Competitors
            </p>
            <button
              onClick={handleBack}
              className="flex items-center gap-1 text-xs text-[#165762]/50 hover:text-[#D76228] transition-colors"
            >
              <ArrowLeft className="w-3 h-3" />
              Back
            </button>
          </div>
        </div>

        {/* Header */}
        <header className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-2xl md:text-3xl font-medium text-[#1a1a1a] tracking-tight mb-2">
            Add competitors to track
          </h1>
          <p className="text-sm text-[#165762]/60">
            Enter 10-15 competitor names. We&apos;ll find their pricing pages and
            extract the data.
          </p>
          <p className="text-xs text-[#D76228] mt-2">
            Tip: Paste a comma or newline-separated list to bulk add
          </p>
        </header>

        {/* Detail Level Selector */}
        <div className="mb-6 sm:mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <p className="text-xs uppercase tracking-wider text-[#165762]/50 mb-3 sm:mb-4">
            Scraping Detail Level
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
            {(Object.entries(detailLevelConfig) as [DetailLevel, typeof detailLevelConfig[DetailLevel]][]).map(([level, config]) => {
              const Icon = config.icon;
              const isSelected = state.detailLevel === level;
              return (
                <button
                  key={level}
                  onClick={() => setDetailLevel(level)}
                  className={`relative p-3 sm:p-4 rounded-xl border-2 transition-all duration-300 text-left ${
                    isSelected
                      ? config.color === "emerald"
                        ? "border-emerald-500 bg-emerald-50"
                        : config.color === "blue"
                        ? "border-blue-500 bg-blue-50"
                        : "border-violet-500 bg-violet-50"
                      : "border-[#e0dfde] bg-white hover:border-[#165762]/30"
                  }`}
                >
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div
                      className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isSelected
                          ? config.color === "emerald"
                            ? "bg-emerald-500 text-white"
                            : config.color === "blue"
                            ? "bg-blue-500 text-white"
                            : "bg-violet-500 text-white"
                          : "bg-[#F4F3F2] text-[#165762]/50"
                      }`}
                    >
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm ${isSelected ? "text-[#1a1a1a]" : "text-[#165762]/70"}`}>
                        {config.label}
                      </p>
                      <p className="text-xs text-[#165762]/50 mt-0.5 leading-relaxed hidden sm:block">
                        {config.description}
                      </p>
                      <div className="flex items-center gap-1 mt-1 sm:mt-2">
                        <Clock className="w-3 h-3 text-[#165762]/40" />
                        <span className="text-xs text-[#165762]/40">{config.time}</span>
                      </div>
                    </div>
                  </div>
                  {isSelected && (
                    <div
                      className={`absolute top-2 right-2 w-2 h-2 rounded-full ${
                        config.color === "emerald"
                          ? "bg-emerald-500"
                          : config.color === "blue"
                          ? "bg-blue-500"
                          : "bg-violet-500"
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
          {/* Estimated total time */}
          <div className="mt-3 sm:mt-4 p-3 bg-[#F4F3F2] rounded-lg flex items-center justify-between">
            <span className="text-xs text-[#165762]/60">
              Est. time ({validCompetitors.length} competitors):
            </span>
            <span className="text-sm font-medium text-[#165762]">
              {state.detailLevel === "low"
                ? `~${Math.ceil(validCompetitors.length * 0.5)} min`
                : state.detailLevel === "medium"
                ? `~${validCompetitors.length} min`
                : `~${validCompetitors.length * 2} min`}
            </span>
          </div>
        </div>

        {/* Progress Counter */}
        <div className="mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-[#165762]/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#D76228] rounded-full transition-all duration-500 ease-out"
                style={{ width: `${(progress / 10) * 100}%` }}
              />
            </div>
            <span
              className={`text-sm font-medium transition-colors ${
                isValid ? "text-[#165762]" : "text-[#165762]/50"
              }`}
            >
              {validCompetitors.length}/10 minimum
            </span>
          </div>
        </div>

        {/* Competitor List */}
        <div className="space-y-3 mb-6">
          {competitors.map((competitor, index) => (
            <Card
              key={competitor.id}
              className="bg-white shadow-sm border-0 animate-in fade-in slide-in-from-bottom-2 duration-500"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  {/* Index Number */}
                  <div className="w-8 h-8 rounded-lg bg-[#F4F3F2] flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium text-[#165762]/50">
                      {index + 1}
                    </span>
                  </div>

                  {/* Company Name */}
                  <div className="flex-1 relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#165762]/30" />
                    <Input
                      placeholder={index === 0 ? "Paste a list or type company name" : "Company name"}
                      value={competitor.name}
                      onChange={(e) =>
                        updateCompetitor(competitor.id, "name", e.target.value)
                      }
                      onPaste={(e) => handlePaste(e, competitor.id)}
                      className="h-10 pl-10 bg-[#F4F3F2]/50 border-[#e0dfde] focus:border-[#D76228] focus:ring-[#D76228]/20"
                    />
                  </div>

                  {/* URL (Optional) */}
                  <div className="flex-1 relative hidden md:block">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#165762]/30" />
                    <Input
                      placeholder="Pricing URL (optional)"
                      value={competitor.url || ""}
                      onChange={(e) =>
                        updateCompetitor(competitor.id, "url", e.target.value)
                      }
                      className="h-10 pl-10 bg-[#F4F3F2]/50 border-[#e0dfde] focus:border-[#D76228] focus:ring-[#D76228]/20"
                    />
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={() => removeCompetitor(competitor.id)}
                    className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center transition-colors group"
                    disabled={competitors.length === 1}
                  >
                    <X className="w-4 h-4 text-[#165762]/30 group-hover:text-red-500 transition-colors" />
                  </button>
                </div>

                {/* Mobile URL Input */}
                <div className="mt-3 md:hidden relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#165762]/30" />
                  <Input
                    placeholder="Pricing URL (optional)"
                    value={competitor.url || ""}
                    onChange={(e) =>
                      updateCompetitor(competitor.id, "url", e.target.value)
                    }
                    className="h-10 pl-10 bg-[#F4F3F2]/50 border-[#e0dfde] focus:border-[#D76228] focus:ring-[#D76228]/20"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Add Button */}
        <button
          onClick={addCompetitor}
          className="w-full py-4 border-2 border-dashed border-[#165762]/20 rounded-xl text-sm font-medium text-[#165762]/50 hover:border-[#D76228] hover:text-[#D76228] transition-colors flex items-center justify-center gap-2 mb-8"
        >
          <Plus className="w-4 h-4" />
          Add Competitor
        </button>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={!isValid}
          className={`w-full h-12 rounded-full font-medium text-base transition-all ${
            isValid
              ? "bg-[#D76228] hover:bg-[#c55620] text-white shadow-lg shadow-[#D76228]/20 hover:shadow-xl hover:shadow-[#D76228]/30"
              : "bg-[#165762]/10 text-[#165762]/40 cursor-not-allowed"
          }`}
        >
          {isValid ? (
            <>
              Start Analysis
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          ) : (
            `Add ${10 - validCompetitors.length} more competitor${
              10 - validCompetitors.length === 1 ? "" : "s"
            }`
          )}
        </Button>

        {/* Quick Add Suggestions */}
        <div className="mt-8 animate-in fade-in duration-1000 delay-500">
          <p className="text-xs uppercase tracking-wider text-[#165762]/40 mb-3">
            Popular competitors to track
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              "Browserless",
              "ScrapingBee",
              "Apify",
              "Bright Data",
              "ScraperAPI",
              "PhantomBuster",
              "Bardeen",
              "Oxylabs",
              "DataForSEO",
              "Smartproxy",
            ].map((name) => (
              <button
                key={name}
                onClick={() => {
                  const emptySlot = competitors.find((c) => !c.name.trim());
                  if (emptySlot) {
                    updateCompetitor(emptySlot.id, "name", name);
                  } else {
                    setLocalCompetitors([
                      ...competitors,
                      { id: generateId(), name, url: "" },
                    ]);
                  }
                }}
                className="px-3 py-1.5 text-xs font-medium text-[#165762]/60 bg-white rounded-full border border-[#e0dfde] hover:border-[#D76228] hover:text-[#D76228] transition-colors"
              >
                + {name}
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
