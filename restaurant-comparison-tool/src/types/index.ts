export type Allergen =
  | 'peanuts'
  | 'tree_nuts'
  | 'shellfish'
  | 'fish'
  | 'milk'
  | 'lactose'
  | 'eggs'
  | 'wheat'
  | 'gluten'
  | 'soy'
  | 'sesame'
  | 'mustard'
  | 'celery'
  | 'sulfites';

export type DietaryPreference =
  | 'vegetarian'
  | 'vegan'
  | 'halal'
  | 'kosher'
  | 'low_spice'
  | 'hygiene_sensitive'
  | 'family_friendly'
  | 'late_night';

export interface SearchParams {
  city: string;
  restaurants: string[];
  allergens: Allergen[];
  preferences: DietaryPreference[];
}

export type AgentStatus =
  | 'idle'
  | 'connecting'
  | 'searching_maps'
  | 'reading_reviews'
  | 'checking_menu'
  | 'analyzing'
  | 'complete'
  | 'error';

export interface AgentStep {
  message: string;
  timestamp: number;
}

export interface RestaurantAgentState {
  id: string;
  restaurantName: string;
  status: AgentStatus;
  currentStep: string;
  steps: AgentStep[];
  streamingUrl?: string;
  result?: RestaurantSafetyData;
  error?: string;
  startedAt?: number;
  completedAt?: number;
}

export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';
export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface AllergenRisk {
  allergen: Allergen;
  riskLevel: RiskLevel;
  details: string;
  menuMentions: number;
  reviewMentions: number;
}

export interface SafetySignal {
  category: 'hygiene' | 'allergen_handling' | 'food_poisoning' | 'cross_contamination' | 'staff_responsiveness' | 'cleanliness';
  sentiment: 'positive' | 'negative' | 'neutral';
  detail: string;
  source: 'review' | 'menu' | 'website';
}

export interface RestaurantSafetyData {
  restaurantName: string;
  googleMapsUrl: string;
  address?: string;
  rating?: number;
  totalReviews?: number;
  overallSafetyScore: number;
  confidenceLevel: ConfidenceLevel;
  allergenRisks: AllergenRisk[];
  allergenLabelingClarity: 'excellent' | 'good' | 'poor' | 'none';
  crossContaminationRisk: RiskLevel;
  safetySignals: SafetySignal[];
  foodPoisoningMentions: number;
  hygieneScore: number;
  vegetarianFriendly: boolean;
  veganFriendly: boolean;
  dietaryAccommodation: 'excellent' | 'good' | 'limited' | 'poor';
  fitExplanation: string;
  pros: string[];
  cons: string[];
  menuDiversity: 'excellent' | 'good' | 'limited';
  safeOptionsCount: number;
  dataSourcesUsed: string[];
  analysisTimestamp?: string;
}

export interface MinoSSEEvent {
  type?: string;
  status?: string;
  message?: string;
  purpose?: string;
  action?: string;
  resultJson?: RestaurantSafetyData;
  streamingUrl?: string;
  step?: number;
  totalSteps?: number;
}

export type AppPhase = 'input' | 'searching' | 'results';

export interface AppState {
  phase: AppPhase;
  searchParams: SearchParams | null;
  agents: Record<string, RestaurantAgentState>;
  searchStartedAt: number | null;
  searchCompletedAt: number | null;
}

export type AppAction =
  | { type: 'START_SEARCH'; payload: SearchParams }
  | { type: 'AGENT_CONNECTING'; payload: { id: string; restaurantName: string } }
  | { type: 'AGENT_STEP'; payload: { id: string; step: string } }
  | { type: 'AGENT_STREAMING_URL'; payload: { id: string; streamingUrl: string } }
  | { type: 'AGENT_COMPLETE'; payload: { id: string; result: RestaurantSafetyData } }
  | { type: 'AGENT_ERROR'; payload: { id: string; error: string } }
  | { type: 'RESET' };
