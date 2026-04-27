export interface Product {
  name: string;
  original_price: string | null;
  sale_price: string | null;
  condition: string | null;
  product_url: string | null;
}

export function validateUrl(url: unknown): string | null {
  if (!url || typeof url !== 'string') return null;
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    return url;
  } catch {
    return null;
  }
}

export function sanitizeProduct(p: Record<string, unknown>): Product {
  return {
    name: String(p.name ?? p.title ?? p.product_name ?? 'Unknown').slice(0, 200),
    original_price: p.original_price != null ? String(p.original_price).slice(0, 20) : null,
    sale_price: (p.sale_price ?? p.price) != null ? String(p.sale_price ?? p.price).slice(0, 20) : null,
    condition: p.condition != null ? String(p.condition).slice(0, 50) : null,
    product_url: validateUrl(p.product_url ?? p.url ?? p.link ?? p.href),
  };
}

export function extractProducts(raw: unknown): Product[] {
  if (raw == null) return [];

  // Already an array of objects
  if (Array.isArray(raw)) {
    const items = raw.filter((i): i is Record<string, unknown> => !!i && typeof i === 'object');
    if (items.length > 0) return items.map(sanitizeProduct);
    return [];
  }

  // String — parse as JSON
  if (typeof raw === 'string') {
    const clean = raw.replace(/```json\n?|```/g, '').trim();
    // Try direct parse
    try {
      const parsed = JSON.parse(clean);
      return extractProducts(parsed);
    } catch { /* fall through */ }
    // Find JSON array inside the string
    const arrMatch = clean.match(/\[[\s\S]*\]/);
    if (arrMatch) {
      try { return extractProducts(JSON.parse(arrMatch[0])); } catch { }
    }
    return [];
  }

  // Object — find the products array
  if (typeof raw === 'object' && raw !== null) {
    const obj = raw as Record<string, unknown>;
    // Check common array keys
    for (const key of ['products', 'items', 'results', 'data', 'result']) {
      if (Array.isArray(obj[key]) && (obj[key] as unknown[]).length > 0) {
        return extractProducts(obj[key]);
      }
    }
    // If the object itself looks like a product, wrap it
    if (obj.name || obj.title || obj.product_name) {
      return [sanitizeProduct(obj)];
    }
    // Any array value
    for (const val of Object.values(obj)) {
      if (Array.isArray(val) && val.length > 0 && val[0] && typeof val[0] === 'object') {
        return extractProducts(val);
      }
    }
    // Try parsing string values that might be JSON
    for (const val of Object.values(obj)) {
      if (typeof val === 'string' && val.includes('[')) {
        const result = extractProducts(val);
        if (result.length > 0) return result;
      }
    }
  }

  return [];
}

export function filterByPrice(products: Product[], maxPrice: number): Product[] {
  return products.filter(p => {
    const priceStr = p.sale_price ?? p.original_price ?? '';
    const match = String(priceStr).replace(/,/g, '').match(/[\d.]+/);
    if (!match) return true; // include if no parseable price (let frontend decide)
    return parseFloat(match[0]) <= maxPrice;
  });
}
