export interface PharmacyProduct {
  product_name: string;
  brand: string | null;
  dosage_form:
    | "tablet"
    | "capsule"
    | "syrup"
    | "cream"
    | "sachet"
    | "tube"
    | "bottle"
    | "other";
  quantity: string | null;
  original_price: number | null;
  sale_price: number | null;
  price_unit: string | null;
  quantity_per_unit: number | null;
  price_per_unit: number | null;
  stock_status:
    | "in_stock"
    | "out_of_stock"
    | "prescription_required"
    | "limited";
  product_url: string | null;
  promo_badge: string | null;
}

export interface PharmacyResult {
  pharmacy: string;
  search_term: string;
  products: PharmacyProduct[];
  error?: string;
  source?: "cache" | "live";
  cached_at?: string;
}

export interface StreamingPreview {
  siteUrl: string;
  streamingUrl: string;
  done: boolean;
}

export interface SearchState {
  results: PharmacyResult[];
  isSearching: boolean;
  progress: { completed: number; total: number };
  error: string | null;
  elapsed: string | null;
  cachedCount: number;
  streamingUrls: StreamingPreview[];
}
