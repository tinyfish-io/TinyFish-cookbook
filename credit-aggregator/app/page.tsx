"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, X, ChevronRight } from "lucide-react";

interface CreditCard {
  name: string;
  issuer?: string;
  annualFee?: string;
  rewards?: string;
  signUpBonus?: string;
  apr?: string;
  highlights?: string[];
  source?: string;
}

interface SiteStatus {
  name: string;
  status: "searching" | "complete" | "error" | "cancelled";
  steps: string[];
  error?: string;
}

export default function Home() {
  const [requirements, setRequirements] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<CreditCard[]>([]);
  const [sites, setSites] = useState<Record<string, SiteStatus>>({});
  const [error, setError] = useState("");
  const [selectedSite, setSelectedSite] = useState<string | null>(null);

  // Check if all active (non-cancelled) sites are done
  useEffect(() => {
    const siteList = Object.values(sites);
    if (siteList.length === 0) return;
    
    const activeSites = siteList.filter(s => s.status !== "cancelled");
    const allDone = activeSites.length > 0 && activeSites.every(s => s.status === "complete" || s.status === "error");
    
    if (allDone && loading) {
      setLoading(false);
    }
  }, [sites, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requirements.trim()) {
      setError("Please enter your credit card requirements");
      return;
    }

    setLoading(true);
    setError("");
    setResults([]);
    setSites({});
    setSelectedSite(null);

    try {
      const response = await fetch("/api/compare-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requirements }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch results");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

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

              if (event.type === "site_start") {
                setSites((prev) => ({
                  ...prev,
                  [event.site]: {
                    name: event.site,
                    status: "searching",
                    steps: [],
                  },
                }));
              } else if (event.type === "site_step") {
                setSites((prev) => ({
                  ...prev,
                  [event.site]: {
                    ...prev[event.site],
                    steps: [...(prev[event.site]?.steps || []), event.detail],
                  },
                }));
              } else if (event.type === "site_complete") {
                setSites((prev) => ({
                  ...prev,
                  [event.site]: {
                    ...prev[event.site],
                    status: "complete",
                  },
                }));
                // Accumulate cards from each completed site
                if (event.cards && Array.isArray(event.cards)) {
                  setResults((prev) => [...prev, ...event.cards]);
                }
              } else if (event.type === "site_error") {
                setSites((prev) => ({
                  ...prev,
                  [event.site]: {
                    ...prev[event.site],
                    status: "error",
                    error: event.error,
                  },
                }));
              } else if (event.type === "step") {
                // Legacy step event - ignore
              } else if (event.type === "complete") {
                setResults(event.cards || []);
                setLoading(false);
              } else if (event.type === "error") {
                throw new Error(event.error);
              }
            } catch (parseError) {
              console.error("Error parsing event:", parseError);
            }
          }
        }
      }
    } catch (err) {
      setError("Failed to compare credit cards. Please try again.");
      console.error(err);
      setLoading(false);
    }
  };

  const siteList = Object.values(sites);

  return (
    <div className="min-h-screen bg-[#F4F3F2]">
      <main className="max-w-3xl mx-auto px-6 py-20">
        
        {/* Header - Minimal */}
        <header className="mb-16">
          <h1 className="text-3xl font-medium tracking-tight text-[#1a1a1a] mb-2">
            Credit Card Finder
          </h1>
          <a 
            href="https://mino.ai" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-[#165762]/50 hover:text-[#D76228] transition-colors"
          >
            Powered by
            <span className="font-medium">mino.ai</span>
            <svg 
              className="h-3 w-3" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H7M17 7V17" />
            </svg>
          </a>
        </header>

        {/* Search Input */}
        <section className="mb-16">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-medium text-[#165762]/50 uppercase tracking-wider mb-3">
                Your Requirements
              </label>
              <Textarea
                placeholder="I want a credit card with KrisFlyer miles, no annual fee, and a good sign-up bonus..."
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                className="min-h-[140px] bg-white border-0 shadow-sm rounded-lg text-[#1a1a1a] placeholder:text-[#165762]/30 focus:ring-1 focus:ring-[#D76228]/50 resize-none"
              />
            </div>
            <Button
              type="submit"
              className="bg-[#D76228] hover:bg-[#c55620] text-white px-8 h-11 rounded-full font-medium"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                "Search"
              )}
            </Button>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </form>
        </section>

        {/* Search Progress */}
        {(loading || siteList.length > 0) && (
          <section className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xs font-medium text-[#165762]/50 uppercase tracking-wider">
                Sources
              </h2>
              {loading && (
                <span className="text-xs text-[#D76228]">Searching...</span>
              )}
            </div>
            
            {siteList.length === 0 ? (
              <p className="text-sm text-[#165762]/40">Initializing...</p>
            ) : (
              <div className="space-y-2">
                {siteList.filter(site => site.status !== "cancelled").map((site) => (
                  <div
                    key={site.name}
                    className="group relative"
                  >
                    <button
                      onClick={() => setSelectedSite(site.name)}
                      className="w-full flex items-center justify-between py-4 px-5 rounded-lg transition-all text-left bg-white shadow-sm hover:shadow-md"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-5 flex justify-center">
                          {site.status === "searching" && (
                            <Loader2 className="h-4 w-4 animate-spin text-[#D76228]" />
                          )}
                          {site.status === "complete" && (
                            <svg className="h-4 w-4 text-[#165762]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          {site.status === "error" && (
                            <X className="h-4 w-4 text-red-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm text-[#1a1a1a]">{site.name}</p>
                          <p className="text-xs text-[#165762]/40 mt-0.5">
                            {site.status === "searching" && `${site.steps.length} steps`}
                            {site.status === "complete" && "Complete"}
                            {site.status === "error" && "Failed"}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-[#165762]/20" />
                    </button>
                    
                    {/* Cancel button - positioned outside the card on the right */}
                    {site.status === "searching" && (
                      <button
                        onClick={() => {
                          setSites((prev) => ({
                            ...prev,
                            [site.name]: {
                              ...prev[site.name],
                              status: "cancelled",
                            },
                          }));
                        }}
                        className="absolute -right-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-2 rounded-full hover:bg-white hover:shadow-sm transition-all"
                        title="Skip this site"
                      >
                        <X className="h-4 w-4 text-[#165762]/30 hover:text-red-400" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Site Detail Modal */}
        {selectedSite && sites[selectedSite] && (
          <div 
            className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-6"
            onClick={() => setSelectedSite(null)}
          >
            <div 
              className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[70vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-[#F4F3F2]">
                <div className="flex items-center gap-3">
                  <div className="w-5">
                    {sites[selectedSite].status === "searching" && (
                      <Loader2 className="h-4 w-4 animate-spin text-[#D76228]" />
                    )}
                    {sites[selectedSite].status === "complete" && (
                      <svg className="h-4 w-4 text-[#165762]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {sites[selectedSite].status === "error" && (
                      <X className="h-4 w-4 text-red-400" />
                    )}
                  </div>
                  <h3 className="font-medium text-[#1a1a1a]">{selectedSite}</h3>
                </div>
                <button 
                  onClick={() => setSelectedSite(null)}
                  className="p-1.5 rounded-lg hover:bg-[#F4F3F2] transition-colors"
                >
                  <X className="h-4 w-4 text-[#165762]/40" />
                </button>
              </div>
              <div className="px-6 py-5 overflow-y-auto max-h-[50vh]">
                {sites[selectedSite].status === "error" && (
                  <div className="mb-4 p-4 bg-red-50 rounded-lg">
                    <p className="text-sm text-red-600">{sites[selectedSite].error}</p>
                  </div>
                )}
                {sites[selectedSite].steps.length === 0 ? (
                  <p className="text-sm text-[#165762]/40">Waiting...</p>
                ) : (
                  <div className="space-y-3">
                    {sites[selectedSite].steps.map((step, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="mt-2 h-1.5 w-1.5 rounded-full bg-[#D76228]/60 flex-shrink-0" />
                        <p className="text-sm text-[#1a1a1a]/80 leading-relaxed">{step}</p>
                      </div>
                    ))}
                    {sites[selectedSite].status === "searching" && (
                      <div className="flex items-center gap-3 pt-2">
                        <Loader2 className="h-3 w-3 animate-spin text-[#D76228]" />
                        <p className="text-sm text-[#165762]/40">Processing...</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <section>
            <h2 className="text-xs font-medium text-[#165762]/50 uppercase tracking-wider mb-6">
              Results
            </h2>
            <div className="space-y-4">
              {results.map((card, index) => (
                <article 
                  key={index} 
                  className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between mb-5">
                    <div>
                      <h3 className="text-lg font-medium text-[#1a1a1a]">{card.name}</h3>
                      {card.issuer && (
                        <p className="text-sm text-[#165762]/50 mt-1">{card.issuer}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-[#D76228]">#{index + 1}</span>
                      {card.source && (
                        <span className="text-xs text-[#165762]/40">{card.source}</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Card Details - Clean Grid */}
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-5">
                    {card.annualFee && (
                      <div>
                        <p className="text-xs text-[#165762]/40 mb-1">Annual Fee</p>
                        <p className="text-sm text-[#1a1a1a]">{card.annualFee}</p>
                      </div>
                    )}
                    {card.apr && (
                      <div>
                        <p className="text-xs text-[#165762]/40 mb-1">APR</p>
                        <p className="text-sm text-[#1a1a1a]">{card.apr}</p>
                      </div>
                    )}
                    {card.rewards && (
                      <div className="col-span-2">
                        <p className="text-xs text-[#165762]/40 mb-1">Rewards</p>
                        <p className="text-sm text-[#1a1a1a] leading-relaxed">{card.rewards}</p>
                      </div>
                    )}
                    {card.signUpBonus && (
                      <div className="col-span-2">
                        <p className="text-xs text-[#165762]/40 mb-1">Sign-up Bonus</p>
                        <p className="text-sm text-[#1a1a1a]">{card.signUpBonus}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Highlights */}
                  {Array.isArray(card.highlights) && card.highlights.length > 0 && (
                    <div className="pt-4 border-t border-[#F4F3F2]">
                      <div className="flex flex-wrap gap-2">
                        {card.highlights.map((highlight, i) => (
                          <span 
                            key={i} 
                            className="text-xs px-2.5 py-1 rounded-full bg-[#165762]/5 text-[#165762]/70"
                          >
                            {highlight}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}
        
        {/* Footer spacer */}
        <div className="h-20" />
      </main>
    </div>
  );
}
