'use client';

// Dynamic import wrapper — prevents Leaflet SSR crash (Leaflet needs `window`)
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import type { Locale } from '@/lib/i18n';
import type { Property } from '@/hooks/use-property-search';

const MapView = dynamic(() => import('@/components/map-view'), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-xl" />,
});

interface MapViewWrapperProps {
  properties: Property[];
  locale: Locale;
}

export default function MapViewWrapper({ properties, locale }: MapViewWrapperProps) {
  return <MapView properties={properties} locale={locale} />;
}
