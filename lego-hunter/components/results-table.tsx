'use client'

import { useState, useMemo } from 'react'
import { ExternalLink, ArrowUpDown, Package, PackageX } from 'lucide-react'
import type { ProductData } from '@/types'

interface ResultsTableProps {
  results: ProductData[]
}

type SortField = 'retailer' | 'price' | 'inStock'
type SortDirection = 'asc' | 'desc'

export function ResultsTable({ results }: ResultsTableProps) {
  const [sortField, setSortField] = useState<SortField>('price')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [showOutOfStock, setShowOutOfStock] = useState(true)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedResults = useMemo(() => {
    let filtered = results
    if (!showOutOfStock) {
      filtered = results.filter(r => r.inStock)
    }

    return [...filtered].sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'retailer':
          comparison = a.retailer.localeCompare(b.retailer)
          break
        case 'price':
          const priceA = parseFloat(a.price) || 0
          const priceB = parseFloat(b.price) || 0
          // Put in-stock items first when sorting by price
          if (a.inStock && !b.inStock) return -1
          if (!a.inStock && b.inStock) return 1
          comparison = priceA - priceB
          break
        case 'inStock':
          comparison = Number(b.inStock) - Number(a.inStock)
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [results, sortField, sortDirection, showOutOfStock])

  const inStockCount = results.filter(r => r.inStock).length

  if (results.length === 0) {
    return (
      <div className="text-center py-8 text-[var(--lego-black)]/60">
        No results yet
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filter controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold text-[var(--lego-black)]">
            {inStockCount} of {results.length} in stock
          </span>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showOutOfStock}
              onChange={e => setShowOutOfStock(e.target.checked)}
              className="w-4 h-4 accent-[var(--lego-blue)]"
            />
            Show out of stock
          </label>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border-3 border-[var(--lego-blue)]">
        <table className="w-full lego-table">
          <thead>
            <tr>
              <th
                className="px-4 py-3 text-left cursor-pointer hover:bg-[var(--lego-blue-dark)]"
                onClick={() => handleSort('retailer')}
              >
                <div className="flex items-center gap-2">
                  Retailer
                  <ArrowUpDown className="w-4 h-4" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-left cursor-pointer hover:bg-[var(--lego-blue-dark)]"
                onClick={() => handleSort('inStock')}
              >
                <div className="flex items-center gap-2">
                  Status
                  <ArrowUpDown className="w-4 h-4" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-left cursor-pointer hover:bg-[var(--lego-blue-dark)]"
                onClick={() => handleSort('price')}
              >
                <div className="flex items-center gap-2">
                  Price
                  <ArrowUpDown className="w-4 h-4" />
                </div>
              </th>
              <th className="px-4 py-3 text-left">Shipping</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {sortedResults.map((result, index) => (
              <tr
                key={`${result.retailer}-${index}`}
                className={`border-b border-[var(--lego-gray-dark)] ${
                  !result.inStock ? 'out-of-stock' : ''
                }`}
              >
                <td className="px-4 py-3">
                  <span className="font-medium">{result.retailer}</span>
                </td>
                <td className="px-4 py-3">
                  {result.inStock ? (
                    <span className="inline-flex items-center gap-1 text-[var(--lego-green)] font-bold">
                      <Package className="w-4 h-4" />
                      In Stock
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[var(--lego-red)]">
                      <PackageX className="w-4 h-4" />
                      Out of Stock
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {result.inStock && result.price !== '0' ? (
                    <span className="font-bold">
                      {result.currency === 'USD' ? '$' : result.currency}
                      {result.price}
                    </span>
                  ) : (
                    <span className="text-[var(--lego-black)]/40">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm">
                  {result.inStock ? result.shipping : '-'}
                </td>
                <td className="px-4 py-3 text-center">
                  {result.inStock ? (
                    <a
                      href={result.productUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="lego-button-blue inline-flex items-center gap-1 px-3 py-1.5 text-sm"
                    >
                      View
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <button
                      className="px-3 py-1.5 text-sm border-2 border-[var(--lego-gray-dark)] rounded text-[var(--lego-black)]/60 hover:bg-[var(--lego-gray)]"
                      onClick={() => alert('Notification feature coming soon!')}
                    >
                      Notify Me
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
