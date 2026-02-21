# Directive: Scan Hardware Availability

## Goal
Extract real-time pricing and availability data from multiple retailer websites for specific hardware SKUs using TinyFish Web Agents.

## Inputs
- **SKU ID**: Identifier for the hardware (e.g., "pi5-8gb", "jetson-orin-nano")
- **Vendor URLs**: Array of retailer product page URLs to scan

## Tools/Scripts to Use
- **TinyFish API**: `https://agent.tinyfish.ai/v1/automation/run-sse`
- **Implementation**: `src/lib/tinyfish.ts` → `scanHardware()` function
- **Config**: `src/lib/config.ts` → `VENDOR_CONFIGS` object

## Outputs
Structured JSON in this exact format:
```json
{
  "sku": "pi5-8gb",
  "scannedAt": "2026-02-15T18:53:00Z",
  "vendors": [
    {
      "name": "Raspberry Pi Official Store",
      "url": "https://www.raspberrypi.com/products/raspberry-pi-5/",
      "price": 80.00,
      "currency": "GBP",
      "inStock": true,
      "stockLevel": "In Stock",
      "notes": "Usually ships in 24 hours"
    }
  ]
}
```

## TinyFish Goal String

Use this exact goal string for consistent results:

```
For each URL provided, extract the following information about the product:

1. Current price (numeric value only, excluding currency symbol, or null if not available)
2. Currency code (GBP, USD, EUR, etc.)
3. Stock availability (true if "Add to Cart" button exists or "In Stock" shown, false otherwise)
4. Stock level description (exact text: "In Stock", "Out of Stock", "Only 3 left", "Pre-order", etc.)
5. Any relevant notes (shipping time, Prime eligibility, pre-order status, bundle info, etc.)

Return as JSON array:
[
  {
    "name": "vendor name from website title or header",
    "url": "the URL scanned",
    "price": numeric_price_or_null,
    "currency": "CURRENCY_CODE",
    "inStock": boolean,
    "stockLevel": "stock description",
    "notes": "relevant notes or empty string"
  }
]

Extraction rules:
- Extract bare board price, not kit/bundle (unless bare board unavailable)
- Amazon "Currently unavailable" → inStock: false
- Pre-orders: inStock: true but include "Pre-order" in stockLevel
- Multiple variants (4GB, 8GB): extract 8GB only
```

## Process Flow

1. **Receive scan request** via `/api/scan`
2. **Check Redis cache** (`scan:{sku}:latest`) for results <5 min old
3. If cache valid → return cached data
4. If stale/missing:
   - Acquire Redis lock (`scan:{sku}:lock`)
   - Look up vendor URLs from `VENDOR_CONFIGS[sku]`
   - Call TinyFish with URLs + goal
   - Stream SSE, parse "COMPLETE" event
   - Validate response structure
   - Save to Redis (latest + history)
   - Release lock
   - Return results

## Edge Cases

### 1. Partial Failures
If TinyFish succeeds on 2 of 4 vendors:
- Return 2 successful results
- Include error messages for failures
- Set `partial: true` flag

### 2. All Out of Stock
- Still return scan results (price may be shown)
- Frontend handles display

### 3. Price Variations
Multiple prices (kit vs bare):
- Prefer bare board
- Note: "Kit price: £XX available"

### 4. Timeout
If >90 seconds:
- Return cached results with "stale" warning
- Don't wait indefinitely

### 5. Rate Limits
If 429 Too Many Requests:
- Exponential backoff (2s, 4s, 8s)
- Max 3 retries
- If all fail → cached data + error

## Expected Timing

- Single vendor: 10-20s
- 4 vendors parallel: 25-40s
- Redis cache read: <100ms
- Total user wait: <45s

## Success Criteria

✅ Valid JSON matching schema
✅ ≥75% vendors return data (3/4)
✅ Realistic prices (£40-£120 for Pi 5)
✅ Stock status matches manual check
✅ Results cached
✅ <45s completion

## Known Vendor Quirks

**Raspberry Pi Official**:
- "Notify when back in stock" instead of out-of-stock
- Price: ~£80 for 8GB

**Amazon UK**:
- Varies: "In Stock", "Only X left", "Temporarily out"
- Prices fluctuate ±£5
- Check "Ships from Amazon.co.uk"

**Pimoroni**:
- UK-based, GBP
- Bundles common
- Clear "Add to Cart" when in stock

**The Pi Hut**:
- UK-based, GBP
- Pre-order system during shortages
- "X in stock" label

## Self-Annealing

If directive fails:
1. Check TinyFish response logs
2. Verify vendor URLs still valid
3. Test goal string in TinyFish playground
4. Update goal if site structure changed
5. Update this directive with learnings

## Last Updated
2026-02-15 18:53 GMT
