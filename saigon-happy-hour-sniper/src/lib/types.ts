export type DealType =
  | 'happy_hour'
  | 'ladies_night'
  | 'brunch'
  | 'live_music'
  | 'daily_special';

export type District = 'd1' | 'thao_dien' | 'd3';

export interface DealItem {
  item: string;
  promo_price: number | null;
  regular_price: number | null;
}

export interface Deal {
  deal_name: string;
  type: DealType;
  day_of_week: string[];
  time_start: string | null;
  time_end: string | null;
  description: string;
  items: DealItem[];
  conditions: string | null;
  source_url: string;
}

export interface Venue {
  name: string;
  district: District;
  address: string;
  website: string;
  deals: Deal[];
  notes: string | null;
  source?: 'cache' | 'live';
  cached_at?: string;
}

export interface StreamingPreview {
  siteUrl: string;
  streamingUrl: string;
  done: boolean;
}

export interface SearchState {
  venues: Venue[];
  isSearching: boolean;
  progress: { completed: number; total: number };
  error: string | null;
  elapsed: string | null;
  cachedCount: number;
  streamingUrls: StreamingPreview[];
}
