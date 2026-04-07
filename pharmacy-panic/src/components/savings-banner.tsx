"use client";

import type { PharmacyResult } from "@/lib/types";
import { formatVND } from "@/lib/normalize";

interface SavingsBannerProps {
  results: PharmacyResult[];
}

export function SavingsBanner({ results }: SavingsBannerProps) {
  // Return null if no results
  if (!results || results.length === 0) {
    return null;
  }

  // Flatten all products with their pharmacy info
  const allProducts = results.flatMap((result) =>
    result.products.map((product) => ({
      ...product,
      pharmacy: result.pharmacy,
    }))
  );

  // Filter products with valid prices
  const productsWithPrices = allProducts.filter((p) => {
    const price = p.sale_price ?? p.original_price;
    return price !== null && price > 0;
  });

  // Return null if no products with prices
  if (productsWithPrices.length === 0) {
    return null;
  }

  // Return null if only 1 result (no comparison possible)
  if (results.length === 1) {
    return null;
  }

  // Find cheapest product
  const cheapest = productsWithPrices.reduce((min, product) => {
    const minPrice = min.sale_price ?? min.original_price ?? Infinity;
    const productPrice = product.sale_price ?? product.original_price ?? Infinity;
    return productPrice < minPrice ? product : min;
  });

  const cheapestPrice = cheapest.sale_price ?? cheapest.original_price!;

  // Find most expensive product with same product name (substring match)
  const sameProductMatches = productsWithPrices.filter((p) =>
    p.product_name.toLowerCase().includes(cheapest.product_name.toLowerCase())
  );

  if (sameProductMatches.length < 2) {
    // Not enough matches for meaningful comparison
    return null;
  }

  const mostExpensive = sameProductMatches.reduce((max, product) => {
    const maxPrice = max.sale_price ?? max.original_price ?? 0;
    const productPrice = product.sale_price ?? product.original_price ?? 0;
    return productPrice > maxPrice ? product : max;
  });

  const mostExpensivePrice = mostExpensive.sale_price ?? mostExpensive.original_price!;

  // Calculate savings
  const priceDifference = mostExpensivePrice - cheapestPrice;
  const savingsPercent = Math.round((priceDifference / mostExpensivePrice) * 100);

  // Only show if meaningful savings (>10%)
  if (savingsPercent < 10) {
    return null;
  }

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
      <div className="flex items-center gap-2">
        <span className="text-lg">💰</span>
        <div className="flex-1">
          <p className="font-semibold">
            Cheapest found at <span className="font-bold">{cheapest.pharmacy}</span> —{" "}
            {formatVND(cheapestPrice)}
          </p>
          <p className="text-sm">
            Save up to {savingsPercent}% vs {mostExpensive.pharmacy}
          </p>
        </div>
      </div>
    </div>
  );
}
