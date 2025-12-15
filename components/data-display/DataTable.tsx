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
    <div className="overflow-x-auto w-full">
      <div className="inline-block min-w-full align-middle">
        <table className="w-full border-collapse min-w-[640px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider whitespace-nowrap"
                  style={{ width: column.width }}
                >
                  <span className="hidden sm:inline">{column.header}</span>
                  <span className="sm:hidden">{column.header.substring(0, 4)}</span>
                </th>
              ))}
              {rowActions && (
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider whitespace-nowrap">
                  <span className="hidden sm:inline">Actions</span>
                  <span className="sm:hidden">Act</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
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
                    className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-slate-900 max-w-[200px] sm:max-w-none"
                  >
                    {column.render
                      ? <div className="break-words">{column.render(item)}</div>
                      : <span className="break-words">{String(item[column.key] ?? '-')}</span>}
                  </td>
                ))}
                {rowActions && (
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-right">
                    <div onClick={(e) => e.stopPropagation()} className="flex justify-end">
                      {rowActions(item)}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

