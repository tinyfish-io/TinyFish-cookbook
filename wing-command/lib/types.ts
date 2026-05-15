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
  // set client-side after scrape
  status: WingStatus;
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
  label: string;
  description: string;
  emoji: string;
  color: string;
}
