// ============ Trip Purpose Types ============

export type TripPurpose = 
  | 'business'
  | 'exam_interview'
  | 'family_visit'
  | 'sightseeing'
  | 'late_night'
  | 'airport_transit'
  | 'custom';

export interface TripPurposeOption {
  id: TripPurpose;
  label: string;
  icon: string;
  description: string;
}

export const TRIP_PURPOSES: TripPurposeOption[] = [
  { id: 'business', label: 'Business', icon: '💼', description: 'Meetings, conferences, or work travel' },
  { id: 'exam_interview', label: 'Exam / Interview', icon: '📝', description: 'Need quiet, good sleep, early morning access' },
  { id: 'family_visit', label: 'Family Visit', icon: '👨‍👩‍👧‍👦', description: 'Visiting relatives, need comfortable space' },
  { id: 'sightseeing', label: 'Sightseeing', icon: '🗺️', description: 'Tourist activities, exploring the city' },
  { id: 'late_night', label: 'Late Night', icon: '🌙', description: 'Late check-in, nightlife, flexible schedule' },
  { id: 'airport_transit', label: 'Airport Transit', icon: '✈️', description: 'Early flight, layover, or late arrival' },
];

// ============ Area Suggestion Types ============

export interface AreaSuggestion {
  id: string;
  name: string;
  type: 'neighborhood' | 'area' | 'hotel';
  description: string;
  whyRecommended: string;
  keyLocations: string[];
}

export interface TopHotel {
  name: string;
  rating?: string;
  description: string;
}

export interface AreaResearchResult {
  areaId: string;
  areaName: string;
  status: 'pending' | 'researching' | 'complete' | 'error';
  currentAction?: string;
  streamingUrl?: string;
  
  // Research findings
  analysis?: {
    suitability: 'excellent' | 'good' | 'moderate' | 'poor';
    suitabilityScore: number; // 1-10
    summary: string;
    
    // Detailed insights
    pros: string[];
    cons: string[];
    risks: string[];
    
    // Specific findings
    distanceToKey?: string;
    walkability?: string;
    noiseLevel?: string;
    safetyNotes?: string;
    nearbyAmenities?: string[];
    reviewHighlights?: string[];
    
    // Top hotels in this area
    topHotels?: TopHotel[];
  };
  
  error?: string;
}

// ============ Search Types ============

export interface SearchParams {
  city: string;
  purpose: TripPurpose;
  customPurpose?: string;
  checkIn?: string;
  checkOut?: string;
}

// ============ SSE Types ============

export type SSEEventType = 'CONNECTED' | 'STATUS' | 'SCREENSHOT' | 'COMPLETE' | 'ERROR';

export interface SSEEvent {
  type: SSEEventType;
  data?: any;
  message?: string;
}

// ============ Legacy Types (for backwards compatibility) ============

export interface Platform {
  id: string;
  name: string;
  searchUrl: string;
}

export interface Hotel {
  name: string;
  price?: string;
  rating?: string;
  bookingUrl: string;
  image?: string;
}

export interface PlatformResult {
  platformId: string;
  platformName: string;
  searchUrl: string;
  status: 'pending' | 'searching' | 'complete' | 'error';
  statusMessage?: string;
  streamingUrl?: string;
  available: boolean;
  hotelsFound: number;
  message?: string;
  error?: string;
}
