import { CheckCircle, XCircle } from 'lucide-react';

interface FitExplanationProps {
  explanation: string;
  pros: string[];
  cons: string[];
}

export function FitExplanation({ explanation, pros, cons }: FitExplanationProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-foreground leading-relaxed">
        {explanation}
      </p>

      {pros.length > 0 && (
        <div className="space-y-1">
          {pros.map((pro, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <CheckCircle className="w-3.5 h-3.5 text-risk-low shrink-0 mt-0.5" />
              <span className="text-foreground">{pro}</span>
            </div>
          ))}
        </div>
      )}

      {cons.length > 0 && (
        <div className="space-y-1">
          {cons.map((con, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <XCircle className="w-3.5 h-3.5 text-risk-high shrink-0 mt-0.5" />
              <span className="text-foreground">{con}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
