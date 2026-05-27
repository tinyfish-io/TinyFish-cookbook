// =============================================
// Wing Command v4 — Types
// No Supabase. No Redis. Pure in-memory.
// =============================================

export type FlavorPersona = 'face-melter' | 'classicist' | 'sticky-finger';
export type WingSource = 'doordash' | 'ubereats' | 'grubhub' | 'google' | 'yelp';
export type WingStatus = 'green' | 'yellow' | 'red';
export type SearchPhase = 'idle' | 'discovering' | 'scouting' | 'done';

export interface WingSpot {
  id: string;
  name: string;
  address: string;
  rating?: number;
  deliveryTime?: string;
  deliveryFee?: string;
  isOpen: boolean;
  imageUrl?: string;
  sourceUrl?: string;
  phone?: string;
  priceRange?: string;
  source: WingSource;
  siteName: string;
  status: WingStatus;
  // Extended fields used by components
  price_per_wing?: number | null;
  estimated_price_per_wing?: number | null;
  cheapest_item_price?: number | null;
  is_price_estimated?: boolean;
  delivery_time_mins?: number | null;
  deal_text?: string | null;
  platform_ids?: string[];
  is_in_stock?: boolean;
  is_open_now?: boolean;
  flavor_tags?: string[];
  menu_json?: { name: string; description?: string; price?: number }[];
  opens_during_game?: boolean;
  wait_time_mins?: number | null;
  image_url?: string | null;
  last_updated?: string | null;
  zip_code?: string;
}

export interface AgentStatus {
  agentId: string;
  siteName: string;
  siteUrl: string;
  source: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  streamingUrl?: string;
  message?: string;
  spots?: WingSpot[];
  error?: string;
}

export interface SearchState {
  phase: SearchPhase;
  stepMessage: string;
  agents: Record<string, AgentStatus>;
  completedSpots: WingSpot[];
}

export interface SearchParams {
  zipCode: string;
  city?: string;
  state?: string;
  flavor?: FlavorPersona;
}

export interface ScoutResponse {
  success: boolean;
  spots: WingSpot[];
  location?: { city: string; state: string; lat?: number; lng?: number };
  cached: boolean;
  message: string;
}

export interface AvailabilityStats {
  green: number;
  yellow: number;
  red: number;
  total: number;
  percentage: number;
}

export interface PopularCity {
  name: string;
  state: string;
  zip: string;
}

export interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
}

export interface FlavorPersonaInfo {
  id: FlavorPersona;
  label: string;
  subtitle: string;
  keywords: string[];
  description?: string;
  emoji: string;
  color: string;
}

// Types used by DealsView and MenuModal
export interface SuperBowlDeal {
  title: string;
  description: string;
  source: string;
  url?: string;
  promo_code?: string | null;
  pre_order_deadline?: string | null;
  pre_order_url?: string | null;
  special_menu_items?: string[];
}

export interface DealsResponse {
  success: boolean;
  deals: SuperBowlDeal[];
  cached: boolean;
  scouting?: boolean;
  message?: string;
}

export interface MenuItem {
  name: string;
  description?: string;
  price?: number;
  price_per_wing?: number | null;
  is_deal?: boolean;
}

export interface MenuSection {
  name: string;
  items: MenuItem[];
}

export interface MenuData {
  sections: MenuSection[];
  source?: string;
}

export interface MenuResponse {
  success: boolean;
  menu: MenuData;
  cached: boolean;
  scouting?: boolean;
  source_url?: string;
  message?: string;
}
