import type { PlatformResult } from '@/hooks/use-listing-search';
import { PlatformGroup } from './platform-group';

interface ResultsGridProps {
  platforms: PlatformResult[];
}

export function ResultsGrid({ platforms }: ResultsGridProps) {
  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      {platforms.map((platform) => (
        <PlatformGroup key={`${platform.platform}-${platform.city}`} platform={platform} />
      ))}
    </div>
  );
}
