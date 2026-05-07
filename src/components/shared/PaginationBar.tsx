import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PAGE_SIZE_OPTIONS } from '@/constants/pagination';
import type { PaginationMeta } from '@/types/api';
import { Button } from '@/components/ui/button';

function getPageItems(current: number, last: number): Array<number | 'ellipsis'> {
  if (last <= 8) return Array.from({ length: last }, (_, index) => index + 1);

  const pages = new Set<number>([1, 2, 3, 4, 5, last - 2, last - 1, last]);
  for (let page = current - 1; page <= current + 1; page += 1) {
    if (page > 1 && page < last) pages.add(page);
  }

  const sorted = Array.from(pages).filter((page) => page >= 1 && page <= last).sort((a, b) => a - b);
  const items: Array<number | 'ellipsis'> = [];
  sorted.forEach((page, index) => {
    const previous = sorted[index - 1];
    if (previous && page - previous > 1) items.push('ellipsis');
    items.push(page);
  });
  return items;
}

const selectClassName =
  'h-9 min-w-[4.5rem] rounded-md border border-[#EAECF0] bg-white px-2 text-sm font-medium text-[#344054] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200';

/**
 * Footer pagination for paginated API lists. Pass **`perPage`** and **`onPerPageChange`** so the row-size
 * selector appears (values must be in `PAGE_SIZE_OPTIONS` from `@/constants/pagination`). Omit both when the parent uses a
 * fixed page size on purpose (e.g. a secondary list with its own `per_page` state).
 */
export function PaginationBar({
  meta,
  onPageChange,
  subject = 'records',
  perPage,
  onPerPageChange,
}: {
  meta?: PaginationMeta;
  onPageChange: (page: number) => void;
  subject?: string;
  perPage?: number;
  onPerPageChange?: (perPage: number) => void;
}) {
  if (!meta || meta.total < 1) return null;

  const showPageSize = typeof onPerPageChange === 'function' && typeof perPage === 'number';
  const showPageControls = meta.last_page > 1;
  const pageItems = showPageControls ? getPageItems(meta.current_page, meta.last_page) : [];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#EAECF0] bg-white px-4 py-3 panel-shadow dark:border-slate-800 dark:bg-slate-950">
      <p className="text-sm text-[#6B788E] dark:text-slate-300 dark:text-slate-400">
        Page {meta.current_page} of {meta.last_page} • {meta.total} total {subject}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        {showPageSize ? (
          <label className="flex items-center gap-2 text-sm text-[#344054] dark:text-slate-300">
            <span className="whitespace-nowrap">Per page</span>
            <select
              className={selectClassName}
              value={perPage}
              onChange={(event) => onPerPageChange(Number.parseInt(event.target.value, 10))}
              aria-label="Rows per page"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {showPageControls ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onPageChange(Math.max(1, meta.current_page - 1))} disabled={meta.current_page <= 1}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Prev
            </Button>
            <div className="flex flex-wrap items-center gap-1">
              {pageItems.map((item, index) => item === 'ellipsis' ? (
                <span key={`ellipsis-${index}`} className="flex h-10 min-w-8 items-center justify-center text-sm text-muted-foreground">…</span>
              ) : (
                <button key={item} type="button" onClick={() => onPageChange(item)} className={item === meta.current_page ? 'flex h-10 w-10 items-center justify-center rounded-md bg-[#AF1512] text-sm font-semibold text-white' : 'flex h-10 w-10 items-center justify-center rounded-md border border-[#EAECF0] text-sm font-medium text-[#344054] dark:text-slate-200 hover:bg-[#F9FAFB] dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900'}>
                  {item}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => onPageChange(Math.min(meta.last_page, meta.current_page + 1))} disabled={meta.current_page >= meta.last_page}>
              Next <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
