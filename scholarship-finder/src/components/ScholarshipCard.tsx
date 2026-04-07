"use client";
import { ExternalLink, Calendar, DollarSign, CheckCircle2, Info, FileText, Building2, MapPin, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Scholarship } from "@/types/scholarship";

interface ScholarshipCardProps {
  scholarship: Scholarship;
  index: number;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export function ScholarshipCard({ scholarship, index, isSelected, onToggleSelect }: ScholarshipCardProps) {
  const selectable = isSelected !== undefined && onToggleSelect !== undefined;

  return (
    <div
      className={cn(
        "overflow-hidden border rounded-xl hover:shadow-lg transition-all duration-300 animate-fade-in bg-card",
        selectable && "relative cursor-pointer",
        selectable && isSelected && "ring-2 ring-orange-500 border-orange-500"
      )}
      style={{ animationDelay: `${index * 100}ms` }}
      onClick={selectable ? () => onToggleSelect(scholarship.id) : undefined}
    >
      {selectable && (
        <div className="absolute top-4 right-4 z-10">
          <div
            className={cn(
              "w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all",
              isSelected ? "bg-orange-500 border-orange-500" : "bg-white border-muted-foreground/30 hover:border-orange-400"
            )}
            onClick={(e) => { e.stopPropagation(); onToggleSelect(scholarship.id); }}
          >
            {isSelected && <Check className="w-4 h-4 text-white" />}
          </div>
        </div>
      )}

      <div className="p-6 pb-4">
        <div className={cn("flex items-start justify-between gap-4 mb-2", selectable && "pr-10")}>
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-foreground leading-tight">{scholarship.name}</h3>
            <p className="text-muted-foreground font-medium">{scholarship.provider}</p>
          </div>
          <span className="shrink-0 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">{scholarship.type}</span>
        </div>
        <div className="flex flex-wrap gap-3 mt-2">
          {scholarship.university && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Building2 className="w-4 h-4" />{scholarship.university}
            </div>
          )}
          {scholarship.region && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />{scholarship.region}
            </div>
          )}
        </div>
      </div>

      <div className="px-6 pb-6 space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
            <DollarSign className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Amount</p>
              <p className="font-bold text-green-600">{scholarship.amount}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <Calendar className="w-5 h-5 text-amber-600" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Deadline</p>
              <p className="font-bold text-amber-600">{scholarship.deadline}</p>
            </div>
          </div>
        </div>

        <p className="text-muted-foreground text-sm leading-relaxed">{scholarship.description}</p>

        <hr className="border-border" />

        {scholarship.eligibility?.length > 0 && (
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 font-semibold text-foreground">
              <CheckCircle2 className="w-4 h-4 text-primary" />Eligibility Requirements
            </h4>
            <ul className="space-y-2">
              {scholarship.eligibility.map((req, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />{req}
                </li>
              ))}
            </ul>
          </div>
        )}

        {scholarship.applicationRequirements?.length > 0 && (
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 font-semibold text-foreground">
              <FileText className="w-4 h-4 text-primary" />Application Requirements
            </h4>
            <ul className="space-y-2">
              {scholarship.applicationRequirements.map((req, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 shrink-0" />{req}
                </li>
              ))}
            </ul>
          </div>
        )}

        {scholarship.additionalInfo && (
          <div className="space-y-2">
            <h4 className="flex items-center gap-2 font-semibold text-foreground">
              <Info className="w-4 h-4 text-blue-500" />Additional Information
            </h4>
            <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">{scholarship.additionalInfo}</p>
          </div>
        )}

        <a
          href={scholarship.applicationLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={selectable ? (e) => e.stopPropagation() : undefined}
          className="w-full h-12 flex items-center justify-center gap-2 font-semibold gradient-primary text-white hover:opacity-90 transition-opacity rounded-xl"
        >
          Apply Now <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
