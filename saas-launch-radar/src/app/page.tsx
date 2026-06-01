"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  Search, Rocket, Sparkles, Terminal as TerminalIcon, CheckCircle, 
  Layers, CreditCard, Users, ExternalLink, Globe, Cpu, RefreshCw, 
  ArrowRight, ShieldAlert, Loader2, ArrowUpRight
} from "lucide-react";

interface Candidate {
  title: string;
  snippet: string;
  url: string;
  domain: string;
}

interface ScrapedData {
  ProductName?: string;
  Tagline?: string;
  Description?: string;
  KeyFeatures?: string[];
  TargetAudience?: string[];
  PricingModels?: {
    tier: string;
    price: string;
    features?: string[];
  }[];
}

interface ProductDetails {
  candidate: Candidate;
  status: "idle" | "scraping" | "complete" | "failed";
  progress?: string;
  data?: ScrapedData;
  error?: string;
}

interface TerminalLog {
  text: string;
  type: "info" | "success" | "progress" | "error";
  timestamp: string;
}

const PREDEFINED_NICHES = [
  "Developer Tools",
  "AI Copilots",
  "Developer APIs",
  "Productivity",
  "Marketing Tech",
  "Data & Analytics"
];

export default function SaaSLaunchRadar() {
  const [selectedNiche, setSelectedNiche] = useState("Developer Tools");
  const [customNiche, setCustomNiche] = useState("");
  const [step, setStep] = useState<"idle" | "discovering" | "discover_complete" | "scraping" | "complete">("idle");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [products, setProducts] = useState<Record<string, ProductDetails>>({});
  const [logs, setLogs] = useState<TerminalLog[]>([]);
  const [activeTab, setActiveTab] = useState<string>("");

  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  const addLog = (text: string, type: "info" | "success" | "progress" | "error" = "info") => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { text, type, timestamp }]);
  };

  const handleDiscover = async (nicheToQuery: string) => {
    if (!nicheToQuery.trim()) return;
    setStep("discovering");
    setLogs([]);
    addLog(`$ tinyfish search "${nicheToQuery} SaaS launches"`, "info");
    addLog("📡 Fetching real-time indexes from live Product Hunt and HN logs...", "info");

    try {
      const response = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche: nicheToQuery })
      });

      if (!response.ok) {
        throw new Error("Failed to discover products");
      }

      const data = await response.json();
      const topCandidates: Candidate[] = data.candidates || [];

      setCandidates(topCandidates);
      
      if (topCandidates.length === 0) {
        addLog("⚠️ No recent launches discovered. Try another niche.", "error");
        setStep("idle");
        return;
      }

      addLog(`✓ Discovered ${topCandidates.length} candidate launches cleanly.`, "success");
      
      // Initialize products state
      const initialProducts: Record<string, ProductDetails> = {};
      topCandidates.forEach(c => {
        initialProducts[c.url] = {
          candidate: c,
          status: "idle"
        };
      });
      setProducts(initialProducts);
      setStep("discover_complete");
    } catch (err) {
      addLog(`❌ Discovery failed: ${err instanceof Error ? err.message : "Unknown error"}`, "error");
      setStep("idle");
    }
  };

  const handleScrapeAll = async () => {
    setStep("scraping");
    addLog("$ tinyfish agent deploy --parallel --extract-pricing", "info");
    addLog("🚀 Dispatching parallel browser agents to audit landing pages...", "info");

    const scrapePromises = candidates.map(async (candidate) => {
      setProducts(prev => ({
        ...prev,
        [candidate.url]: {
          ...prev[candidate.url],
          status: "scraping",
          progress: "Initializing browser agent..."
        }
      }));

      addLog(`[Agent] Initiating scrape for: ${candidate.title}`, "info");

      try {
        const response = await fetch("/api/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: candidate.url, title: candidate.title })
        });

        if (!response.ok) {
          throw new Error("Scraping connection failed");
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) throw new Error("No readable stream");

        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";

          for (const part of parts) {
            if (part.startsWith("data: ")) {
              try {
                const event = JSON.parse(part.slice(6));
                
                if (event.type === "STARTED") {
                  setProducts(prev => ({
                    ...prev,
                    [candidate.url]: {
                      ...prev[candidate.url],
                      progress: "Agent initialized"
                    }
                  }));
                } else if (event.type === "PROGRESS") {
                  setProducts(prev => ({
                    ...prev,
                    [candidate.url]: {
                      ...prev[candidate.url],
                      progress: event.purpose
                    }
                  }));
                  addLog(`[${candidate.title.slice(0, 12)}...] ${event.purpose}`, "progress");
                } else if (event.type === "COMPLETE") {
                  if (event.status === "COMPLETED") {
                    let parsedResult: ScrapedData = {};
                    try {
                      parsedResult = typeof event.result === "string" 
                        ? JSON.parse(event.result.replace(/```json\n?|```/g, "").trim())
                        : event.result;
                    } catch {
                      const jsonMatch = event.result.match(/\{[\s\S]*\}/);
                      if (jsonMatch) {
                        try { parsedResult = JSON.parse(jsonMatch[0]); } catch {}
                      }
                    }

                    setProducts(prev => ({
                      ...prev,
                      [candidate.url]: {
                        ...prev[candidate.url],
                        status: "complete",
                        data: parsedResult
                      }
                    }));
                    addLog(`✓ Audited ${candidate.title} successfully.`, "success");
                  } else {
                    setProducts(prev => ({
                      ...prev,
                      [candidate.url]: {
                        ...prev[candidate.url],
                        status: "failed",
                        error: event.error?.message || "Automation failed"
                      }
                    }));
                    addLog(`❌ Fail: ${candidate.title} (${event.error?.message || "Automation failed"})`, "error");
                  }
                  break; // Stream is complete, stop reading.
                }
              } catch (parseErr) {
                console.error("SSE parse error", parseErr);
              }
            }
          }
        }
      } catch (err) {
        setProducts(prev => ({
          ...prev,
          [candidate.url]: {
            ...prev[candidate.url],
            status: "failed",
            error: err instanceof Error ? err.message : "Unknown error"
          }
        }));
        addLog(`❌ Fail: ${candidate.title} (${err instanceof Error ? err.message : "Unknown error"})`, "error");
      }
    });

    await Promise.all(scrapePromises);
    addLog("✓ Sweep completed. Synthesizing visual matrices...", "success");
    setStep("complete");
    
    const completedUrl = candidates.find(c => c.url)?.url;
    if (completedUrl) setActiveTab(completedUrl);
  };

  const getActiveNiche = () => {
    return customNiche.trim() ? customNiche : selectedNiche;
  };

  return (
    <div className="flex-1 w-full min-h-screen bg-[#fafaf9] flex flex-col font-sans selection:bg-[#FF6700]/25 selection:text-[#0a0a0a]">
      
      {/* 1. Purple/Magenta Promo Banner */}
      <div className="w-full bg-gradient-to-r from-[#6d28d9] via-[#7c3aed] to-[#db2777] text-white text-center py-3 px-4 text-[13px] font-semibold flex items-center justify-center relative select-none">
        <span>Search and Fetch APIs free on every plan.</span>
        <a href="https://agent.tinyfish.ai/" target="_blank" rel="noopener noreferrer" className="ml-2 underline hover:text-white/90 flex items-center">
          Get started <span className="ml-0.5">→</span>
        </a>
      </div>

      {/* 2. Global Navigation Header */}
      <header className="w-full bg-white border-b border-[#000]/[0.08] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Logo */}
            <a href="#" className="flex items-center space-x-2">
              <svg className="h-6 w-6 text-[#FF6700]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.5h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
              </svg>
              <span className="font-extrabold text-xl tracking-tight text-[#0a0a0a]">
                Tiny<span className="text-[#FF6700]">Fish</span>
              </span>
            </a>
            <div className="h-4 w-[1px] bg-neutral-300"></div>
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest">
              Launch Radar
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-neutral-50 border border-neutral-200 px-3.5 py-1.5 rounded-[3px] text-xs font-bold text-neutral-700">
              <div className="h-2 w-2 rounded-full glow-dot-orange"></div>
              <span>Scout Active</span>
            </div>
            <a 
              href="https://agent.tinyfish.ai/api-keys" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="bg-[#0a0a0a] text-white hover:bg-[#FF6700] px-4 py-2 rounded-[3px] text-xs font-bold transition-colors shadow-sm"
            >
              Get API Key
            </a>
          </div>
        </div>
      </header>

      {/* 4. Split Hero Layout Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-10 sm:py-16 flex-1 flex flex-col justify-center relative">
        {/* Dotted Patterns in visual backgrounds */}
        <div className="absolute top-20 right-10 w-96 h-96 dots-pattern"></div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          
          {/* Left Column: Controls & Text */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            <span className="border border-[#FF6700]/30 text-[#FF6700] bg-[#FF6700]/5 px-2.5 py-1 text-[11px] uppercase tracking-wider font-extrabold rounded-sm mb-4">
              LAUNCH RADAR ENGINE
            </span>
            
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-[#0a0a0a] leading-[1.1] mb-6">
              Fresh SaaS intelligence. <br/>Never cached.
            </h2>
            
            <p className="text-base sm:text-lg text-neutral-600 leading-relaxed mb-8 max-w-xl">
              Autonomously discover active SaaS launches on Product Hunt, Hacker News, and launch logs. Spawn high-speed browser agents to clean pricing data, capabilities, and target audiences dynamically.
            </p>

            {step === "idle" && (
              <div className="w-full flex flex-col gap-4 mb-8">
                {/* Search Inputs */}
                <div className="w-full flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    <input
                      type="text"
                      placeholder="Enter custom niche... e.g. Developer Tools, B2B SaaS"
                      className="w-full bg-white border border-neutral-300 rounded-[3px] py-3.5 pl-11 pr-4 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-[#FF6700] transition-colors text-sm font-medium"
                      value={customNiche}
                      onChange={(e) => setCustomNiche(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={() => handleDiscover(getActiveNiche())}
                    className="boxy-button-primary px-8 py-3.5 text-sm font-bold flex items-center justify-center space-x-2"
                  >
                    <span>Try Search</span>
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                </div>

                {/* Predefined Niche Chips */}
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide mr-2">Featured:</span>
                  {PREDEFINED_NICHES.map((niche) => (
                    <button
                      key={niche}
                      onClick={() => {
                        setSelectedNiche(niche);
                        setCustomNiche("");
                        handleDiscover(niche);
                      }}
                      className={`px-3 py-1.5 rounded-[3px] text-xs font-bold transition-all border ${
                        selectedNiche === niche && !customNiche
                          ? "bg-[#0a0a0a] border-[#0a0a0a] text-white"
                          : "bg-transparent border-neutral-300 text-neutral-700 hover:border-neutral-400"
                      }`}
                    >
                      {niche}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === "discover_complete" && (
              <div className="w-full flex flex-col gap-4 mb-8">
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-[3px] text-sm text-emerald-800 font-semibold mb-2">
                  ✓ Found {candidates.length} launches in "{getActiveNiche()}". Ready for landing page audit.
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setStep("idle")}
                    className="boxy-button-secondary px-6 py-3.5 text-sm font-bold"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleScrapeAll}
                    className="boxy-button-primary px-8 py-3.5 text-sm font-bold flex items-center space-x-2"
                  >
                    <Cpu className="h-4 w-4 text-emerald-400 animate-pulse" />
                    <span>Run Audits</span>
                  </button>
                </div>
              </div>
            )}

            {(step === "complete" || step === "scraping" || step === "discovering") && (
              <button
                onClick={() => setStep("idle")}
                className="boxy-button-secondary px-6 py-3 text-xs font-extrabold uppercase tracking-wider mb-8"
              >
                ← Back to Scout
              </button>
            )}

            {/* Dotted blockquote callout matching visual mockup */}
            <div className="w-full orange-highlight-border p-4 rounded-r-[3px] text-xs leading-relaxed text-neutral-600 font-medium">
              <span className="font-extrabold text-[#0a0a0a]">Free API access for agents.</span> Built for real-time pricing sweeps, feature aggregation, market monitoring, and competitor intel.
            </div>

          </div>

          {/* Right Column: Code Snippet Console / Terminal Stream */}
          <div className="lg:col-span-5 flex flex-col w-full h-[400px] relative">
            <div className="w-full h-full console-term p-4 flex flex-col border border-neutral-800 shadow-2xl relative z-10">
              
              {/* Fake Terminal Header */}
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-3">
                <div className="flex items-center space-x-2 text-[10px] uppercase font-bold tracking-widest text-[#FF6700]/70">
                  <TerminalIcon className="h-3.5 w-3.5" />
                  <span>Agent Logger Stream</span>
                </div>
                <div className="flex space-x-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-neutral-800"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-neutral-800"></div>
                  <div className={`w-2.5 h-2.5 rounded-full ${step === "scraping" || step === "discovering" ? "glow-dot-orange" : "bg-neutral-800"}`}></div>
                </div>
              </div>

              {/* Stream Logs Output */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
                {logs.length > 0 ? (
                  logs.map((log, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <span className="text-[9px] text-neutral-600 select-none">[{log.timestamp}]</span>
                      <span 
                        className={`${
                          log.type === "success" ? "text-emerald-400 font-bold" : 
                          log.type === "error" ? "text-rose-400 font-bold" : 
                          log.type === "progress" ? "text-neutral-400 italic" : "text-neutral-200"
                        }`}
                      >
                        {log.text}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex items-center justify-center text-center p-4">
                    <p className="text-neutral-500 font-mono text-[11px] leading-relaxed">
                      $ tinyfish agent scout --idle <br/>
                      <span className="opacity-50">Waiting for niche search trigger. Deploy search to activate stream.</span>
                    </p>
                  </div>
                )}
                <div ref={terminalEndRef} />
              </div>

            </div>
            
            {/* Visual offset background card block like Nvidia container */}
            <div className="absolute -bottom-3 -right-3 w-full h-full border border-neutral-300 rounded-lg -z-0 bg-white/40 pointer-events-none"></div>
          </div>

        </div>

        {/* 5. Complete state Dashboard */}
        {step === "complete" && (
          <div className="w-full mt-16 border-t border-[#000]/[0.08] pt-12 flex flex-col md:flex-row gap-8 items-stretch relative z-10 animate-fade-in">
            
            {/* Sidebar list */}
            <div className="w-full md:w-80 flex flex-col gap-3">
              <div className="bg-white border border-[#000]/[0.08] p-4 rounded-[3px] shadow-sm">
                <h4 className="text-[10px] font-extrabold text-[#FF6700] uppercase tracking-wider mb-4">Launches scouted</h4>
                <div className="flex flex-col gap-2">
                  {candidates.map((c) => {
                    const prod = products[c.url];
                    const isCompleted = prod?.status === "complete";
                    
                    return (
                      <button
                        key={c.url}
                        onClick={() => isCompleted && setActiveTab(c.url)}
                        disabled={!isCompleted}
                        className={`w-full text-left p-3.5 border rounded-[3px] transition-all flex items-center justify-between ${
                          activeTab === c.url
                            ? "bg-[#0a0a0a] border-[#0a0a0a] text-white"
                            : "bg-transparent border-[#000]/[0.08] text-[#0a0a0a] hover:bg-neutral-50"
                        }`}
                      >
                        <div className="flex-1 pr-2 overflow-hidden">
                          <div className="font-bold text-sm truncate">
                            {prod?.data?.ProductName || c.title}
                          </div>
                          <div className={`text-[10px] truncate font-semibold mt-0.5 ${activeTab === c.url ? "text-[#FF6700]" : "text-[#FF6700]"}`}>
                            {c.domain}
                          </div>
                        </div>
                        <div>
                          {isCompleted && <CheckCircle className={`h-4 w-4 ${activeTab === c.url ? "text-emerald-400" : "text-[#FF6700]"}`} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Display audit details */}
            <div className="flex-1">
              {activeTab && products[activeTab]?.data ? (
                <div className="bg-white border border-[#000]/[0.08] p-6 md:p-8 rounded-[3px] shadow-md flex flex-col gap-8">
                  
                  {/* Title tagline description */}
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between border-b border-[#000]/[0.08] pb-6 gap-4">
                    <div className="flex-1">
                      <h2 className="text-3xl font-extrabold text-[#0a0a0a] tracking-tight mb-2">
                        {products[activeTab].data?.ProductName}
                      </h2>
                      <p className="text-base text-[#FF6700] font-bold mb-4">
                        {products[activeTab].data?.Tagline}
                      </p>
                      <p className="text-sm text-neutral-600 leading-relaxed max-w-3xl font-medium">
                        {products[activeTab].data?.Description}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <a
                        href={products[activeTab].candidate.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-[#0a0a0a] text-white hover:bg-neutral-800 text-xs font-bold px-4 py-2.5 rounded-[3px] transition-colors flex items-center space-x-2"
                      >
                        <Globe className="h-4 w-4" />
                        <span>Launch page</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>

                  {/* Core checklist */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Features */}
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center space-x-2 border-b border-[#000]/[0.05] pb-2">
                        <Layers className="h-4.5 w-4.5 text-[#FF6700]" />
                        <h4 className="text-xs font-extrabold text-[#0a0a0a] uppercase tracking-wider">Features aggregates</h4>
                      </div>
                      <ul className="space-y-2.5">
                        {products[activeTab].data?.KeyFeatures?.map((feature, idx) => (
                          <li key={idx} className="flex items-start space-x-3 text-sm text-neutral-600 font-medium">
                            <CheckCircle className="h-4 w-4 text-[#FF6700] mt-0.5 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        )) || <li className="text-xs text-neutral-400 italic">No feature data.</li>}
                      </ul>
                    </div>

                    {/* Audience */}
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center space-x-2 border-b border-[#000]/[0.05] pb-2">
                        <Users className="h-4.5 w-4.5 text-[#FF6700]" />
                        <h4 className="text-xs font-extrabold text-[#0a0a0a] uppercase tracking-wider">Audience segment</h4>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {products[activeTab].data?.TargetAudience?.map((audience, idx) => (
                          <span key={idx} className="px-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-[3px] text-xs font-bold text-[#0a0a0a]">
                            {audience}
                          </span>
                        )) || <span className="text-xs text-neutral-400 italic">No audience data.</span>}
                      </div>
                    </div>
                  </div>

                  {/* Pricing Matrix */}
                  <div className="flex flex-col gap-5 border-t border-[#000]/[0.08] pt-6">
                    <div className="flex items-center space-x-2 pb-2">
                      <CreditCard className="h-4.5 w-4.5 text-[#FF6700]" />
                      <h4 className="text-xs font-extrabold text-[#0a0a0a] uppercase tracking-wider">Audited pricing matrix</h4>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {products[activeTab].data?.PricingModels?.map((plan, idx) => (
                        <div key={idx} className="bg-neutral-50 border border-neutral-200 p-5 rounded-[3px] flex flex-col justify-between hover:border-neutral-300 transition-colors">
                          <div className="mb-4">
                            <span className="px-2.5 py-1 bg-white border border-neutral-200 rounded-[3px] text-[10px] font-extrabold text-neutral-600 uppercase tracking-wide">
                              {plan.tier}
                            </span>
                            <div className="text-2xl font-black text-[#0a0a0a] mt-3 mb-1">
                              {plan.price}
                            </div>
                          </div>
                          {plan.features && plan.features.length > 0 && (
                            <div className="border-t border-neutral-200 pt-3">
                              <ul className="space-y-1.5">
                                {plan.features.slice(0, 3).map((f, fIdx) => (
                                  <li key={fIdx} className="text-xs text-neutral-500 flex items-center space-x-1.5 truncate">
                                    <div className="h-1.5 w-1.5 rounded-full bg-[#FF6700]"></div>
                                    <span>{f}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )) || <div className="text-xs text-neutral-400 italic">No plans parsed.</div>}
                    </div>
                  </div>

                </div>
              ) : (
                <div className="bg-white border border-[#000]/[0.08] p-12 rounded-[3px] flex items-center justify-center text-center shadow-sm">
                  <p className="text-xs text-neutral-400">Select a candidate on the sidebar to display auditing intelligence.</p>
                </div>
              )}
            </div>

          </div>
        )}
      </main>

      {/* 6. Footer */}
      <footer className="w-full bg-white border-t border-[#000]/[0.08] py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 text-center">
          <p className="text-[10px] font-extrabold text-neutral-400 tracking-wider uppercase">
            © 2026 TinyFish Inc. · SaaS Launch Radar · All Rights Reserved
          </p>
        </div>
      </footer>
    </div>
  );
}
