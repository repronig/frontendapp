import { AlertCircle } from 'lucide-react';
import { cn } from '@/utils/cn';

export function Alert({ title, description, className }: { title: string; description?: string; className?: string }) {
  const isLoading = /^loading/i.test(title.trim());

  return (
    <div
      className={cn(
        'rounded-md border p-4',
        isLoading
          ? 'border-[#D6E6FF] bg-[#F4F8FF] text-[#1D4ED8] dark:border-slate-700 dark:bg-slate-900 dark:text-sky-300'
          : 'border-[#F2C9C8] bg-[#FFF4F4] text-[#6A1025] dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-200',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-slate-950 dark:bg-slate-950', isLoading ? 'text-[#2563EB] dark:text-sky-300' : 'text-[#AF1512] dark:text-rose-300')}>
          {isLoading ? <img src="/assets/loading-spinner.gif" alt="Loading" className="h-5 w-5 rounded-full" /> : <AlertCircle className="h-4 w-4" />}
        </div>
        <div>
          <p className="text-base font-semibold">{title}</p>
          {description ? <p className={cn('mt-1 text-sm', isLoading ? 'text-[#3B82F6] dark:text-sky-300' : 'text-[#8A4B57] dark:text-rose-200')}>{description}</p> : null}
        </div>
      </div>
    </div>
  );
}
