import { Card } from '@/components/ui/card';

export function DashboardList({ title, description, children }: React.PropsWithChildren<{ title: string; description?: string }>) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-[#EAECF0] px-6 py-5 dark:border-slate-800">
        <h3 className="text-[16px] md:text-[18px] font-semibold text-[#2B2B2D] dark:text-slate-100 dark:text-slate-100">{title}</h3>
        {description ? <p className="mt-1 text-sm text-[#6B788E] dark:text-slate-300 dark:text-slate-400">{description}</p> : null}
      </div>
      <div>{children}</div>
    </Card>
  );
}

export function DashboardListItem({ title, subtitle, meta, trailing }: { title: string; subtitle?: string | null; meta?: React.ReactNode; trailing?: React.ReactNode; }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#F2F4F7] px-6 py-5 last:border-b-0 hover:bg-[#FAFBFC] dark:border-slate-800 dark:hover:bg-slate-900">
      <div className="min-w-0">
        <p className="truncate text-base font-semibold text-[#2B2B2D] dark:text-slate-100 dark:text-slate-100">{title}</p>
        {subtitle ? <p className="mt-1 text-sm text-[#6B788E] dark:text-slate-300 dark:text-slate-400">{subtitle}</p> : null}
        {meta ? <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[#667085] dark:text-slate-300 dark:text-slate-400">{meta}</div> : null}
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  );
}
