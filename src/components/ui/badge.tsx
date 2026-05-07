import { cn } from '@/utils/cn';

export function Badge({ children, className }: React.PropsWithChildren<{ className?: string }>) {
  return <span className={cn('inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-300', className)}>{children}</span>;
}
