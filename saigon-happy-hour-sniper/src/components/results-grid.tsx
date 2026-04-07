import type { Venue } from '@/lib/types';
import { VenueCard } from './venue-card';

interface ResultsGridProps {
  venues: Venue[];
}

export function ResultsGrid({ venues }: ResultsGridProps) {
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {venues.map((venue) => (
        <VenueCard key={venue.website} venue={venue} />
      ))}
    </div>
  );
}
