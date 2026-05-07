import { Card } from '@/components/ui/card';
import { formatDisplayLabel, formatDisplayValue } from '@/utils/display';

export function DetailGrid({ items, columns = 2 }: { items: { label: string; value: React.ReactNode }[]; columns?: 2 | 3 }) {
  return (
    <div className={columns === 3 ? 'grid gap-4 md:grid-cols-2 xl:grid-cols-3' : 'grid gap-4 md:grid-cols-2'}>
      {items.map((item) => (
        <Card key={item.label} className="space-y-1 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#667085] dark:text-slate-300 dark:text-slate-400">{formatDisplayLabel(item.label)}</p>
          <div className="break-words text-sm font-medium leading-6 text-[#101828] dark:text-slate-100">{typeof item.value === 'string' ? formatDisplayValue(item.value) : (item.value || '—')}</div>
        </Card>
      ))}
    </div>
  );
}
