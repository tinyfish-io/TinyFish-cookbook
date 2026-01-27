"use client";

import { useState, useCallback, useRef, useEffect, Fragment } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronRight,
  Download,
  RefreshCw,
  Loader2,
  ExternalLink,
  Pencil,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CompetitorPricing, PricingTier, CellEdit, SpreadsheetRow } from "@/types";

interface SpreadsheetViewProps {
  competitorPricing: Array<{ id: string; data: CompetitorPricing | undefined }>;
  onEditCell: (edit: CellEdit) => void;
  onVerifyTier: (competitorId: string, tierIndex: number) => void;
  onRefreshCompetitor?: (competitorId: string) => void;
  isRefreshing?: Record<string, boolean>;
  onCompanyClick?: (competitorId: string) => void;
}

// Inline editor component
function InlineEditor({
  value,
  type = "text",
  placeholder = "—",
  onSave,
  align = "center",
}: {
  value: string | number | boolean | null;
  type?: "text" | "number" | "currency" | "checkbox";
  placeholder?: string;
  onSave: (value: string | number | boolean | null) => void;
  align?: "left" | "center" | "right";
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value ?? ""));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEditValue(String(value ?? ""));
  }, [value]);

  const handleSave = () => {
    setIsEditing(false);
    let newValue: string | number | null = editValue.trim();
    if (type === "number" || type === "currency") {
      const cleaned = editValue.replace(/[^0-9.-]/g, "");
      newValue = cleaned ? parseFloat(cleaned) : null;
    }
    if (newValue !== value) {
      onSave(newValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    else if (e.key === "Escape") {
      setEditValue(String(value ?? ""));
      setIsEditing(false);
    }
  };

  // Checkbox
  if (type === "checkbox") {
    return (
      <button
        onClick={() => onSave(!value)}
        className={`w-4 h-4 rounded border transition-colors flex items-center justify-center ${
          value
            ? "bg-slate-900 border-slate-900"
            : "bg-white border-slate-300 hover:border-slate-400"
        }`}
      >
        {value && <Check className="w-3 h-3 text-white" />}
      </button>
    );
  }

  // Editing
  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={`w-full px-2 py-1 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:border-slate-400 ${
          align === "center" ? "text-center" : align === "right" ? "text-right" : ""
        }`}
        placeholder={placeholder}
      />
    );
  }

  // Display
  const displayValue = (() => {
    if (value === null || value === undefined || value === "") return null;
    if (type === "currency") {
      const num = typeof value === "number" ? value : parseFloat(String(value));
      if (isNaN(num)) return String(value);
      return `$${num.toLocaleString()}`;
    }
    return String(value);
  })();

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={`group cursor-pointer px-2 py-1 -mx-2 -my-1 rounded hover:bg-slate-50 transition-colors flex items-center gap-1 min-h-[28px] ${
        align === "center" ? "justify-center" : align === "right" ? "justify-end" : ""
      }`}
    >
      {displayValue ? (
        <span className="text-sm text-slate-700">{displayValue}</span>
      ) : (
        <span className="text-sm text-slate-300">{placeholder}</span>
      )}
      <Pencil className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
    </div>
  );
}

export function SpreadsheetView({
  competitorPricing,
  onEditCell,
  // onVerifyTier,
  onRefreshCompetitor,
  isRefreshing = {},
}: SpreadsheetViewProps) {
  const router = useRouter();
  const [expandedCompetitors, setExpandedCompetitors] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Initialize expanded
  useEffect(() => {
    const initial: Record<string, boolean> = {};
    competitorPricing.forEach(({ id }) => {
      initial[id] = true;
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExpandedCompetitors(initial);
  }, [competitorPricing]);

  const toggleExpand = (id: string) => {
    setExpandedCompetitors((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Build rows
  const rows: SpreadsheetRow[] = [];
  competitorPricing.forEach(({ id, data }) => {
    if (!data?.tiers) return;
    data.tiers.forEach((tier, tierIndex) => {
      rows.push({
        competitorId: id,
        competitorName: data.company,
        tier,
        tierIndex,
        verificationSource: data.verificationSource,
        dataQualityNotes: data.dataQualityNotes,
        scrapedAt: data.scrapedAt,
      });
    });
  });

  // Group by competitor
  const groupedRows: Record<string, SpreadsheetRow[]> = {};
  rows.forEach((row) => {
    if (!groupedRows[row.competitorId]) groupedRows[row.competitorId] = [];
    groupedRows[row.competitorId].push(row);
  });

  // Filter by search query
  const filteredGroupedRows = Object.fromEntries(
    Object.entries(groupedRows).filter(([, competitorRows]) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      const name = competitorRows[0]?.competitorName?.toLowerCase() || "";
      return name.includes(query);
    })
  );

  // Keyboard shortcut for search (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === "Escape" && document.activeElement === searchInputRef.current) {
        setSearchQuery("");
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleCellEdit = useCallback(
    (competitorId: string, tierIndex: number, field: keyof PricingTier, value: string | number | boolean | null) => {
      onEditCell({ competitorId, tierIndex, field, value });
    },
    [onEditCell]
  );

  const exportToCSV = () => {
    const headers = ["Platform", "Tier", "Price", "Units", "Est. Tasks", "$/Task", "Notes"];
    const csvRows = rows.map((row) => [
      row.competitorName,
      row.tier.name,
      row.tier.monthlyPrice ?? "",
      row.tier.units || "",
      row.tier.estTasks || "",
      row.tier.pricePerTask || "",
      `"${(row.tier.sourceNotes || "").replace(/"/g, '""')}"`,
    ]);

    const csv = [headers.join(","), ...csvRows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pricing-data-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Empty state
  if (rows.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-400">No pricing data yet. Add competitors to get started.</p>
      </div>
    );
  }

  const totalTiers = rows.length;
  const verifiedCount = rows.filter((r) => r.tier.verified).length;
  const totalCompetitors = Object.keys(groupedRows).length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 mb-1">Pricing Data</h2>
          <p className="text-sm text-slate-500">
            <span className="text-slate-700 font-medium">{totalCompetitors}</span> competitors
            <span className="mx-2 text-slate-300">·</span>
            <span className="text-slate-700 font-medium">{totalTiers}</span> tiers
            <span className="mx-2 text-slate-300">·</span>
            <span className="text-slate-700 font-medium">{verifiedCount}</span> verified
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search companies..."
              className="w-64 h-9 pl-9 pr-8 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-100 placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            {!searchQuery && (
              <kbd className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 bg-slate-100 rounded">
                ⌘K
              </kbd>
            )}
          </div>
          <Button onClick={exportToCSV} variant="outline" size="sm" className="text-slate-600 h-9 px-4">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
        <div className="overflow-auto max-h-[calc(100vh-280px)]">
          <table className="w-full border-collapse min-w-[1000px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50">
                <th className="text-center px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 w-[180px] bg-slate-50">
                  Platform
                </th>
                <th className="text-center px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-l border-slate-200 w-[120px] bg-slate-50">
                  Tier
                </th>
                <th className="text-center px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-l border-slate-200 w-[90px] bg-slate-50">
                  Price
                </th>
                <th className="text-center px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-l border-slate-200 w-[120px] bg-slate-50">
                  Units
                </th>
                <th className="text-center px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-l border-slate-200 w-[100px] bg-slate-50">
                  Est. Tasks
                </th>
                <th className="text-center px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-l border-slate-200 w-[90px] bg-slate-50">
                  $/Task
                </th>
                <th className="text-center px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-l border-slate-200 min-w-[200px] bg-slate-50">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(filteredGroupedRows).length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <p className="text-sm text-slate-500">No companies match &quot;{searchQuery}&quot;</p>
                    <button
                      onClick={() => setSearchQuery("")}
                      className="mt-2 text-sm text-slate-400 hover:text-slate-600 underline"
                    >
                      Clear search
                    </button>
                  </td>
                </tr>
              )}
              {Object.entries(filteredGroupedRows).map(([competitorId, competitorRows], groupIndex) => {
                const isExpanded = expandedCompetitors[competitorId];
                const firstRow = competitorRows[0];

                return (
                  <Fragment key={competitorId}>
                    {/* Platform Header */}
                    <tr className={`bg-slate-50/80 ${groupIndex > 0 ? "border-t-2 border-slate-200" : "border-t border-slate-100"}`}>
                      <td colSpan={7} className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => toggleExpand(competitorId)}
                            className="p-1 -ml-1 rounded hover:bg-slate-200/80 transition-colors"
                          >
                            <ChevronRight
                              className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
                                isExpanded ? "rotate-90" : ""
                              }`}
                            />
                          </button>

                          <button
                            onClick={() => router.push(`/company/${competitorId}`)}
                            className="flex items-center gap-2 group"
                          >
                            <span className="text-sm font-semibold text-slate-800 group-hover:text-slate-600 transition-colors">
                              {firstRow.competitorName}
                            </span>
                            <ExternalLink className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>

                          <span className="text-xs text-slate-400">
                            {competitorRows.length} tier{competitorRows.length !== 1 ? "s" : ""}
                          </span>

                          {onRefreshCompetitor && (
                            <button
                              onClick={() => onRefreshCompetitor(competitorId)}
                              disabled={isRefreshing[competitorId]}
                              className="ml-auto p-1.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200/80 transition-colors disabled:opacity-50"
                            >
                              {isRefreshing[competitorId] ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <RefreshCw className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Tier Rows */}
                    {isExpanded &&
                      competitorRows.map((row, rowIndex) => (
                        <tr
                          key={`${row.competitorId}-${row.tierIndex}`}
                          className={`hover:bg-slate-50/50 transition-colors ${
                            rowIndex < competitorRows.length - 1 ? "border-b border-slate-100" : ""
                          }`}
                        >
                          {/* Platform (empty for tiers) */}
                          <td className="px-4 py-3 text-center border-l-2 border-l-transparent">
                            <span className="text-sm text-slate-300">↳</span>
                          </td>

                          {/* Tier Name */}
                          <td className="px-4 py-3 text-center border-l border-slate-100">
                            <span className="text-sm font-medium text-slate-700">{row.tier.name}</span>
                          </td>

                          {/* Price */}
                          <td className="px-4 py-3 border-l border-slate-100">
                            <InlineEditor
                              value={row.tier.monthlyPrice}
                              type="currency"
                              onSave={(val) =>
                                handleCellEdit(row.competitorId, row.tierIndex, "monthlyPrice", val as number | null)
                              }
                            />
                          </td>

                          {/* Units */}
                          <td className="px-4 py-3 border-l border-slate-100">
                            <InlineEditor
                              value={row.tier.units || null}
                              onSave={(val) =>
                                handleCellEdit(row.competitorId, row.tierIndex, "units", val as string)
                              }
                            />
                          </td>

                          {/* Est. Tasks */}
                          <td className="px-4 py-3 border-l border-slate-100">
                            <InlineEditor
                              value={row.tier.estTasks || null}
                              onSave={(val) =>
                                handleCellEdit(row.competitorId, row.tierIndex, "estTasks", val as string)
                              }
                            />
                          </td>

                          {/* $/Task */}
                          <td className="px-4 py-3 border-l border-slate-100">
                            <InlineEditor
                              value={row.tier.pricePerTask || null}
                              onSave={(val) =>
                                handleCellEdit(row.competitorId, row.tierIndex, "pricePerTask", val as string)
                              }
                            />
                          </td>

                          {/* Notes */}
                          <td className="px-4 py-3 border-l border-slate-100">
                            <InlineEditor
                              value={row.tier.sourceNotes}
                              placeholder="Add notes..."
                              onSave={(val) =>
                                handleCellEdit(row.competitorId, row.tierIndex, "sourceNotes", val as string)
                              }
                            />
                          </td>
                        </tr>
                      ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 flex items-center justify-between text-xs text-slate-400">
        <span>Click any cell to edit · Changes save automatically</span>
        <span>
          {searchQuery ? (
            <>
              {Object.keys(filteredGroupedRows).length} of {totalCompetitors} companies
            </>
          ) : (
            <>{totalTiers} rows</>
          )}
        </span>
      </div>
    </div>
  );
}
