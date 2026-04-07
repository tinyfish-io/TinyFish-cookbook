"use client";
import { useState } from "react";
import { Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SearchParams } from "@/types/scholarship";

interface SearchFormProps {
  onSearch: (params: SearchParams) => void;
  isLoading: boolean;
}

const scholarshipTypes = [
  "All Scholarships", "Merit-Based", "Need-Based", "Athletic", "STEM",
  "Arts & Humanities", "Graduate", "Undergraduate", "International Students",
  "Minority Groups", "Women in STEM", "First-Generation Students",
];

const regions = [
  "North America", "Europe", "Asia", "Australia & Oceania", "Africa",
  "South America", "Middle East", "United Kingdom", "Canada", "Germany",
];

export function SearchForm({ onSearch, isLoading }: SearchFormProps) {
  const [scholarshipType, setScholarshipType] = useState("");
  const [university, setUniversity] = useState("");
  const [region, setRegion] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scholarshipType) return;
    onSearch({
      scholarshipType: scholarshipType === "All Scholarships" ? "general" : scholarshipType,
      university: university.trim() || undefined,
      region: region || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Scholarship Type *</label>
          <Select value={scholarshipType} onValueChange={setScholarshipType} disabled={isLoading}>
            <SelectTrigger className="h-12 bg-card border-2 border-primary/20 focus:border-primary rounded-xl">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {scholarshipTypes.map((type) => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">University (Optional)</label>
          <input
            type="text"
            placeholder="e.g., Harvard, MIT"
            value={university}
            onChange={(e) => setUniversity(e.target.value)}
            disabled={isLoading}
            className="h-12 w-full px-3 bg-card border-2 border-primary/20 focus:border-primary rounded-xl text-sm focus:outline-none focus:ring-0"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Region (Optional)</label>
          <Select value={region} onValueChange={setRegion} disabled={isLoading}>
            <SelectTrigger className="h-12 bg-card border-2 border-primary/20 focus:border-primary rounded-xl">
              <SelectValue placeholder="Select region" />
            </SelectTrigger>
            <SelectContent>
              {regions.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-center pt-2">
        <button
          type="submit"
          disabled={isLoading || !scholarshipType}
          className="h-14 px-12 text-lg font-semibold gradient-primary text-white hover:opacity-90 transition-opacity rounded-xl flex items-center gap-2 disabled:opacity-50"
        >
          <Search className="w-5 h-5" />
          Search Scholarships
        </button>
      </div>
    </form>
  );
}
