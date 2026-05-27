"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Trash2, Sparkles, Link as LinkIcon, Loader2, Search } from "lucide-react";
import type { Sector } from "@/types/tender";

interface LinkConfigPageProps {
  sector: Sector;
  onBack: () => void;
  onStartSearch: (links: string[]) => void;
}

const FALLBACK_LINKS = [
  "https://www.gebiz.gov.sg/",
  "https://www.tendersontime.com/singapore-tenders/",
  "https://www.biddetail.com/singapore-tenders",
  "https://www.tendersinfo.com/global-singapore-tenders.php",
  "https://www.globaltenders.com/government-tenders-singapore",
];

export function LinkConfigPage({ sector, onBack, onStartSearch }: LinkConfigPageProps) {
  const [customLinks, setCustomLinks] = useState<string[]>([""]);
  const [isSearchingCustom, setIsSearchingCustom] = useState(false);
  const [isSearchingAI, setIsSearchingAI] = useState(false);

  const addCustomLink = () => setCustomLinks([...customLinks, ""]);
  const updateCustomLink = (index: number, value: string) => {
    const updated = [...customLinks];
    updated[index] = value;
    setCustomLinks(updated);
  };
  const removeCustomLink = (index: number) => {
    if (customLinks.length > 1) setCustomLinks(customLinks.filter((_, i) => i !== index));
  };

  const fetchLinks = async (): Promise<string[]> => {
    try {
      const res = await fetch("/api/discover-links");
      const data = await res.json();
      return data.links?.map((l: { url: string }) => l.url) || FALLBACK_LINKS;
    } catch {
      return FALLBACK_LINKS;
    }
  };

  const handleSearchWithCustomLinks = async () => {
    const valid = customLinks.filter((l) => l.trim() !== "");
    if (valid.length === 0) return;
    setIsSearchingCustom(true);
    try {
      const aiLinks = await fetchLinks();
      onStartSearch([...new Set([...valid, ...aiLinks])]);
    } finally {
      setIsSearchingCustom(false);
    }
  };

  const handleSearchWithAIOnly = async () => {
    setIsSearchingAI(true);
    try {
      const links = await fetchLinks();
      onStartSearch(links);
    } finally {
      setIsSearchingAI(false);
    }
  };

  const validLinksCount = customLinks.filter((l) => l.trim()).length;
  const isLoading = isSearchingCustom || isSearchingAI;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="w-full max-w-3xl mx-auto px-4 py-6"
    >
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-primary/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Configure Search</h2>
          <p className="text-muted-foreground">
            Search tender sources for{" "}
            <span className="text-primary font-medium">{sector}</span>
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Custom Links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-xl p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <LinkIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Search with Your Links</h3>
              <p className="text-sm text-muted-foreground">Add your tender websites + default links</p>
            </div>
          </div>

          <div className="space-y-3">
            {customLinks.map((link, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  placeholder="https://example.com/tenders"
                  value={link}
                  onChange={(e) => updateCustomLink(index, e.target.value)}
                  disabled={isLoading}
                  className="flex-1 px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  onClick={() => removeCustomLink(index)}
                  disabled={isLoading}
                  className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </div>

          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={addCustomLink}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Link
            </button>
            <button
              onClick={handleSearchWithCustomLinks}
              disabled={validLinksCount === 0 || isLoading}
              className="ml-auto flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isSearchingCustom ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Searching...</>
              ) : (
                <><Search className="w-4 h-4" /> Search</>
              )}
            </button>
          </div>
        </motion.div>

        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-muted-foreground text-sm font-medium">OR</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* AI Only */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Search Default Sources</h3>
            </div>
            <button
              onClick={handleSearchWithAIOnly}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isSearchingAI ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Loading...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Search with AI</>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
