'use client';

import { ReactNode } from 'react';
import { clsx } from 'clsx';
import { Spinner } from '../ui/Spinner';

export interface Column<T> {
  key: keyof T | string;
  header: string;
  width?: string;
  render?: (item: T) => ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  rowActions?: (item: T) => ReactNode;
  keyExtractor?: (item: T) => string;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data available',
  onRowClick,
  rowActions,
  keyExtractor = (item) => item.id,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            {columns.map((column) => (
              <th
                key={String(column.key)}
                className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider"
                style={{ width: column.width }}
              >
                {column.header}
              </th>
            ))}
            {rowActions && (
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {data.map((item) => (
            <tr
              key={keyExtractor(item)}
              className={clsx(
                'hover:bg-slate-50 transition-colors',
                onRowClick && 'cursor-pointer'
              )}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((column) => (
                <td
                  key={String(column.key)}
                  className="px-4 py-3 text-sm text-slate-900"
                >
                  {column.render
                    ? column.render(item)
                    : String(item[column.key] ?? '-')}
                </td>
              ))}
              {rowActions && (
                <td className="px-4 py-3 text-sm text-right">
                  <div onClick={(e) => e.stopPropagation()}>
                    {rowActions(item)}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

