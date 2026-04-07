'use client';

import { useState } from 'react';
import MapGL, { Marker, Popup } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { RentalListing } from '@/hooks/use-listing-search';

interface ListingMapProps {
  listings: RentalListing[];
  selectedId: string | null;
  onSelectListing: (id: string) => void;
  city: string;
}

const CITY_CENTERS: Record<string, { longitude: number; latitude: number }> = {
  hcmc: { longitude: 106.70, latitude: 10.78 },
  hanoi: { longitude: 105.85, latitude: 21.03 },
  danang: { longitude: 108.20, latitude: 16.05 },
};

const DEFAULT_CENTER = { longitude: 106.70, latitude: 10.78 };

function getPinColor(listing: RentalListing): string {
  if (listing.poster_type === 'broker' || listing.trust_signals.price_suspicious) {
    return '#ef4444';
  }
  if (listing.poster_type === 'owner') {
    return '#22c55e';
  }
  return '#f59e0b';
}

export function ListingMap({ listings, selectedId, onSelectListing, city }: ListingMapProps) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  if (!token) return null;

  const center = CITY_CENTERS[city.toLowerCase()] ?? DEFAULT_CENTER;

  const mappableListings = listings.filter(
    (l) => l.latitude !== null && l.longitude !== null,
  );

  const selectedListing = selectedId
    ? mappableListings.find((l) => l.listing_url === selectedId) ?? null
    : null;

  return (
    <MapInner
      token={token}
      center={center}
      mappableListings={mappableListings}
      selectedListing={selectedListing}
      onSelectListing={onSelectListing}
    />
  );
}

interface MapInnerProps {
  token: string;
  center: { longitude: number; latitude: number };
  mappableListings: RentalListing[];
  selectedListing: RentalListing | null;
  onSelectListing: (id: string) => void;
}

function MapInner({ token, center, mappableListings, selectedListing, onSelectListing }: MapInnerProps) {
  const [viewState, setViewState] = useState({
    longitude: center.longitude,
    latitude: center.latitude,
    zoom: 12,
  });

  return (
    <div className="h-[400px] md:h-[500px] w-full rounded-xl overflow-hidden border border-zinc-200">
      <MapGL
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        mapboxAccessToken={token}
        style={{ width: '100%', height: '100%' }}
      >
        {mappableListings.map((listing) => (
          <Marker
            key={listing.listing_url || `${listing.latitude}-${listing.longitude}`}
            longitude={listing.longitude!}
            latitude={listing.latitude!}
            color={getPinColor(listing)}
            onClick={() => onSelectListing(listing.listing_url)}
          />
        ))}

        {selectedListing && selectedListing.latitude !== null && selectedListing.longitude !== null && (
          <Popup
            longitude={selectedListing.longitude}
            latitude={selectedListing.latitude}
            onClose={() => onSelectListing('')}
            closeButton
            closeOnClick={false}
            anchor="bottom"
          >
            <div className="p-1 max-w-[200px]">
              <p className="text-xs font-semibold line-clamp-2">{selectedListing.title_en}</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {selectedListing.price_vnd_monthly
                  ? `${(selectedListing.price_vnd_monthly / 1_000_000).toFixed(1)}M ₫/mo`
                  : selectedListing.negotiable
                  ? 'Negotiable'
                  : 'Price on request'}
              </p>
            </div>
          </Popup>
        )}
      </MapGL>
    </div>
  );
}
