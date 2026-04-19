// Retailer discovered via TinyFish Search API
export interface Retailer {
  name: string;
  url: string;
  logo?: string;
}

// Product data extracted by TinyFish browser agent
export interface ProductData {
  retailer: string;
  inStock: boolean;
  price: string;
  currency: string;
  shipping: string;
  productUrl: string;
}

// Status tracking for each retailer during search
export interface RetailerStatus {
  name: string;
  status: "idle" | "searching" | "complete" | "error";
  streamingUrl?: string;
  steps: string[];
  data?: ProductData;
  stockFound?: boolean;
  error?: string;
}

// Deal analysis result
export interface DealAnalysis {
  bestRetailer: string;
  reason: string;
  totalCost: string;
  savings: string;
  alternativeOptions?: Array<{
    retailer: string;
    cost: string;
    pros: string[];
  }>;
}

// SSE event types sent from API to frontend
export type SSEEventType =
  | "retailer_start"
  | "retailer_step"
  | "retailer_complete"
  | "retailer_stock_found"
  | "retailer_error"
  | "analysis_complete"
  | "error";

export interface SSEEvent {
  type: SSEEventType;
  retailer?: string;
  step?: string;
  data?: ProductData;
  streamingUrl?: string;
  bestDeal?: DealAnalysis;
  error?: string;
  timestamp?: number;
}

// API request types
export interface DiscoverRetailersRequest {
  legoSetName: string;
}

export interface SearchLegoRequest {
  legoSetName: string;
  maxBudget: number;
  retailers: Retailer[];
}
