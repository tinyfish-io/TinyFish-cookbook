import type { PharmacyResult } from '@/lib/types';
import { PharmacyGroup } from './pharmacy-group';

interface ResultsGridProps {
  results: PharmacyResult[];
}

export function ResultsGrid({ results }: ResultsGridProps) {
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {results.map((result, index) => (
        <PharmacyGroup
          key={result.pharmacy || index}
          result={result}
          pharmacyKey={result.pharmacy}
        />
      ))}
    </div>
  );
}
