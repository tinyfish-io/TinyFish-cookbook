import { TutorCard } from './TutorCard';
import { ChevronDown } from 'lucide-react';
import type { Tutor } from '@/types/tutor';

interface TutorResultsGridProps {
  tutors: Tutor[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  isSearching: boolean;
}

export function TutorResultsGrid({
  tutors,
  selectedIds,
  onToggleSelect,
  isSearching,
}: TutorResultsGridProps) {
  if (tutors.length === 0 && !isSearching) {
    return null;
  }

  return (
    <div className="w-full">
      {/* Scroll indicator when searching */}
      {isSearching && tutors.length > 0 && (
        <div className="flex items-center justify-center gap-2 py-4 text-primary animate-bounce">
          <ChevronDown className="w-5 h-5" />
          <span className="text-sm font-medium">Scroll down to see results</span>
          <ChevronDown className="w-5 h-5" />
        </div>
      )}

      {/* Results header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          {tutors.length} Tutor{tutors.length !== 1 ? 's' : ''} Found
        </h3>
        {selectedIds.size > 0 && (
          <span className="text-sm text-primary font-medium">
            {selectedIds.size} selected
          </span>
        )}
      </div>

      {/* Tutor grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tutors.map((tutor) => (
          <TutorCard
            key={tutor.id}
            tutor={tutor}
            isSelected={selectedIds.has(tutor.id)}
            onToggleSelect={() => onToggleSelect(tutor.id)}
          />
        ))}
      </div>

      {/* Placeholder cards while searching */}
      {isSearching && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {[1, 2, 3].map((i) => (
            <div
              key={`placeholder-${i}`}
              className="rounded-xl border-2 border-dashed border-border p-5 animate-pulse"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-muted" />
                <div className="flex-1">
                  <div className="h-5 w-32 bg-muted rounded mb-2" />
                  <div className="h-4 w-24 bg-muted rounded" />
                </div>
              </div>
              <div className="flex gap-2 mb-4">
                <div className="h-6 w-16 bg-muted rounded" />
                <div className="h-6 w-20 bg-muted rounded" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="h-4 w-full bg-muted rounded" />
                <div className="h-4 w-full bg-muted rounded" />
                <div className="h-4 w-full bg-muted rounded" />
                <div className="h-4 w-full bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
