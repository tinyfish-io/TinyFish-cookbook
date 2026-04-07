import { describe, it, expect } from "vitest";
import {
  normalizePrice,
  normalizeDosageForm,
  normalizeStockStatus,
  computePricePerUnit,
  normalizePharmacyResult,
  isEmptyResult,
  formatVND,
} from "@/lib/normalize";
import type { PharmacyResult, PharmacyProduct } from "@/lib/types";

// ---------------------------------------------------------------------------
// normalizePrice
// ---------------------------------------------------------------------------

describe("normalizePrice", () => {
  it('parses "32,000₫" → 32000', () => {
    expect(normalizePrice("32,000₫")).toBe(32000);
  });

  it('parses "28.500 VND" → 28500', () => {
    expect(normalizePrice("28.500 VND")).toBe(28500);
  });

  it('parses plain "32000" → 32000', () => {
    expect(normalizePrice("32000")).toBe(32000);
  });

  it("returns null for null", () => {
    expect(normalizePrice(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(normalizePrice(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(normalizePrice("")).toBeNull();
  });

  it('returns null for non-numeric text like "Liên hệ"', () => {
    expect(normalizePrice("Liên hệ")).toBeNull();
  });

  it("preserves 0 as valid price", () => {
    expect(normalizePrice(0)).toBe(0);
  });

  it('parses "1.500₫" → 1500', () => {
    expect(normalizePrice("1.500₫")).toBe(1500);
  });

  it("returns null for NaN number input", () => {
    expect(normalizePrice(NaN)).toBeNull();
  });

  it('parses "1.250.000" → 1250000', () => {
    expect(normalizePrice("1.250.000")).toBe(1250000);
  });
});

// ---------------------------------------------------------------------------
// normalizeDosageForm
// ---------------------------------------------------------------------------

describe("normalizeDosageForm", () => {
  it('"viên nén" → "tablet"', () => {
    expect(normalizeDosageForm("viên nén")).toBe("tablet");
  });

  it('"viên" → "tablet"', () => {
    expect(normalizeDosageForm("viên")).toBe("tablet");
  });

  it('"viên nang" → "capsule"', () => {
    expect(normalizeDosageForm("viên nang")).toBe("capsule");
  });

  it('"siro" → "syrup"', () => {
    expect(normalizeDosageForm("siro")).toBe("syrup");
  });

  it('"kem" → "cream"', () => {
    expect(normalizeDosageForm("kem")).toBe("cream");
  });

  it('"gói" → "sachet"', () => {
    expect(normalizeDosageForm("gói")).toBe("sachet");
  });

  it('"chai" → "bottle"', () => {
    expect(normalizeDosageForm("chai")).toBe("bottle");
  });

  it("null → 'other'", () => {
    expect(normalizeDosageForm(null)).toBe("other");
  });

  it('"unknown" → "other"', () => {
    expect(normalizeDosageForm("unknown")).toBe("other");
  });

  it("is case-insensitive", () => {
    expect(normalizeDosageForm("VIÊN NÉN")).toBe("tablet");
    expect(normalizeDosageForm("Siro")).toBe("syrup");
  });
});

// ---------------------------------------------------------------------------
// normalizeStockStatus
// ---------------------------------------------------------------------------

describe("normalizeStockStatus", () => {
  it('"Còn hàng" → "in_stock"', () => {
    expect(normalizeStockStatus("Còn hàng")).toBe("in_stock");
  });

  it('"Hết hàng" → "out_of_stock"', () => {
    expect(normalizeStockStatus("Hết hàng")).toBe("out_of_stock");
  });

  it('"Cần tư vấn dược sĩ" → "prescription_required"', () => {
    expect(normalizeStockStatus("Cần tư vấn dược sĩ")).toBe(
      "prescription_required",
    );
  });

  it("null defaults to 'in_stock'", () => {
    expect(normalizeStockStatus(null)).toBe("in_stock");
  });

  it('"available" → "in_stock"', () => {
    expect(normalizeStockStatus("available")).toBe("in_stock");
  });

  it('"limited" → "limited"', () => {
    expect(normalizeStockStatus("limited")).toBe("limited");
  });

  it("unrecognised strings default to 'in_stock'", () => {
    expect(normalizeStockStatus("something random")).toBe("in_stock");
  });
});

// ---------------------------------------------------------------------------
// computePricePerUnit
// ---------------------------------------------------------------------------

describe("computePricePerUnit", () => {
  it("(32000, 12) → 2667", () => {
    expect(computePricePerUnit(32000, 12)).toBe(2667);
  });

  it("(null, 12) → null", () => {
    expect(computePricePerUnit(null, 12)).toBeNull();
  });

  it("(32000, null) → null", () => {
    expect(computePricePerUnit(32000, null)).toBeNull();
  });

  it("(32000, 0) → null (division by zero guard)", () => {
    expect(computePricePerUnit(32000, 0)).toBeNull();
  });

  it("rounds result to nearest integer", () => {
    expect(computePricePerUnit(10000, 3)).toBe(3333);
  });
});

// ---------------------------------------------------------------------------
// formatVND
// ---------------------------------------------------------------------------

describe("formatVND", () => {
  it('32000 → "32.000₫"', () => {
    expect(formatVND(32000)).toBe("32.000₫");
  });

  it('1500 → "1.500₫"', () => {
    expect(formatVND(1500)).toBe("1.500₫");
  });

  it('500 → "500₫" (no separator needed)', () => {
    expect(formatVND(500)).toBe("500₫");
  });

  it('1250000 → "1.250.000₫"', () => {
    expect(formatVND(1250000)).toBe("1.250.000₫");
  });
});

// ---------------------------------------------------------------------------
// isEmptyResult
// ---------------------------------------------------------------------------

describe("isEmptyResult", () => {
  const baseResult: Omit<PharmacyResult, "products"> = {
    pharmacy: "Test Pharmacy",
    search_term: "paracetamol",
  };

  it("returns true for empty products array", () => {
    expect(isEmptyResult({ ...baseResult, products: [] })).toBe(true);
  });

  it("returns true when all products have empty name and null price", () => {
    const product = {
      product_name: "",
      brand: null,
      dosage_form: "other",
      quantity: null,
      original_price: null,
      sale_price: null,
      price_unit: null,
      quantity_per_unit: null,
      price_per_unit: null,
      stock_status: "in_stock",
      product_url: null,
      promo_badge: null,
    } satisfies PharmacyProduct;

    expect(isEmptyResult({ ...baseResult, products: [product] })).toBe(true);
  });

  it("returns false when a product has a name and price", () => {
    const product = {
      product_name: "Paracetamol",
      brand: null,
      dosage_form: "tablet",
      quantity: null,
      original_price: 5000,
      sale_price: null,
      price_unit: null,
      quantity_per_unit: null,
      price_per_unit: null,
      stock_status: "in_stock",
      product_url: null,
      promo_badge: null,
    } satisfies PharmacyProduct;

    expect(isEmptyResult({ ...baseResult, products: [product] })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// normalizePharmacyResult
// ---------------------------------------------------------------------------

describe("normalizePharmacyResult", () => {
  it("normalizes a raw result with products array", () => {
    const raw = {
      pharmacy: "Long Châu",
      search_term: "paracetamol",
      products: [
        {
          product_name: "Panadol Extra 500mg",
          original_price: "32.000₫",
          dosage_form: "viên nén",
          stock_status: "Còn hàng",
        },
      ],
    };

    const result = normalizePharmacyResult(raw);

    expect(result.pharmacy).toBe("Long Châu");
    expect(result.search_term).toBe("paracetamol");
    expect(result.products).toHaveLength(1);
    expect(result.products[0].product_name).toBe("Panadol Extra 500mg");
    expect(result.products[0].original_price).toBe(32000);
    expect(result.products[0].dosage_form).toBe("tablet");
    expect(result.products[0].stock_status).toBe("in_stock");
  });

  it("returns empty products for null products field", () => {
    const raw = {
      pharmacy: "Pharmacity",
      search_term: "amoxicillin",
      products: null,
    };

    const result = normalizePharmacyResult(raw);
    expect(result.products).toEqual([]);
  });

  it("filters out products with empty product_name", () => {
    const raw = {
      pharmacy: "An Khang",
      search_term: "vitamin C",
      products: [
        { product_name: "", original_price: 5000 },
        { product_name: "Vitamin C DHG", original_price: 15000 },
      ],
    };

    const result = normalizePharmacyResult(raw);
    expect(result.products).toHaveLength(1);
    expect(result.products[0].product_name).toBe("Vitamin C DHG");
  });

  it("defaults pharmacy to 'Unknown Pharmacy' when missing", () => {
    const raw = { products: [] };
    expect(normalizePharmacyResult(raw).pharmacy).toBe("Unknown Pharmacy");
  });

  it("wraps a single object product into an array", () => {
    const raw = {
      pharmacy: "Test",
      search_term: "test",
      products: {
        product_name: "Single Product",
        original_price: 10000,
      },
    };

    const result = normalizePharmacyResult(raw);
    expect(result.products).toHaveLength(1);
    expect(result.products[0].product_name).toBe("Single Product");
  });

  it("sets source to 'live' by default", () => {
    const raw = { pharmacy: "Test", products: [] };
    expect(normalizePharmacyResult(raw).source).toBe("live");
  });

  it("preserves source 'cache' when set", () => {
    const raw = { pharmacy: "Test", products: [], source: "cache" };
    expect(normalizePharmacyResult(raw).source).toBe("cache");
  });
});
