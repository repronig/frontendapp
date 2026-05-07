import type { ReactNode } from 'react';

export type StatusHelperItem = {
  label: string;
  value: ReactNode;
  helper: string;
};

export function StatusHelperGrid({ items, columns = 2 }: { items: StatusHelperItem[]; columns?: 2 | 3 }) {
  const colsClass = columns === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2';

  return (
    <div className={`grid gap-3 ${colsClass}`}>
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl border border-[#EAECF0] dark:border-slate-800 bg-[#FCFCFD] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#667085] dark:text-slate-300">{item.label}</p>
          <div className="mt-2 min-h-7 text-sm font-medium text-[#101828]">{item.value}</div>
          <p className="mt-2 text-sm text-[#667085] dark:text-slate-300">{item.helper}</p>
        </div>
      ))}
    </div>
  );
}
