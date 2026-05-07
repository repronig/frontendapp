import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';
import { exportRowsToPdf } from '@/utils/pdfExport';

type Column<T> = {
  key: string;
  header: ReactNode;
  className?: string;
  render: (row: T) => ReactNode;
  exportValue?: (row: T) => string | number | null | undefined;
  isExportable?: boolean;
};

function TableSkeleton({ columns, rows = 5 }: { columns: Array<{ key: string; className?: string }>; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={`table-skeleton-${rowIndex}`} className="border-b border-[#EAECF0] bg-white dark:bg-slate-950 last:border-b-0 dark:border-slate-800 dark:bg-slate-950">
          {columns.map((column, columnIndex) => (
            <td key={`${column.key}-${rowIndex}`} className={cn('px-6 py-5 align-top', column.className)}>
              <div className="space-y-2">
                <div
                  className={cn(
                    'h-4 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700',
                    columnIndex === 0 ? 'w-36' : columnIndex % 2 === 0 ? 'w-28' : 'w-20',
                  )}
                />
                {columnIndex === 0 ? <div className="h-3 w-24 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" /> : null}
              </div>
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  onRowClick,
  selectedRowKey,
  emptyTitle = 'No records found',
  emptyDescription = 'There is nothing to show here yet.',
  isLoading = false,
  skeletonRowCount = 5,
  exportTitle,
}: {
  columns: Column<T>[];
  rows: T[];
  getRowKey?: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  selectedRowKey?: string | number;
  emptyTitle?: string;
  emptyDescription?: string;
  isLoading?: boolean;
  loadingTitle?: string;
  loadingDescription?: string;
  skeletonRowCount?: number;
  exportTitle?: string;
}) {
  const exportableColumns = columns.filter((column) => column.key !== 'actions' && column.isExportable !== false);
  const canExportPdf = Boolean(exportTitle && rows.length > 0 && exportableColumns.length > 0);

  function handleExportPdf() {
    if (!exportTitle) return;

    exportRowsToPdf(
      exportTitle,
      exportableColumns.map((column) => ({
        label: typeof column.header === 'string' ? column.header : column.key,
        getValue: (row) => {
          const typedRow = row as T;
          if (column.exportValue) return column.exportValue(typedRow);
          const value = (row as Record<string, unknown>)[column.key];
          if (typeof value === 'string' || typeof value === 'number') return value;
          if (value == null) return '—';
          return String(value);
        },
      })),
      rows as unknown as Array<Record<string, unknown>>,
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-[#EAECF0] bg-white dark:bg-slate-950 panel-shadow dark:border-slate-800 dark:bg-slate-950">
      {canExportPdf ? (
        <div className="flex justify-end border-b border-[#EAECF0] bg-white dark:bg-slate-950 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
          <Button type="button" size="sm" variant="outline" onClick={handleExportPdf}>Export PDF</Button>
        </div>
      ) : null}
      <div className="overflow-x-auto scrollbar-thin">
        <table className="min-w-full border-collapse">
          <thead className="bg-[#FCFCF7] dark:bg-slate-900">
            <tr>
              {columns.map((column) => <th key={column.key} className={cn('border-b border-[#EAECF0] px-6 py-4 text-left text-[15px] font-semibold text-[#667085] dark:text-slate-300 dark:border-slate-800 dark:text-slate-300', column.className)}>{column.header}</th>)}
            </tr>
          </thead>
          <tbody className="dark:bg-slate-950">
            {isLoading && rows.length === 0 ? (
              <TableSkeleton columns={columns} rows={skeletonRowCount} />
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center">
                  <div className="mx-auto max-w-md space-y-2">
                    <p className="text-lg font-semibold text-[#2B2B2D] dark:text-slate-100 dark:text-slate-100">{emptyTitle}</p>
                    <p className="text-sm text-[#6B788E] dark:text-slate-300 dark:text-slate-400">{emptyDescription}</p>
                  </div>
                </td>
              </tr>
            ) : rows.map((row, index) => {
              const rowKey = getRowKey ? getRowKey(row) : index;
              const isActive = rowKey === selectedRowKey;
              return (
                <tr key={rowKey} onClick={() => onRowClick?.(row)} className={cn('border-b border-[#EAECF0] last:border-b-0 transition-colors dark:border-slate-800', onRowClick ? 'cursor-pointer hover:bg-[#FAFBFC] dark:hover:bg-slate-900' : '', isActive ? 'bg-[#FFF8F7] dark:bg-slate-900' : 'bg-white dark:bg-slate-950 dark:bg-slate-950')}>
                  {columns.map((column) => <td key={column.key} className={cn('px-6 py-5 align-top text-base text-[#1E2024] dark:text-slate-100 dark:text-slate-100', column.className)}>{column.render(row)}</td>)}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
