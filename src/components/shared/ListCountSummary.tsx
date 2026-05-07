import type { PaginationMeta } from '@/types/api';

export function ListCountSummary({
  meta,
  subject,
  helper,
}: {
  meta?: PaginationMeta;
  subject: string;
  helper?: string;
}) {
  const hasResults = Boolean(meta && meta.total > 0 && meta.from != null && meta.to != null);
  const summary = hasResults
    ? `Showing ${meta!.from}–${meta!.to} of ${meta!.total} ${subject}`
    : `No ${subject} available`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#EAECF0] bg-[#FCFCFD] px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-950">
      <p className="font-medium text-[#344054] dark:text-slate-200 dark:text-slate-200">{summary}</p>
      <p className="text-[#667085] dark:text-slate-300 dark:text-slate-400">{helper ?? (hasResults ? `Total ${subject}: ${meta!.total}` : `Total ${subject}: 0`)}</p>
    </div>
  );
}
