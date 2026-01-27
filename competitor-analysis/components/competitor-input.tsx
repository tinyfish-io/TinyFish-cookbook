"use client";

import { useState, useCallback, useRef } from "react";
import { Plus, Minus, Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CompetitorRow {
  id: string;
  name: string;
  url: string;
}

interface CompetitorInputProps {
  onStartScraping: (competitors: { name: string; url?: string }[]) => void;
  isLoading?: boolean;
  existingCompetitors?: string[];
}

const SUGGESTED = ["Manus AI", "Devin AI", "Lindy AI", "GitHub Copilot", "Cursor AI", "Replit Agent"];

export function CompetitorInput({ onStartScraping, isLoading, existingCompetitors = [] }: CompetitorInputProps) {
  const [rows, setRows] = useState<CompetitorRow[]>([
    { id: "1", name: "", url: "" }
  ]);
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  // Focus newly added row
  const focusRow = useCallback((id: string) => {
    setTimeout(() => {
      inputRefs.current.get(id)?.focus();
    }, 0);
  }, []);

  // Add a new empty row
  const addRow = useCallback(() => {
    const newId = `${Date.now()}`;
    setRows(prev => [...prev, { id: newId, name: "", url: "" }]);
    focusRow(newId);
  }, [focusRow]);

  // Remove a row
  const removeRow = useCallback((id: string) => {
    setRows(prev => {
      if (prev.length === 1) {
        // Keep at least one row, just clear it
        return [{ id: prev[0].id, name: "", url: "" }];
      }
      return prev.filter(r => r.id !== id);
    });
  }, []);

  // Update a row field
  const updateRow = useCallback((id: string, field: "name" | "url", value: string) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  }, []);

  // Parse pasted content for multiple competitors
  const parseMultipleCompetitors = useCallback((text: string): { name: string; url?: string }[] => {
    const lines = text
      .split(/[\n,;]+/)
      .map(line => line.trim())
      .filter(line => line.length > 0);

    return lines.map(line => {
      const urlMatch = line.match(/(https?:\/\/[^\s]+)/);
      let name = line;
      let url: string | undefined;

      if (urlMatch) {
        url = urlMatch[1];
        name = line.replace(url, '').replace(/[-|:]\s*$/, '').trim();
      }
      name = name.replace(/[-|:]\s*$/, '').trim();

      return { name, url };
    }).filter(c => c.name.length > 0);
  }, []);

  // Handle paste in name field - detect bulk paste
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>, rowId: string) => {
    const pastedText = e.clipboardData.getData('text');
    const hasMultiple = pastedText.includes('\n') || (pastedText.match(/,/g) || []).length > 1;

    if (hasMultiple) {
      e.preventDefault();
      const parsed = parseMultipleCompetitors(pastedText);

      if (parsed.length > 0) {
        setRows(prev => {
          // Replace current row and add more
          const currentIndex = prev.findIndex(r => r.id === rowId);
          const before = prev.slice(0, currentIndex);
          const after = prev.slice(currentIndex + 1);

          const newRows = parsed.map((c, i) => ({
            id: `${Date.now()}_${i}`,
            name: c.name,
            url: c.url || ""
          }));

          return [...before, ...newRows, ...after];
        });
      }
    }
  }, [parseMultipleCompetitors]);

  // Handle suggestion click
  const handleSuggestion = useCallback((name: string) => {
    // Check if already in list or existing
    const alreadyInRows = rows.some(r => r.name.toLowerCase() === name.toLowerCase());
    const alreadyExists = existingCompetitors.some(c => c.toLowerCase() === name.toLowerCase());

    if (alreadyInRows || alreadyExists) return;

    setRows(prev => {
      // Find first empty row or add new
      const emptyIndex = prev.findIndex(r => !r.name.trim());
      if (emptyIndex !== -1) {
        return prev.map((r, i) => i === emptyIndex ? { ...r, name } : r);
      }
      return [...prev, { id: `${Date.now()}`, name, url: "" }];
    });
  }, [rows, existingCompetitors]);

  // Get valid rows for submission
  const validRows = rows.filter(r => r.name.trim());

  // Handle submit
  const handleSubmit = useCallback(() => {
    if (validRows.length === 0) return;

    onStartScraping(validRows.map(r => ({
      name: r.name.trim(),
      url: r.url.trim() || undefined
    })));

    // Reset to single empty row
    setRows([{ id: `${Date.now()}`, name: "", url: "" }]);
  }, [validRows, onStartScraping]);

  // Handle Enter key
  const handleKeyDown = useCallback((e: React.KeyboardEvent, rowId: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const row = rows.find(r => r.id === rowId);
      if (row?.name.trim()) {
        // If current row has content, add new row
        addRow();
      }
    }
  }, [rows, addRow]);

  return (
    <div className="rounded-2xl bg-white border border-[#e0dfde] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 bg-[#F4F3F2]/50 border-b border-[#e0dfde]">
        <h3 className="text-sm font-medium text-[#1a1a1a]">Add Competitors</h3>
        <p className="text-xs text-[#165762]/50 mt-0.5">
          Add individually or paste a list to auto-populate
        </p>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-[1fr,1fr,40px] gap-3 px-5 py-2 bg-[#F4F3F2]/30 border-b border-[#e0dfde]">
        <span className="text-xs font-medium text-[#165762]/60">Company Name</span>
        <span className="text-xs font-medium text-[#165762]/60">
          Pricing URL <span className="font-normal text-[#165762]/40">(optional)</span>
        </span>
        <span></span>
      </div>

      {/* Input Rows */}
      <div className="divide-y divide-[#e0dfde]/50">
        {rows.map((row) => (
          <div key={row.id} className="grid grid-cols-[1fr,1fr,40px] gap-3 px-5 py-3 group">
            <input
              ref={el => {
                if (el) inputRefs.current.set(row.id, el);
                else inputRefs.current.delete(row.id);
              }}
              type="text"
              value={row.name}
              onChange={e => updateRow(row.id, "name", e.target.value)}
              onPaste={e => handlePaste(e, row.id)}
              onKeyDown={e => handleKeyDown(e, row.id)}
              placeholder="e.g., Manus AI"
              disabled={isLoading}
              className="h-10 px-3 bg-[#F4F3F2]/50 border border-[#e0dfde] rounded-lg text-sm text-[#1a1a1a] placeholder:text-[#165762]/30 focus:outline-none focus:border-[#D76228] focus:ring-2 focus:ring-[#D76228]/10 disabled:opacity-50"
            />
            <input
              type="text"
              value={row.url}
              onChange={e => updateRow(row.id, "url", e.target.value)}
              onKeyDown={e => handleKeyDown(e, row.id)}
              placeholder="https://example.com/pricing"
              disabled={isLoading}
              className="h-10 px-3 bg-[#F4F3F2]/50 border border-[#e0dfde] rounded-lg text-sm text-[#1a1a1a] placeholder:text-[#165762]/30 focus:outline-none focus:border-[#D76228] focus:ring-2 focus:ring-[#D76228]/10 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => removeRow(row.id)}
              disabled={isLoading}
              className="h-10 w-10 flex items-center justify-center rounded-lg border border-[#e0dfde] text-[#165762]/40 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <Minus className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Add More Button */}
      <div className="px-5 py-3 border-t border-[#e0dfde]/50">
        <button
          type="button"
          onClick={addRow}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#165762]/70 hover:text-[#165762] bg-[#F4F3F2] hover:bg-[#165762]/10 rounded-lg transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Add More
        </button>
      </div>

      {/* Suggestions */}
      <div className="px-5 py-3 bg-[#F4F3F2]/30 border-t border-[#e0dfde]">
        <p className="text-xs text-[#165762]/50 mb-2">Quick add suggestions:</p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED.map(name => {
            const isInRows = rows.some(r => r.name.toLowerCase() === name.toLowerCase());
            const isExisting = existingCompetitors.some(c => c.toLowerCase() === name.toLowerCase());
            const isDisabled = isInRows || isExisting;

            return (
              <button
                key={name}
                type="button"
                disabled={isLoading || isDisabled}
                onClick={() => handleSuggestion(name)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  isDisabled
                    ? "bg-[#165762]/10 text-[#165762]/40 cursor-not-allowed"
                    : "bg-white border border-[#e0dfde] text-[#165762]/70 hover:border-[#D76228] hover:text-[#D76228]"
                }`}
              >
                {isDisabled ? "✓ " : "+ "}{name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Submit Button */}
      <div className="px-5 py-4 bg-[#F4F3F2]/50 border-t border-[#e0dfde]">
        <Button
          onClick={handleSubmit}
          disabled={isLoading || validRows.length === 0}
          className="w-full h-11 bg-[#D76228] hover:bg-[#c55620] text-white disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Scraping...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              {validRows.length === 0
                ? "Add competitors to scrape"
                : `Start Scraping ${validRows.length} Competitor${validRows.length !== 1 ? "s" : ""}`
              }
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
