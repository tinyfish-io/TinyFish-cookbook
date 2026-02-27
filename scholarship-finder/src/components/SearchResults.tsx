import { useState } from "react";
import { Scholarship } from "@/types/scholarship";
import { SelectableScholarshipCard } from "./SelectableScholarshipCard";
import { CompareButton } from "./CompareButton";
import { CompareDashboard } from "./CompareDashboard";
import { GraduationCap, AlertCircle } from "lucide-react";

interface SearchResultsProps {
  scholarships: Scholarship[];
  searchSummary: string;
  searchParams: {
    scholarshipType: string;
    university?: string;
    region?: string;
  };
}

export function SearchResults({ scholarships, searchSummary, searchParams }: SearchResultsProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showCompare, setShowCompare] = useState(false);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleCompare = () => {
    setShowCompare(true);
  };

  const selectedScholarships = scholarships.filter((s) => selectedIds.has(s.id));

  if (scholarships.length === 0) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold text-foreground mb-2">No Scholarships Found</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          We couldn't find scholarships matching your criteria. Try adjusting your search parameters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Compare Dashboard */}
      {showCompare && (
        <CompareDashboard
          scholarships={selectedScholarships}
          onClose={() => setShowCompare(false)}
        />
      )}

      {/* Results Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary">
          <GraduationCap className="w-5 h-5" />
          <span className="font-semibold">{scholarships.length} Scholarships Found</span>
        </div>
        
        <p className="text-sm text-muted-foreground">
          Click on scholarships to select them for comparison
        </p>
        
        <div className="flex flex-wrap justify-center gap-2">
          <span className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm">
            {searchParams.scholarshipType}
          </span>
          {searchParams.university && (
            <span className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm">
              {searchParams.university}
            </span>
          )}
          {searchParams.region && (
            <span className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm">
              {searchParams.region}
            </span>
          )}
        </div>

        {searchSummary && (
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm leading-relaxed">
            {searchSummary}
          </p>
        )}
      </div>

      {/* Results Grid */}
      <div className="grid lg:grid-cols-2 gap-6 pb-24">
        {scholarships.map((scholarship, index) => (
          <SelectableScholarshipCard 
            key={scholarship.id} 
            scholarship={scholarship} 
            index={index}
            isSelected={selectedIds.has(scholarship.id)}
            onToggleSelect={handleToggleSelect}
          />
        ))}
      </div>

      {/* Compare Button - Always visible */}
      <CompareButton 
        selectedCount={selectedIds.size} 
        onCompare={handleCompare} 
      />
    </div>
  );
}