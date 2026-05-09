import { CalendarRange, RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface StatusOption {
  label: string;
  value: string;
}

export function SearchFilterBar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  statusOptions,
  secondaryStatus,
  onSecondaryStatusChange,
  secondaryStatusOptions,
  searchPlaceholder = 'Search',
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onReset,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  status?: string;
  onStatusChange?: (value: string) => void;
  statusOptions?: StatusOption[];
  /** Optional second status-style filter (e.g. affiliation status on association applications). */
  secondaryStatus?: string;
  onSecondaryStatusChange?: (value: string) => void;
  secondaryStatusOptions?: StatusOption[];
  searchPlaceholder?: string;
  dateFrom?: string;
  dateTo?: string;
  onDateFromChange?: (value: string) => void;
  onDateToChange?: (value: string) => void;
  onReset?: () => void;
}) {
  const options = statusOptions ?? [
    { label: 'All statuses', value: '' },
    { label: 'Draft', value: 'draft' },
    { label: 'Submitted', value: 'submitted' },
    { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' },
    { label: 'Pending', value: 'pending' },
    { label: 'Active', value: 'active' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-[#EAECF0] bg-white dark:bg-slate-950 p-3 panel-shadow dark:border-slate-800 dark:bg-slate-950">
      <div className="relative min-w-[260px] flex-1">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98A2B3]" />
        <Input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder={searchPlaceholder} className="pl-11" />
      </div>
      {onStatusChange ? (
        <div className="relative w-full sm:w-[220px]">
          <SlidersHorizontal className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98A2B3]" />
          <select value={status ?? ''} onChange={(event) => onStatusChange(event.target.value)} className="h-12 w-full rounded-md border border-[#222222] bg-white dark:bg-slate-950 pl-11 pr-4 text-base text-[#1E2024] dark:text-slate-100 outline-none focus:border-[#AF1512] focus:ring-2 focus:ring-[rgba(175,21,18,0.12)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
            {options.map((option) => <option key={`${option.label}-${option.value}`} value={option.value}>{option.label}</option>)}
          </select>
        </div>
      ) : null}
      {onSecondaryStatusChange && secondaryStatusOptions ? (
        <div className="relative w-full sm:w-[240px]">
          <SlidersHorizontal className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98A2B3]" />
          <select
            value={secondaryStatus ?? ''}
            onChange={(event) => onSecondaryStatusChange(event.target.value)}
            aria-label="Affiliation status filter"
            className="h-12 w-full rounded-md border border-[#222222] bg-white dark:bg-slate-950 pl-11 pr-4 text-base text-[#1E2024] dark:text-slate-100 outline-none focus:border-[#AF1512] focus:ring-2 focus:ring-[rgba(175,21,18,0.12)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            {secondaryStatusOptions.map((option) => (
              <option key={`aff-${option.label}-${option.value}`} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {onDateFromChange ? (
        <div className="relative w-full sm:w-[190px]">
          <CalendarRange className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98A2B3]" />
          <Input type="date" value={dateFrom ?? ''} onChange={(event) => onDateFromChange(event.target.value)} className="pl-11" />
        </div>
      ) : null}
      {onDateToChange ? (
        <div className="relative w-full sm:w-[190px]">
          <CalendarRange className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98A2B3]" />
          <Input type="date" value={dateTo ?? ''} onChange={(event) => onDateToChange(event.target.value)} className="pl-11" />
        </div>
      ) : null}
      {onReset ? <Button type="button" variant="outline" onClick={onReset}><RotateCcw className="mr-2 h-4 w-4" />Reset</Button> : null}
    </div>
  );
}
