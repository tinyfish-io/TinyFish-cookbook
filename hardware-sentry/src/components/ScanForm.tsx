'use client';

import { useState } from 'react';
import { getAllSKUs } from '@/lib/config';
import { showToast } from './Toast';
import { RippleButton } from './RippleButton';

export default function ScanForm() {
  const [selectedSKU, setSelectedSKU] = useState('pi5-8gb');
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const skus = getAllSKUs();

  const handleScan = async () => {
    // Optimistic UI: Update state immediately
    setIsScanning(true);
    setError(null);
    setProgress(0);

    // Dispatch scan start event for skeleton loading
    window.dispatchEvent(new Event('scanStart'));

    // Show info toast
    showToast({
      message: 'Scanning vendors for latest prices...',
      type: 'info',
      duration: 3000,
    });

    // Simulate progress for better UX
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 15;
      });
    }, 500);

    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sku: selectedSKU }),
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Scan failed');
      }

      const result = await response.json();

      // Dispatch custom event to notify ResultsTable
      window.dispatchEvent(
        new CustomEvent('scanComplete', { detail: result })
      );

      // Show success toast
      showToast({
        message: `Scan complete! Found ${result.vendors.length} vendor results.`,
        type: 'success',
        duration: 4000,
      });
    } catch (err) {
      clearInterval(progressInterval);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Scan error:', err);

      // Show error toast
      showToast({
        message: `Scan failed: ${errorMessage}`,
        type: 'error',
        duration: 5000,
      });
    } finally {
      setIsScanning(false);
      setTimeout(() => setProgress(0), 500);
    }
  };

  return (
    <div className="space-y-4">
      {/* SKU Selector */}
      <div>
        <label
          htmlFor="sku-select"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Select Hardware
        </label>
        <select
          id="sku-select"
          value={selectedSKU}
          onChange={(e) => setSelectedSKU(e.target.value)}
          disabled={isScanning}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          {skus.map((sku) => (
            <option key={sku.id} value={sku.id}>
              {sku.displayName} — {sku.description}
            </option>
          ))}
        </select>
      </div>

      {/* Scan Button */}
      <div>
        <RippleButton
          onClick={handleScan}
          disabled={isScanning}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
        >
          {isScanning ? (
            <>
              <div className="spinner border-white border-t-transparent"></div>
              <span>Scanning vendors...</span>
            </>
          ) : (
            <>
              <span>🔍</span>
              <span>Start Scan</span>
            </>
          )}
        </RippleButton>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">
            <strong>Error:</strong> {error}
          </p>
        </div>
      )}

      {/* Progress Bar */}
      {isScanning && (
        <div className="space-y-2">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800 mb-2">
              Scanning multiple retailers... This may take up to 45 seconds.
            </p>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-xs text-blue-600 mt-1">
              {Math.round(progress)}% complete
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
