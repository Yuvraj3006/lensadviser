'use client';

import { Button } from '@/components/ui/Button';
import { X, ShoppingBag, Star } from 'lucide-react';

interface ComparisonProduct {
  id: string;
  name: string;
  brand: string;
  material: string;
  waterContent: string;
  oxygen?: string;
  uvProtection?: boolean;
  comfortScore: number;
  packSize: number;
  mrp: number;
  offerPrice: number;
  matchScore: number;
}

interface ComparisonTableProps {
  products: ComparisonProduct[];
  onSelect: (productId: string) => void;
  onRemove: (productId: string) => void;
}

export function ComparisonTable({ products, onSelect, onRemove }: ComparisonTableProps) {
  if (products.length === 0) {
    return (
      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-8 text-center">
        <p className="text-slate-600 dark:text-slate-400">No products selected for comparison</p>
      </div>
    );
  }

  const renderStars = (score: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          size={14}
          className={i <= score ? 'fill-yellow-400 text-yellow-400 dark:fill-yellow-500 dark:text-yellow-500' : 'text-slate-300 dark:text-slate-600'}
        />
      );
    }
    return <div className="flex gap-0.5">{stars}</div>;
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border-2 border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-700 text-white px-6 py-4">
        <h2 className="text-xl font-bold">Compare Contact Lenses</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Feature</th>
              {products.map((product) => (
                <th key={product.id} className="px-4 py-3 text-center min-w-[200px] relative">
                  <button
                    onClick={() => onRemove(product.id)}
                    className="absolute top-2 right-2 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400"
                  >
                    <X size={18} />
                  </button>
                  <div className="font-semibold text-slate-900 dark:text-white">{product.name}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">{product.brand}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100 dark:border-slate-700">
              <td className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300">Material</td>
              {products.map((product) => (
                <td key={product.id} className="px-4 py-3 text-center text-sm text-slate-900 dark:text-white">
                  {product.material}
                </td>
              ))}
            </tr>
            <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30">
              <td className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300">Water Content</td>
              {products.map((product) => (
                <td key={product.id} className="px-4 py-3 text-center text-sm text-slate-900 dark:text-white">
                  {product.waterContent}%
                </td>
              ))}
            </tr>
            {products.some(p => p.oxygen) && (
              <tr className="border-b border-slate-100 dark:border-slate-700">
                <td className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300">Oxygen (Dk/t)</td>
                {products.map((product) => (
                  <td key={product.id} className="px-4 py-3 text-center text-sm text-slate-900 dark:text-white">
                    {product.oxygen || 'N/A'}
                  </td>
                ))}
              </tr>
            )}
            <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30">
              <td className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300">UV Protection</td>
              {products.map((product) => (
                <td key={product.id} className="px-4 py-3 text-center text-sm text-slate-900 dark:text-white">
                  {product.uvProtection ? (
                    <span className="text-green-600 dark:text-green-400 font-semibold">Yes</span>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500">No</span>
                  )}
                </td>
              ))}
            </tr>
            <tr className="border-b border-slate-100 dark:border-slate-700">
              <td className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300">Comfort Score</td>
              {products.map((product) => (
                <td key={product.id} className="px-4 py-3 text-center">
                  {renderStars(product.comfortScore)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30">
              <td className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300">Pack Size</td>
              {products.map((product) => (
                <td key={product.id} className="px-4 py-3 text-center text-sm text-slate-900 dark:text-white">
                  {product.packSize} lenses
                </td>
              ))}
            </tr>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <td className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300">Price</td>
              {products.map((product) => (
                <td key={product.id} className="px-4 py-3 text-center">
                  {product.mrp > product.offerPrice && (
                    <div className="text-xs text-slate-500 dark:text-slate-500 line-through mb-1">
                      ₹{product.mrp.toLocaleString()}
                    </div>
                  )}
                  <div className="text-lg font-bold text-slate-900 dark:text-white">
                    ₹{product.offerPrice.toLocaleString()}
                  </div>
                </td>
              ))}
            </tr>
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30">
              <td className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300">Match %</td>
              {products.map((product) => (
                <td key={product.id} className="px-4 py-3 text-center">
                  <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{product.matchScore}%</div>
                </td>
              ))}
            </tr>
            <tr>
              <td className="px-4 py-3"></td>
              {products.map((product) => (
                <td key={product.id} className="px-4 py-3 text-center">
                  <Button
                    onClick={() => onSelect(product.id)}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
                  >
                    <ShoppingBag size={16} className="mr-2" />
                    Select
                  </Button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
