"use client";
import { Scale } from "lucide-react";

interface CompareButtonProps {
  selectedCount: number;
  onCompare: () => void;
}

export function CompareButton({ selectedCount, onCompare }: CompareButtonProps) {
  const handleClick = () => {
    if (selectedCount < 2) {
      alert("Please select at least 2 scholarships to compare.");
      return;
    }
    onCompare();
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        onClick={handleClick}
        className="h-14 px-6 bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-lg rounded-full flex items-center gap-3 transition-colors"
      >
        <Scale className="w-5 h-5" />
        Compare {selectedCount > 0 && `(${selectedCount})`}
      </button>
    </div>
  );
}
