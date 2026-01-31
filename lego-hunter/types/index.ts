// Retailer configuration
export interface Retailer {
  name: string
  url: string
  logo?: string
}

// Product data extracted from retailers
export interface ProductData {
  retailer: string
  inStock: boolean
  price: string
  currency: string
  shipping: string
  productUrl: string
}

// Status tracking for each retailer during search
export interface RetailerStatus {
  name: string
  status: 'idle' | 'searching' | 'complete' | 'error'
  streamingUrl?: string
  steps: string[]
  data?: ProductData
  stockFound?: boolean
  error?: string
}

// Gemini's deal analysis result
export interface DealAnalysis {
  bestRetailer: string
  reason: string
  totalCost: string
  savings: string
  alternativeOptions?: Array<{
    retailer: string
    cost: string
    pros: string[]
  }>
}

// SSE event types sent from API to frontend
export type SSEEventType =
  | 'retailer_start'
  | 'retailer_step'
  | 'retailer_complete'
  | 'retailer_stock_found'
  | 'retailer_error'
  | 'analysis_complete'
  | 'error'

export interface SSEEvent {
  type: SSEEventType
  retailer?: string
  step?: string
  data?: ProductData
  streamingUrl?: string
  bestDeal?: DealAnalysis
  error?: string
  timestamp?: number
}

// API request types
export interface GenerateUrlsRequest {
  legoSetName: string
}

export interface GenerateUrlsResponse {
  retailers: Retailer[]
}

export interface SearchLegoRequest {
  legoSetName: string
  maxBudget: number
  retailers: Retailer[]
}

// Mino API types
export interface MinoRequest {
  url: string
  goal: string
  browser_profile?: 'lite' | 'stealth'
  proxy_config?: {
    enabled: boolean
    country_code: string
  }
}

export interface MinoSSEEvent {
  type: 'STEP' | 'COMPLETE' | 'ERROR'
  status?: string
  step?: string
  message?: string
  streamingUrl?: string
  resultJson?: ProductData
}
