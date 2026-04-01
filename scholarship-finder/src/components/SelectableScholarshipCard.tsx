import { Scholarship } from "@/types/scholarship";
import { ScholarshipCard } from "./ScholarshipCard";

interface SelectableScholarshipCardProps {
  scholarship: Scholarship;
  index: number;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
}

export function SelectableScholarshipCard({ scholarship, index, isSelected, onToggleSelect }: SelectableScholarshipCardProps) {
  return (
    <ScholarshipCard
      scholarship={scholarship}
      index={index}
      isSelected={isSelected}
      onToggleSelect={onToggleSelect}
    />
  );
}
