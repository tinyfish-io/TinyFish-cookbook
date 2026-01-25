export interface BaselinePricing {
  companyName: string;
  pricingModel: 'subscription' | 'usage-based' | 'hybrid' | 'freemium';
  unitType: string;
  pricePerUnit: number;
  currency: string;
}

export interface Competitor {
  id: string;
  name: string;
  url?: string;
  logoUrl?: string;
  generatedUrl?: string;
  urlConfidence?: 'high' | 'medium' | 'low';
}

// New schema for spreadsheet-focused tier data
export interface PricingTier {
  // Core identification
  id?: string;
  name: string; // "Free", "Basic", "Plus", "Pro", "Team", "Enterprise"

  // Pricing breakdown (separate monthly vs annual)
  monthlyPrice: number | null;
  annualPrice: number | null;
  annualPriceNote?: string; // "$204 ($17/mo)" for display
  currency: string;

  // Units included (e.g., "100 runs", "10,900 credits", "9 ACUs")
  units?: string;

  // Estimated tasks (e.g., "100", "27-109", "9")
  estTasks?: string;

  // Price per task (e.g., "$0.20", "$0.17-0.70", "$2.22")
  pricePerTask?: string;

  // What's included (separate from features - matches spreadsheet column)
  whatsIncluded: string; // "1,000 starter + 300/day credits"

  // Concurrent limits (matches spreadsheet column)
  concurrent: string; // "2 sources", "1 session", "15 min session", "Unknown"

  // Overage model (matches spreadsheet column)
  overage: string; // "N/A", "$2.25/ACU", "No overage (hard limit)", "Not specified"

  // Data quality and verification
  sourceNotes: string; // "100-400 credits per task avg", "Conflicting concurrent data"
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;

  // Confidence level for data accuracy
  confidence?: 'high' | 'medium' | 'low' | 'baseline';

  // Legacy fields (keep for backward compatibility)
  price?: number | null;
  billingPeriod?: 'month' | 'year' | 'one-time' | 'custom';
  unit?: string;
  limits?: string;
  includedUnits?: string;
  overagePrice?: string;
  features?: string[];
  isEnterprise?: boolean;
  hasFreeTrial?: boolean;

  // Edit tracking
  lastEditedBy?: string;
  lastEditedAt?: string;
}

// New schema for competitor pricing data
export interface CompetitorPricing {
  // Company identification
  company: string; // "MANUS AI", not just "Manus"
  url: string;
  logoUrl?: string;

  // Pricing structure
  tiers: PricingTier[];

  // Verification and data quality
  verificationSource: string; // "Verified: Lindy.ai, TechCrunch, Wikipedia 2025"
  dataQualityNotes?: string; // "USER CLAIMS 20 concurrent, docs say 5-10"
  overallVerified: boolean; // True if all tiers verified

  // Metadata
  scrapedAt: string;
  lastUpdatedAt?: string;
  screenshotUrl?: string; // Optional: Store screenshot of pricing page

  // Legacy fields (for backward compatibility)
  pricingModel?: 'subscription' | 'usage-based' | 'seat-based' | 'hybrid' | 'freemium' | 'enterprise-only';
  primaryUnit?: string;
  unitDefinition?: string;
  additionalCosts?: {
    setup?: number;
    support?: number;
    overage?: string;
  };
  additionalNotes?: string;
}

// Types for editing workflow
export interface EditHistory {
  field: string;
  oldValue: string | number | null;
  newValue: string | number | null;
  editedBy: string;
  editedAt: string;
  reason?: string;
}

export interface CellEdit {
  competitorId: string;
  tierIndex: number;
  field: keyof PricingTier;
  value: string | number | boolean | null;
}

export interface VerificationAction {
  competitorId: string;
  tierIndex: number;
  verifiedBy: string;
  verifiedAt: string;
  notes?: string;
}

export interface ScrapingStatus {
  status: 'pending' | 'generating-url' | 'scraping' | 'complete' | 'error';
  streamingUrl?: string;
  steps: string[];
  data?: CompetitorPricing;
  error?: string;
  startedAt?: number;
  completedAt?: number;
}

export interface NormalizedPricing {
  pricingModel: string;
  normalizedCostPerWorkflow: number | null;
}

export interface Analysis {
  insights: string[];
  recommendations: string[];
  pricingModelBreakdown: Record<string, number>;
  normalizedPrices?: Record<string, NormalizedPricing>;
  yourPosition?: number;
  analyzedAt?: string;
}

export type DetailLevel = 'low' | 'medium' | 'high';

export interface PricingState {
  baseline: BaselinePricing | null;
  competitors: Competitor[];
  scrapingResults: Record<string, ScrapingStatus>;
  analysis: Analysis | null;
  currentStep: 1 | 2 | 3 | 4;
  detailLevel: DetailLevel;
  lastUpdated: number | null;
  // New fields
  isFirstLoad?: boolean;
  editHistory?: EditHistory[];
}

export type SSEEventType =
  | 'url_generation_start'
  | 'url_generation_complete'
  | 'competitor_start'
  | 'competitor_step'
  | 'competitor_complete'
  | 'competitor_error'
  | 'analysis_start'
  | 'analysis_complete'
  | 'all_complete'
  | 'error';

export interface SSEEvent {
  type: SSEEventType;
  competitor?: string;
  data?: unknown;
  step?: string;
  error?: string;
  streamingUrl?: string;
  timestamp: number;
}

// Spreadsheet row type for UI
export interface SpreadsheetRow {
  competitorId: string;
  competitorName: string;
  tier: PricingTier;
  tierIndex: number;
  verificationSource?: string;
  dataQualityNotes?: string;
  scrapedAt?: string;
}
