export function extractListings(raw) {
  if (!raw) return [];
  try {
    const arr = findArray(raw);
    if (!arr) return [];
    return arr
      .filter((item) => item && typeof item === 'object')
      .map((item) => ({
        name: String(item.name ?? ''),
        property_type: item.property_type ? String(item.property_type) : null,
        price_per_night: toNumber(item.price_per_night),
        total_price: toNumber(item.total_price),
        rating: toNumber(item.rating),
        review_count: toNumber(item.review_count),
        listing_url: item.listing_url ? String(item.listing_url) : null,
        cleaning_fee: toNumber(item.cleaning_fee),
        service_fee: toNumber(item.service_fee),
        breakfast_included: item.breakfast_included != null ? Boolean(item.breakfast_included) : null,
        member_price: toNumber(item.member_price),
      }))
      .slice(0, 5);
  } catch {
    return [];
  }
}

// Walk the result object (any depth, any key) looking for the first non-empty array
// of objects that looks like listings.
function findArray(val) {
  if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') return val;

  if (typeof val === 'string') {
    // Strip markdown code fences the agent sometimes wraps around JSON
    const cleaned = val.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    try {
      const parsed = JSON.parse(cleaned);
      const result = findArray(parsed);
      if (result) return result;
    } catch {}
    return null;
  }

  if (val && typeof val === 'object' && !Array.isArray(val)) {
    // Try well-known keys first
    for (const key of ['output', 'result', 'data', 'listings', 'results', 'answer', 'content']) {
      if (val[key] !== undefined) {
        const found = findArray(val[key]);
        if (found) return found;
      }
    }
    // Fall back to scanning all values
    for (const v of Object.values(val)) {
      const found = findArray(v);
      if (found) return found;
    }
  }

  return null;
}

function toNumber(val) {
  if (val == null) return null;
  const n = parseFloat(String(val).replace(/[^0-9.]/g, ''));
  return isNaN(n) ? null : n;
}

export function sanitizeInput(input, maxLength = 100) {
  return String(input).replace(/[<>"'`]/g, '').trim().slice(0, maxLength);
}

export function calcNights(checkIn, checkOut) {
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(1, Math.round(ms / 86_400_000));
}

export function isValidDate(d) {
  return /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(new Date(d).getTime());
}
