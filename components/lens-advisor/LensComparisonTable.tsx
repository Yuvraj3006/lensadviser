'use client';

/**
 * Lens Comparison Table Component
 * Matches Frontend Specification exactly
 */

interface Feature {
  id: string;
  name: string;
  key: string;
}

interface LensComparisonItem {
  id: string;
  name: string;
  features: string[]; // Feature IDs or keys
}

interface LensComparisonTableProps {
  lenses: LensComparisonItem[];
  features: Feature[];
}

export function LensComparisonTable({ lenses, features }: LensComparisonTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b-2 border-slate-300">
            <th className="text-left p-3 font-semibold text-slate-900">Feature</th>
            {lenses.map((lens) => (
              <th key={lens.id} className="text-center p-3 font-semibold text-slate-900 min-w-[150px]">
                {lens.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {features.map((feature) => (
            <tr key={feature.id} className="border-b border-slate-200">
              <td className="p-3 text-slate-700">{feature.name}</td>
              {lenses.map((lens) => {
                const hasFeature = lens.features.includes(feature.id) || lens.features.includes(feature.key);
                return (
                  <td key={lens.id} className="p-3 text-center">
                    {hasFeature ? (
                      <svg
                        className="w-6 h-6 text-green-600 mx-auto"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

