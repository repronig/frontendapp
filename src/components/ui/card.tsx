import { PropsWithChildren } from 'react';
import { cn } from '@/utils/cn';

export function Card({ children, className }: PropsWithChildren<{ className?: string }>) {
  return (
    <div className={cn('rounded-md border border-[#EAECF0] bg-white dark:bg-slate-950 p-6 panel-shadow dark:border-slate-800 dark:bg-slate-950', className)}>
      {children}
    </div>
  );
}
