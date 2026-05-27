'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { VendorResultWithChanges } from '@/lib/redis';

interface ScanResultDisplay {
  sku: string;
  scannedAt: string;
  vendors: VendorResultWithChanges[];
  cached?: boolean;
  stale?: boolean;
  partial?: boolean;
  errors?: string[];
}

export default function ResultsTable() {
  const [results, setResults] = useState<ScanResultDisplay | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleScanStart = () => {
      setLoading(true);
    };

    const handleScanComplete = (event: Event) => {
      const customEvent = event as CustomEvent<ScanResultDisplay>;
      setResults(customEvent.detail);
      setLoading(false);
    };

    window.addEventListener('scanStart', handleScanStart);
    window.addEventListener('scanComplete', handleScanComplete);

    return () => {
      window.removeEventListener('scanStart', handleScanStart);
      window.removeEventListener('scanComplete', handleScanComplete);
    };
  }, []);

  // Skeleton loading state
  if (loading) {
    return (
      <div className="glass-card overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
          <div className="h-6 bg-gray-300 rounded w-32 animate-shimmer mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-48 animate-shimmer"></div>
        </div>
        <div className="p-6 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4 animate-shimmer">
              <div className="h-12 bg-gray-200 rounded w-1/4"></div>
              <div className="h-12 bg-gray-200 rounded w-1/6"></div>
              <div className="h-12 bg-gray-200 rounded w-1/6"></div>
              <div className="h-12 bg-gray-200 rounded flex-1"></div>
              <div className="h-12 bg-gray-200 rounded w-20"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (!results) {
    return (
      <div className="glass-card p-12 text-center">
        <div className="max-w-md mx-auto">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Ready to Find Your Hardware?
          </h3>
          <p className="text-gray-600 mb-6">
            Select a product above and click &ldquo;Start Scan&rdquo; to compare prices and availability across 4+ retailers in seconds.
          </p>
          <div className="flex items-center justify-center gap-8 text-sm text-gray-500">
            <div className="flex flex-col items-center">
              <div className="text-2xl mb-1">⚡</div>
              <span>45s scans</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-2xl mb-1">📊</div>
              <span>Price tracking</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-2xl mb-1">🤖</div>
              <span>AI-powered</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const scanDate = new Date(results.scannedAt);
  const timeAgo = getTimeAgo(scanDate);

  const exportToCSV = () => {
    const headers = ['Vendor', 'Price', 'Currency', 'In Stock', 'Stock Level', 'Notes', 'URL'];
    const rows = results.vendors.map((vendor) => [
      vendor.name,
      vendor.price?.toFixed(2) || 'N/A',
      vendor.currency,
      vendor.inStock ? 'Yes' : 'No',
      vendor.stockLevel,
      vendor.notes || '',
      vendor.url,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `hardware-scan-${results.sku}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div
      className="glass-card overflow-hidden p-0"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 100, damping: 15 }}
    >
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Scan Results</h3>
            <p className="text-sm text-gray-600">
              {results.cached ? '💾 Cached' : '✅ Fresh'} • Scanned {timeAgo}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {results.stale && (
              <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded">
                Stale Data
              </span>
            )}
            <motion.button
              onClick={exportToCSV}
              className="bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium py-2 px-4 rounded transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              📥 Export CSV
            </motion.button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vendor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stock
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Notes
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Link
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {results.vendors.map((vendor, index) => (
              <motion.tr
                key={index}
                className="hover:bg-gray-50"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 100,
                  damping: 15,
                  delay: index * 0.1,
                }}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">{vendor.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {vendor.price !== null ? (
                    <div>
                      <div className="text-gray-900 font-semibold">
                        {vendor.currency} {vendor.price.toFixed(2)}
                      </div>
                      {vendor.changes?.priceChange?.isSignificant && (
                        <div
                          className={`text-xs mt-1 ${
                            vendor.changes.priceChange.delta > 0
                              ? 'text-red-600'
                              : 'text-green-600'
                          }`}
                        >
                          {vendor.changes.priceChange.delta > 0 ? '↑' : '↓'}{' '}
                          {vendor.currency}{' '}
                          {Math.abs(vendor.changes.priceChange.delta).toFixed(2)}{' '}
                          ({vendor.changes.priceChange.percentChange > 0 ? '+' : ''}
                          {vendor.changes.priceChange.percentChange.toFixed(1)}%)
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-gray-400 text-sm">N/A</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    {vendor.inStock ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ✓ {vendor.stockLevel}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        ✗ {vendor.stockLevel}
                      </span>
                    )}
                    {vendor.changes?.stockChange?.changed && (
                      <div className="text-xs text-gray-500 mt-1">
                        {vendor.changes.stockChange.new ? (
                          <span className="text-green-600">★ Back in stock!</span>
                        ) : (
                          <span className="text-red-600">★ Out of stock</span>
                        )}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-600 max-w-xs truncate">
                    {vendor.notes || '—'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <a
                    href={vendor.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Visit →
                  </a>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Errors */}
      {results.errors && results.errors.length > 0 && (
        <div className="bg-yellow-50 border-t border-yellow-200 px-6 py-4">
          <p className="text-sm font-medium text-yellow-800 mb-1">
            ⚠️ Some vendors failed to scan:
          </p>
          <ul className="list-disc list-inside text-sm text-yellow-700">
            {results.errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}
