'use client';

// Leaflet map component — must be dynamically imported (no SSR) because Leaflet requires `window`
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';
import { t } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import type { Property } from '@/hooks/use-property-search';

// Fix Leaflet default icon broken paths in Next.js (webpack asset hashing)
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Auto-fit map bounds to all visible markers whenever properties change
function FitBounds({ properties }: { properties: Property[] }) {
  const map = useMap();
  useEffect(() => {
    if (properties.length === 0) return;
    const bounds = L.latLngBounds(properties.map(p => [p.lat!, p.lng!]));
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [map, properties]);
  return null;
}

interface MapViewProps {
  properties: Property[];
  locale: Locale;
}

// Default center: middle of Vietnam, zoom 6 gives full country view
const VIETNAM_CENTER: [number, number] = [16.0, 106.0];
const DEFAULT_ZOOM = 6;

export default function MapView({ properties, locale }: MapViewProps) {
  const mapped = properties.filter(
    p => typeof p.lat === 'number' && typeof p.lng === 'number' && isFinite(p.lat) && isFinite(p.lng)
  );

  return (
    <div className="h-full w-full relative">
      <MapContainer
        center={VIETNAM_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {mapped.length > 0 && <FitBounds properties={mapped} />}

        {mapped.map((p, idx) => (
          <Marker key={idx} position={[p.lat!, p.lng!]}>
            <Popup>
              <div className="space-y-1 text-sm max-w-[200px]">
                <p className="font-semibold leading-snug">{p.title}</p>
                {p.price_display && (
                  <p className="text-teal-700 font-medium">{p.price_display}</p>
                )}
                {p.area_sqm && <p className="text-teal-600/70">{p.area_sqm} m2</p>}
                {p.address && <p className="text-teal-600/60 text-xs">{p.address}</p>}
                {p.detail_url && (
                  <a
                    href={p.detail_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-600 underline text-xs"
                  >
                    {t(locale, 'viewDetail')}
                  </a>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Overlay: result count with geo coords */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-[1000] bg-teal-50/90 backdrop-blur-sm text-xs text-teal-600 px-3 py-1 rounded-full border border-teal-200 pointer-events-none">
        {mapped.length}/{properties.length} {t(locale, 'mapResults')}
      </div>
    </div>
  );
}
