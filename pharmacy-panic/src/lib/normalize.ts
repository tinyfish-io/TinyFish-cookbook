import type { PharmacyProduct, PharmacyResult } from "./types";

export function normalizePrice(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw === "number") return isNaN(raw) ? null : raw;

  const str = String(raw).trim();
  if (!str) return null;

  let cleaned = str.replace(/[₫đ]/g, "").replace(/VND/gi, "").trim();

  // VND has no decimal cents — dots and commas are always thousands separators
  cleaned = cleaned.replace(/[.,]/g, "");

  const n = Number(cleaned);
  return isNaN(n) || !isFinite(n) ? null : n;
}

export function normalizeDosageForm(
  raw: unknown
): PharmacyProduct["dosage_form"] {
  if (raw === null || raw === undefined) return "other";

  const str = String(raw).toLowerCase().trim();

  if (str === "viên nén" || str === "viên" || str === "tablet") return "tablet";
  if (str === "viên nang" || str === "capsule") return "capsule";
  if (str === "siro" || str === "xi-rô" || str === "syrup") return "syrup";
  if (str === "kem" || str === "tuýp" || str === "cream") return "cream";
  if (str === "gói" || str === "sachet") return "sachet";
  if (str === "tube") return "tube";
  if (str === "chai" || str === "bottle") return "bottle";

  return "other";
}

export function normalizeStockStatus(
  raw: unknown
): PharmacyProduct["stock_status"] {
  if (raw === null || raw === undefined) return "in_stock";

  const str = String(raw).toLowerCase().trim();

  if (
    str === "còn hàng" ||
    str === "in_stock" ||
    str === "available"
  ) {
    return "in_stock";
  }
  if (
    str === "hết hàng" ||
    str === "out_of_stock" ||
    str === "unavailable"
  ) {
    return "out_of_stock";
  }
  if (str === "cần tư vấn dược sĩ" || str === "prescription_required") {
    return "prescription_required";
  }
  if (str === "limited") return "limited";

  return "in_stock";
}

export function computePricePerUnit(
  price: number | null,
  quantityPerUnit: number | null
): number | null {
  if (price === null || quantityPerUnit === null || quantityPerUnit === 0) {
    return null;
  }
  return Math.round(price / quantityPerUnit);
}

export function normalizeProduct(raw: unknown): PharmacyProduct {
  const obj = raw as Record<string, unknown>;

  const productName = String(obj.product_name || "").trim();
  const originalPrice = normalizePrice(obj.original_price);
  const salePrice = normalizePrice(obj.sale_price);
  const quantityPerUnit = obj.quantity_per_unit
    ? Number(obj.quantity_per_unit)
    : null;

  const effectivePrice = salePrice ?? originalPrice;
  const pricePerUnit = computePricePerUnit(
    effectivePrice,
    isNaN(quantityPerUnit as number) ? null : quantityPerUnit
  );

  return {
    product_name: productName,
    brand: obj.brand ? String(obj.brand).trim() : null,
    dosage_form: normalizeDosageForm(obj.dosage_form),
    quantity: obj.quantity ? String(obj.quantity).trim() : null,
    original_price: originalPrice,
    sale_price: salePrice,
    price_unit: obj.price_unit ? String(obj.price_unit).trim() : null,
    quantity_per_unit: isNaN(quantityPerUnit as number)
      ? null
      : quantityPerUnit,
    price_per_unit: pricePerUnit,
    stock_status: normalizeStockStatus(obj.stock_status),
    product_url: obj.product_url ? String(obj.product_url).trim() || null : null,
    promo_badge: obj.promo_badge ? String(obj.promo_badge).trim() || null : null,
  };
}

export function normalizePharmacyResult(raw: unknown): PharmacyResult {
  const obj = raw as Record<string, unknown>;

  let products: unknown[] = [];
  if (Array.isArray(obj.products)) {
    products = obj.products;
  } else if (obj.products && typeof obj.products === "object") {
    products = [obj.products];
  }

  const normalizedProducts: PharmacyProduct[] = products
    .map((p) => normalizeProduct(p))
    .filter((p) => p.product_name !== "");

  return {
    pharmacy: String(obj.pharmacy || "Unknown Pharmacy"),
    search_term: String(obj.search_term || ""),
    products: normalizedProducts,
    error: obj.error ? String(obj.error) : undefined,
    source: obj.source === "cache" ? "cache" : "live",
    cached_at: obj.cached_at ? String(obj.cached_at) : undefined,
  };
}

export function isEmptyResult(result: PharmacyResult): boolean {
  if (result.products.length === 0) return true;

  return result.products.every(
    (p) => !p.product_name && p.original_price === null
  );
}

export function formatVND(amount: number): string {
  const formatted = amount
    .toFixed(0)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${formatted}₫`;
}
