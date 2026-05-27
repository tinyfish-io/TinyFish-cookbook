"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Search, Home as HomeIcon, TrendingDown, ExternalLink, Eye, EyeOff, ListFilter, Sparkles, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GridBackground } from "@/components/ui/background-snippets";

// Singapore HDB Towns
const HDB_TOWNS = [
  "Ang Mo Kio", "Bedok", "Bishan", "Bukit Batok", "Bukit Merah",
  "Bukit Panjang", "Choa Chu Kang", "Clementi", "Geylang", "Hougang",
  "Jurong East", "Jurong West", "Kallang/Whampoa", "Marine Parade",
  "Pasir Ris", "Punggol", "Queenstown", "Sembawang", "Sengkang",
  "Serangoon", "Tampines", "Toa Payoh", "Woodlands", "Yishun"
];

const FLAT_TYPES = [
  { value: "2-room", label: "2-Room" },
  { value: "3-room", label: "3-Room" },
  { value: "4-room", label: "4-Room" },
  { value: "5-room", label: "5-Room" },
  { value: "executive", label: "Executive" },
];

interface AgentStatus {
  id: number;
  url: string;
  status: "launching" | "navigating" | "extracting" | "complete" | "error";
  streamingUrl?: string;
  steps: string[];
  result?: unknown;
  error?: string;
}

interface RawListing {
  address?: string;
  block?: string;
  street?: string;
  town?: string;
  flatType?: string;
  floorLevel?: string;
  sqft?: string;
  askingPrice?: number | string;
  price?: number | string;
  timePosted?: string;
  agentName?: string;
  agentPhone?: string;
  listingUrl?: string;
  source?: string;
  agentId?: number;
}

interface DealResult {
  address: string;
  town: string;
  flatType: string;
  askingPrice: number;
  marketValue?: number;
  discountPercent?: number;
  timePosted?: string;
  agentName?: string;
  agentPhone?: string;
  listingUrl?: string;
  reasoning?: string;
}

type SearchPhase = "idle" | "generating_urls" | "scraping" | "analyzing" | "complete" | "error";

export default function HomePage() {
  const [town, setTown] = useState("");
  const [flatType, setFlatType] = useState("4-room");
  const [discountThreshold, setDiscountThreshold] = useState("10");
  
  const [phase, setPhase] = useState<SearchPhase>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [rawListings, setRawListings] = useState<RawListing[]>([]);
  const [deals, setDeals] = useState<DealResult[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentStatus | null>(null);
  const [showAgentGrid, setShowAgentGrid] = useState(true);
  const [error, setError] = useState("");
  
  const resultsEndRef = useRef<HTMLDivElement>(null);

  // Filter listings by selected flat type
  const filteredListings = useMemo(() => {
    if (!flatType) return rawListings;
    
    return rawListings.filter(listing => {
      // If listing has no flat type, include it (might be relevant)
      if (!listing.flatType) return true;
      
      // Normalize both for comparison (handle "4-Room", "4 room", "4-room", etc.)
      const listingType = listing.flatType.toLowerCase().replace(/[\s-]/g, '');
      const selectedType = flatType.toLowerCase().replace(/[\s-]/g, '');
      
      // Check for match (e.g., "4room" matches "4room")
      return listingType.includes(selectedType) || selectedType.includes(listingType);
    });
  }, [rawListings, flatType]);

  // Auto-scroll results when new listings come in
  useEffect(() => {
    if (resultsEndRef.current) {
      resultsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [filteredListings]);

  // Extract listings from agent result
  const extractListings = useCallback((result: unknown, agentId: number): RawListing[] => {
    let listings: Array<Record<string, unknown>> = [];

    if (Array.isArray(result)) {
      listings = result;
    } else if (typeof result === "object" && result !== null) {
      const resultObj = result as Record<string, unknown>;
      if (resultObj.listings && Array.isArray(resultObj.listings)) {
        listings = resultObj.listings as Array<Record<string, unknown>>;
      } else {
        for (const key of Object.keys(resultObj)) {
          if (Array.isArray(resultObj[key])) {
            listings = resultObj[key] as Array<Record<string, unknown>>;
            break;
          }
        }
      }
    }

    return listings.map(l => ({
      ...l,
      agentId,
      source: agents[agentId]?.url ? new URL(agents[agentId].url).hostname : `Agent ${agentId + 1}`,
    }));
  }, [agents]);

  const handleSearch = useCallback(async () => {
    if (!town) return;

    // Reset state
    setPhase("generating_urls");
    setStatusMessage("Asking Gemini to generate property listing URLs...");
    setAgents([]);
    setRawListings([]);
    setDeals([]);
    setError("");

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          town,
          flatType,
          discountThreshold: parseInt(discountThreshold),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          try {
            const event = JSON.parse(line.slice(6));

            switch (event.type) {
              case "PHASE":
                setPhase(event.phase);
                setStatusMessage(event.message);
                break;

              case "GEMINI_THINKING":
                setStatusMessage(event.message);
                break;

              case "GEMINI_SUCCESS":
                setStatusMessage(event.message);
                break;

              case "GEMINI_FALLBACK":
                setStatusMessage(event.message);
                break;

              case "FALLBACK_URLS":
                setStatusMessage(event.message);
                break;

              case "URLS_GENERATED":
                setStatusMessage(`Generated ${event.urls.length} URLs to scan`);
                const initialAgents: AgentStatus[] = event.urls.map((url: string, i: number) => ({
                  id: i,
                  url,
                  status: "launching",
                  steps: [],
                }));
                setAgents(initialAgents);
                break;

              case "AGENT_STATUS":
                setAgents(prev => prev.map(agent => 
                  agent.id === event.agentId 
                    ? { 
                        ...agent, 
                        status: event.status,
                        streamingUrl: event.streamingUrl || agent.streamingUrl,
                      }
                    : agent
                ));
                break;

              case "AGENT_STEP":
                setAgents(prev => prev.map(agent =>
                  agent.id === event.agentId
                    ? { ...agent, steps: [...agent.steps, event.step] }
                    : agent
                ));
                break;

              case "AGENT_COMPLETE":
                setAgents(prev => prev.map(agent =>
                  agent.id === event.agentId
                    ? { ...agent, status: "complete", result: event.result }
                    : agent
                ));
                // Add raw listings from this agent immediately
                if (event.result) {
                  const listings = extractListings(event.result, event.agentId);
                  if (listings.length > 0) {
                    setRawListings(prev => [...prev, ...listings]);
                  }
                }
                break;

              case "AGENT_ERROR":
                setAgents(prev => prev.map(agent =>
                  agent.id === event.agentId
                    ? { ...agent, status: "error", error: event.error }
                    : agent
                ));
                break;

              case "DEALS_FOUND":
                setDeals(event.deals);
                break;

              case "COMPLETE":
                setPhase("complete");
                setStatusMessage(`Found ${event.dealCount} underpriced listings!`);
                break;

              case "ERROR":
                setPhase("error");
                setError(event.message);
                break;
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    } catch (err) {
      setPhase("error");
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }, [town, flatType, discountThreshold, extractListings]);

  const getStatusBadge = (status: AgentStatus["status"]) => {
    switch (status) {
      case "launching":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-accent/20 text-accent-foreground text-[9px] font-medium border border-accent/30">
            <span className="h-1 w-1 rounded-full bg-accent animate-pulse" />
            Launch
          </span>
        );
      case "navigating":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-500/20 text-blue-600 text-[9px] font-medium border border-blue-500/30">
            <span className="h-1 w-1 rounded-full bg-blue-500 animate-pulse" />
            Navigate
          </span>
        );
      case "extracting":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-600 text-[9px] font-medium border border-amber-500/30">
            <span className="h-1 w-1 rounded-full bg-amber-500 animate-pulse" />
            Extract
          </span>
        );
      case "complete":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-600 text-[9px] font-medium border border-emerald-500/30">
            <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Done
          </span>
        );
      case "error":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-destructive/20 text-destructive text-[9px] font-medium border border-destructive/30">
            <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Error
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground text-[9px] font-medium border border-border">
            Pending
          </span>
        );
    }
  };

  const formatPrice = (price: unknown): string => {
    if (!price) return "-";
    const num = typeof price === "number" ? price : parseInt(String(price).replace(/[^0-9]/g, ""));
    if (isNaN(num) || num === 0) return "-";
    return `$${num.toLocaleString()}`;
  };

  const isSearching = phase !== "idle" && phase !== "complete" && phase !== "error";

  return (
    <div className="min-h-screen relative">
      {/* Background */}
      <GridBackground />
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-card border-b border-border">
        <div className="px-6 py-3 flex items-center justify-between">
          {/* Logo & Title - Left */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
              <HomeIcon className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-semibold text-foreground tracking-tight">HDB Deal Sniper</h1>
              <p className="text-[10px] text-muted-foreground">Find underpriced resale flats</p>
            </div>
          </div>
          
          {/* Status Indicator - Right */}
          <div className="flex items-center gap-4">
            {isSearching && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary text-primary-foreground"
              >
                <div className="h-2 w-2 rounded-full bg-primary-foreground animate-pulse" />
                <span className="text-xs font-medium">Scanning...</span>
              </motion.div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content - Split Layout */}
      <div className="flex h-screen pt-16">
        {/* Left Panel - Search & Agents */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Search Form */}
          <div className="bg-card rounded-2xl border border-border shadow-sm mb-6 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
                  <Search className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground">Find HDB Deals</h2>
                  <p className="text-xs text-muted-foreground">Search for underpriced resale flats</p>
                </div>
              </div>
              
              <div className="grid gap-6 md:grid-cols-3 mb-6">
                {/* Town Select */}
                <div className="space-y-2">
                  <Label htmlFor="town" className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Location</Label>
                  <Select value={town} onValueChange={setTown} disabled={isSearching}>
                    <SelectTrigger className="bg-muted border-0 h-11 rounded-xl text-sm">
                      <SelectValue placeholder="Select town..." />
                    </SelectTrigger>
                    <SelectContent>
                      {HDB_TOWNS.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Flat Type */}
                <div className="space-y-2">
                  <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Flat Type</Label>
                  <div className="flex gap-2 h-11 items-center">
                    {FLAT_TYPES.slice(1, 4).map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => !isSearching && setFlatType(type.value)}
                        disabled={isSearching}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          flatType === type.value 
                            ? "bg-foreground text-background" 
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Discount */}
                <div className="space-y-2">
                  <Label htmlFor="discount" className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Min Discount</Label>
                  <div className="flex items-center gap-2 bg-muted rounded-xl px-4 h-11">
                    <Input
                      id="discount"
                      type="number"
                      min="1"
                      max="50"
                      value={discountThreshold}
                      onChange={(e) => setDiscountThreshold(e.target.value)}
                      className="bg-transparent border-0 p-0 w-12 h-auto text-sm font-medium focus-visible:ring-0"
                      disabled={isSearching}
                    />
                    <span className="text-sm text-muted-foreground">% below market</span>
                  </div>
                </div>
              </div>

              {/* Search Button */}
              <Button
                onClick={handleSearch}
                disabled={isSearching || !town}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 rounded-xl text-sm font-medium"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scanning property sites...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Find Deals
                  </>
                )}
              </Button>

              {error && phase === "error" && (
                <p className="mt-4 text-sm text-destructive">{error}</p>
              )}
            </div>
          </div>

          {/* Status */}
          {phase !== "idle" && (
            <div className="bg-card border border-border rounded-lg p-3 mb-4 flex items-center gap-2">
              {isSearching && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
              <span className="text-xs font-medium text-foreground">{statusMessage}</span>
              {agents.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAgentGrid(!showAgentGrid)}
                  className="ml-auto h-6 text-xs"
                >
                  {showAgentGrid ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
                  {showAgentGrid ? "Hide" : "Show"} Agents
                </Button>
              )}
            </div>
          )}

          {/* Agent Grid */}
          <AnimatePresence>
          {agents.length > 0 && showAgentGrid && (
            <motion.div 
              className="mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="p-5 rounded-lg bg-card border border-border">
                {/* Section Header */}
                <motion.div 
                  className="flex items-center justify-between mb-4"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Live Agents</h3>
                      <p className="text-[10px] text-muted-foreground">
                        {agents.filter(a => a.status === "complete").length} of {agents.length} complete
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted border border-border">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                      <span className="text-[10px] font-medium text-muted-foreground">Live</span>
                    </div>
                  </div>
                </motion.div>

                {/* Agent Cards Grid */}
                <motion.div 
                  className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: { opacity: 0 },
                    visible: {
                      opacity: 1,
                      transition: {
                        staggerChildren: 0.08,
                        delayChildren: 0.1
                      }
                    }
                  }}
                >
                {agents.map((agent) => {
                  const isActive = agent.status === "navigating" || agent.status === "extracting";
                  const isComplete = agent.status === "complete";
                  const isError = agent.status === "error";
                  
                  return (
                    <motion.div 
                      key={agent.id}
                      variants={{
                        hidden: { opacity: 0, y: 20, scale: 0.95 },
                        visible: { 
                          opacity: 1, 
                          y: 0, 
                          scale: 1,
                          transition: {
                            type: "spring",
                            stiffness: 300,
                            damping: 24
                          }
                        }
                      }}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      className={`group relative rounded-lg overflow-hidden cursor-pointer transition-all duration-300 border ${
                        isActive ? "border-primary shadow-md" :
                        isComplete ? "border-primary" :
                        isError ? "border-destructive" :
                        "border-border hover:border-primary"
                      }`}
                      onClick={() => setSelectedAgent(agent)}
                    >
                      {/* Browser Preview */}
                      <div className="aspect-[4/3] bg-foreground relative">
                        {agent.streamingUrl ? (
                          <iframe
                            src={agent.streamingUrl}
                            className="w-full h-full border-0"
                            allow="autoplay; fullscreen"
                            allowFullScreen
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                            {(agent.status === "launching" || agent.status === "navigating" || agent.status === "extracting") && (
                              <>
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                <span className="text-[10px] text-muted-foreground capitalize">{agent.status}...</span>
                              </>
                            )}
                            {isComplete && (
                              <div className="flex flex-col items-center gap-1">
                                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                                  <svg className="h-4 w-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                                <span className="text-[10px] text-primary">Complete</span>
                              </div>
                            )}
                            {isError && (
                              <div className="flex flex-col items-center gap-1">
                                <div className="h-8 w-8 rounded-full bg-destructive flex items-center justify-center">
                                  <svg className="h-4 w-4 text-destructive-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </div>
                                <span className="text-[10px] text-destructive">Failed</span>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Live indicator */}
                        {isActive && (
                          <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-card border border-border px-2 py-1 rounded-full">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                            <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wide">Live</span>
                          </div>
                        )}
                        
                        {/* Open in new tab */}
                        {agent.streamingUrl && (
                          <a
                            href={agent.streamingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="absolute top-2 right-2 bg-foreground text-background text-[9px] px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                          >
                            <ExternalLink className="h-2.5 w-2.5" />
                            Open
                          </a>
                        )}
                      </div>
                      
                      {/* Card Footer */}
                      <div className="bg-card p-3 border-t border-border">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-foreground">Agent {agent.id + 1}</span>
                          {getStatusBadge(agent.status)}
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {new URL(agent.url).hostname.replace('www.', '')}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
              </div>
            </motion.div>
          )}
          </AnimatePresence>

          {/* Empty State */}
          {phase === "idle" && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="rounded-lg bg-card border border-border p-12 text-center"
            >
              <div className="mx-auto mb-4 h-16 w-16 rounded-lg bg-primary flex items-center justify-center">
                <HomeIcon className="h-7 w-7 text-primary-foreground" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2 tracking-tight">Find Your Dream HDB Deal</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                Select a town above to search for underpriced HDB resale listings. Our AI agents will scan 10 property sites simultaneously.
              </p>
              <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-primary" />
                  <span>10 AI Agents</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>Real-time Results</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-primary" />
                  <span>Deal Analysis</span>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Right Panel - Live Results Sidebar */}
        <div className="w-96 bg-card border-l border-border flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListFilter className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm text-foreground">Live Results</span>
              </div>
              {rawListings.length > 0 && (
                <div className="flex items-center gap-1">
                  <Badge className="bg-primary text-primary-foreground text-[10px]">
                    {filteredListings.length} {flatType}
                  </Badge>
                  {filteredListings.length !== rawListings.length && (
                    <span className="text-[9px] text-muted-foreground">
                      ({rawListings.length} total)
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Results List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredListings.length === 0 && phase === "idle" && (
              <div className="text-center py-12 text-muted-foreground">
                <TrendingDown className="h-8 w-8 mx-auto mb-2" />
                <p className="text-xs">Results will appear here as agents extract listings</p>
              </div>
            )}

            {filteredListings.length === 0 && isSearching && (
              <div className="text-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Waiting for results...</p>
              </div>
            )}
            
            {filteredListings.length === 0 && rawListings.length > 0 && !isSearching && (
              <div className="text-center py-12 text-muted-foreground">
                <HomeIcon className="h-8 w-8 mx-auto mb-2" />
                <p className="text-xs">No {flatType} listings found</p>
                <p className="text-[10px] mt-1">{rawListings.length} other listings available</p>
              </div>
            )}

            <AnimatePresence mode="popLayout">
              {filteredListings.map((listing, i) => (
                <motion.div
                  key={`${listing.address}-${listing.askingPrice}-${i}`}
                  initial={{ opacity: 0, x: 20, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -20, scale: 0.95 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 400, 
                    damping: 25,
                    delay: i * 0.05
                  }}
                  layout
                >
                  <Card className="border border-border shadow-none hover:shadow-sm transition-shadow">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">
                            {listing.address || listing.block || "Unknown Address"}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {listing.source}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[9px] shrink-0 ml-2">
                          {listing.flatType || flatType}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-lg font-semibold text-primary">
                          {formatPrice(listing.askingPrice || listing.price)}
                        </span>
                        {listing.timePosted && (
                          <span className="text-[10px] text-muted-foreground/70">
                            {listing.timePosted}
                          </span>
                        )}
                      </div>

                      {(listing.sqft || listing.floorLevel) && (
                        <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground">
                          {listing.sqft && <span>{listing.sqft} sqft</span>}
                          {listing.floorLevel && <span>Floor: {listing.floorLevel}</span>}
                        </div>
                      )}

                      {(listing.agentName || listing.listingUrl) && (
                        <div className="mt-2 pt-2 border-t border-border flex items-center justify-between">
                          {listing.agentName && (
                            <p className="text-[10px] text-muted-foreground">
                              {listing.agentName} {listing.agentPhone && `• ${listing.agentPhone}`}
                            </p>
                          )}
                          {listing.listingUrl && (
                            <a
                              href={listing.listingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-primary hover:underline flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              View Listing
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
            
            <div ref={resultsEndRef} />
          </div>

          {/* Analyzed Deals Section */}
          {deals.length > 0 && (
            <div className="border-t border-border p-3 bg-primary">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="h-4 w-4 text-primary-foreground" />
                <span className="font-medium text-sm text-primary-foreground">
                  🔥 {deals.length} Underpriced Deals Found!
                </span>
              </div>
              <p className="text-[10px] text-primary-foreground">
                Gemini analyzed listings and found {deals.length} below market value
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Agent Detail Dialog */}
      <Dialog open={!!selectedAgent} onOpenChange={() => setSelectedAgent(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Agent {selectedAgent ? selectedAgent.id + 1 : ""} 
              {selectedAgent && getStatusBadge(selectedAgent.status)}
            </DialogTitle>
          </DialogHeader>
          {selectedAgent && (
            <div className="space-y-3">
              <div className="aspect-video bg-foreground rounded-lg overflow-hidden relative">
                {selectedAgent.streamingUrl ? (
                  <>
                    <iframe
                      src={selectedAgent.streamingUrl}
                      className="w-full h-full border-0"
                      allow="autoplay; fullscreen"
                      allowFullScreen
                    />
                    <a
                      href={selectedAgent.streamingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      New Tab
                    </a>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-background/50">
                    {selectedAgent.status === "complete" ? (
                      <span>✓ Session completed</span>
                    ) : selectedAgent.status === "error" ? (
                      <span className="text-destructive">{selectedAgent.error}</span>
                    ) : (
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    )}
                  </div>
                )}
              </div>
              
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">URL:</span> {selectedAgent.url}
              </div>

              {selectedAgent.steps.length > 0 && (
                <div className="max-h-24 overflow-y-auto bg-muted rounded p-2">
                  <p className="text-[10px] font-medium text-muted-foreground mb-1">Activity Log</p>
                  {selectedAgent.steps.slice(-5).map((step, i) => (
                    <p key={i} className="text-[10px] text-foreground/70">→ {step}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
