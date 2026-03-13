/**
 * TinyFish Web Agents API Client
 * Layer 3 (Execution): Deterministic API client with SSE handling
 */

import { VendorConfig } from './config';
import { withRetry, isRetryableHttpError } from './retry';
import { tinyfishCircuitBreaker } from './circuitBreaker';

export interface VendorResult {
  name: string;
  url: string;
  price: number | null;
  currency: string;
  inStock: boolean;
  stockLevel: string;
  notes: string;
}

export interface ScanResult {
  sku: string;
  scannedAt: string;
  vendors: VendorResult[];
  partial?: boolean;
  errors?: string[];
}

const TINYFISH_API_URL = 'https://agent.tinyfish.ai/v1/automation/run-sse';
const SCAN_TIMEOUT_MS = 90000; // 90 seconds

const EXTRACTION_GOAL = `
For each URL provided, extract the following information about the product:

1. Current price (numeric value only, excluding currency symbol, or null if not available)
2. Currency code (GBP, USD, EUR, etc.)
3. Stock availability (true if "Add to Cart" button exists or "In Stock" shown, false otherwise)
4. Stock level description (exact text from page: "In Stock", "Out of Stock", "Only 3 left", "Pre-order", etc.)
5. Any relevant notes (shipping time, Prime eligibility, pre-order status, bundle information, etc.)

Return the result as a JSON array with this exact structure:
[
  {
    "name": "vendor name extracted from the website title or header",
    "url": "the URL that was scanned",
    "price": numeric_price_or_null,
    "currency": "CURRENCY_CODE",
    "inStock": boolean,
    "stockLevel": "stock description text",
    "notes": "relevant notes or empty string"
  }
]

Important extraction rules:
- Extract the bare board price, not kit or bundle prices (unless bare board is unavailable)
- For Amazon, prefer "Currently unavailable" → inStock: false
- For pre-orders, set inStock: true but include "Pre-order" in stockLevel
- If multiple variants shown (4GB, 8GB), extract the 8GB variant only
`.trim();

/**
 * Scan hardware availability across multiple vendors using TinyFish
 * This is a deterministic execution function (Layer 3)
 */
export async function scanHardware(
  sku: string,
  vendorConfigs: VendorConfig[]
): Promise<ScanResult> {
  const apiKey = process.env.TINYFISH_API_KEY;

  if (!apiKey) {
    throw new Error('TINYFISH_API_KEY environment variable not set');
  }

  console.log(`[TinyFish] Starting scan for ${sku} across ${vendorConfigs.length} vendors`);

  // Wrap in circuit breaker to prevent cascading failures
  return tinyfishCircuitBreaker.execute(async () => {
    // Wrap in retry logic for transient failures
    return withRetry(
      async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), SCAN_TIMEOUT_MS);

        try {
          const response = await fetch(TINYFISH_API_URL, {
            method: 'POST',
            headers: {
              'X-API-Key': apiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: vendorConfigs.map((v) => v.url),
              goal: EXTRACTION_GOAL,
            }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const error = new Error(
              `TinyFish API error: ${response.status} ${response.statusText}`
            );

            // Make retryable HTTP errors have the right name
            if (isRetryableHttpError(response.status)) {
              error.name = 'ETIMEDOUT'; // Retryable
            }

            throw error;
          }

          if (!response.body) {
            throw new Error('TinyFish response has no body');
          }

          const vendors = await parseSSEStream(response.body);

          return {
            sku,
            scannedAt: new Date().toISOString(),
            vendors,
          };
        } catch (error) {
          clearTimeout(timeoutId);

          if (error instanceof Error) {
            if (error.name === 'AbortError') {
              throw new Error(`TinyFish scan timeout after ${SCAN_TIMEOUT_MS / 1000}s`);
            }
            throw error;
          }

          throw new Error('Unknown error during TinyFish scan');
        }
      },
      {
        maxAttempts: 3,
        baseDelay: 2000, // 2 seconds
        maxDelay: 8000, // 8 seconds
      }
    );
  });
}

/**
 * Parse Server-Sent Events stream from TinyFish
 */
async function parseSSEStream(body: ReadableStream<Uint8Array>): Promise<VendorResult[]> {
  const reader = body.getReader();
  const decoder = new TextDecoder();

  let vendors: VendorResult[] = [];
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');

      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;

        try {
          const event = JSON.parse(line.slice(6));

          if (event.type === 'LOG') {
            console.log(`[TinyFish] ${event.message || 'Processing...'}`);
          }

          if (event.type === 'COMPLETE' && event.resultJson) {
            vendors = Array.isArray(event.resultJson)
              ? event.resultJson
              : [event.resultJson];

            console.log(`[TinyFish] Scan complete. Found ${vendors.length} results.`);
          }
        } catch {
          console.error('[TinyFish] Failed to parse SSE event:', line.slice(0, 100));
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (vendors.length === 0) {
    throw new Error('TinyFish returned no results');
  }

  return vendors;
}

export function validateVendorResult(result: unknown): result is VendorResult {
  return (
    typeof result === 'object' &&
    result !== null &&
    'name' in result &&
    'url' in result &&
    'price' in result &&
    'currency' in result &&
    'inStock' in result &&
    'stockLevel' in result &&
    'notes' in result &&
    typeof result.name === 'string' &&
    typeof result.url === 'string' &&
    (typeof result.price === 'number' || result.price === null) &&
    typeof result.currency === 'string' &&
    typeof result.inStock === 'boolean' &&
    typeof result.stockLevel === 'string' &&
    typeof result.notes === 'string'
  );
}
