"use client";
import { Scale } from "lucide-react";

interface CompareButtonProps {
  selectedCount: number;
  onCompare: () => void;
}

export function CompareButton({ selectedCount, onCompare }: CompareButtonProps) {
  const handleClick = () => {
    if (selectedCount < 2) {
      alert("Please select at least 2 tutors to compare.");
      return;
    }
    onCompare();
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
      <button
        onClick={handleClick}
        className="h-14 px-8 text-base shadow-2xl flex items-center gap-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-medium transition-colors"
      >
        <Scale className="w-5 h-5" />
        Compare {selectedCount > 0 ? `(${selectedCount} selected)` : ""}
      </button>
    </div>
  );
}
