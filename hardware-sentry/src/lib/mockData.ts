/**
 * Mock data for testing without API keys
 * Set ENABLE_MOCK_DATA=true in .env.local to use
 */

import { ScanResult } from './tinyfish';

export const MOCK_SCAN_RESULTS: Record<string, ScanResult> = {
  'pi5-8gb': {
    sku: 'pi5-8gb',
    scannedAt: new Date().toISOString(),
    vendors: [
      {
        name: 'Raspberry Pi Official Store',
        url: 'https://www.raspberrypi.com/products/raspberry-pi-5/',
        price: 80.0,
        currency: 'GBP',
        inStock: true,
        stockLevel: 'In Stock',
        notes: 'Usually ships within 24 hours',
      },
      {
        name: 'Amazon UK',
        url: 'https://www.amazon.co.uk/dp/B0CTQ3BQLS',
        price: 85.99,
        currency: 'GBP',
        inStock: true,
        stockLevel: 'Only 3 left in stock',
        notes: 'Prime eligible - Free delivery',
      },
      {
        name: 'Pimoroni',
        url: 'https://shop.pimoroni.com/products/raspberry-pi-5',
        price: 79.5,
        currency: 'GBP',
        inStock: false,
        stockLevel: 'Out of Stock',
        notes: 'Sign up for restock notifications',
      },
      {
        name: 'The Pi Hut',
        url: 'https://thepihut.com/products/raspberry-pi-5',
        price: 81.0,
        currency: 'GBP',
        inStock: true,
        stockLevel: 'In Stock',
        notes: 'Ships same day if ordered before 2pm',
      },
    ],
  },

  'jetson-orin-nano': {
    sku: 'jetson-orin-nano',
    scannedAt: new Date().toISOString(),
    vendors: [
      {
        name: 'NVIDIA Store',
        url: 'https://store.nvidia.com/en-gb/jetson/store/',
        price: 499.0,
        currency: 'USD',
        inStock: true,
        stockLevel: 'In Stock',
        notes: 'Developer Kit includes carrier board',
      },
      {
        name: 'Amazon UK',
        url: 'https://www.amazon.co.uk/dp/B0BZJTQ5YP',
        price: 445.99,
        currency: 'GBP',
        inStock: false,
        stockLevel: 'Currently unavailable',
        notes: 'Check back for availability',
      },
    ],
  },
};

/**
 * Get mock scan result with optional delay to simulate API call
 */
export async function getMockScanResult(
  sku: string,
  delayMs = 2000
): Promise<ScanResult> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, delayMs));

  const mockResult = MOCK_SCAN_RESULTS[sku];

  if (!mockResult) {
    throw new Error(`No mock data available for SKU: ${sku}`);
  }

  // Return fresh timestamp
  return {
    ...mockResult,
    scannedAt: new Date().toISOString(),
  };
}

/**
 * Check if mock mode is enabled
 */
export function isMockModeEnabled(): boolean {
  return process.env.ENABLE_MOCK_DATA === 'true';
}
