import { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export function SectionHeader({ title, description, action, actions, eyebrow, className }: { title: string; description?: string; action?: ReactNode; actions?: ReactNode; eyebrow?: string; className?: string; }) {
  const resolvedAction = action ?? actions;
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-4', className)}>
      <div className="space-y-2">
        {eyebrow ? <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6A1025] dark:text-rose-300">{eyebrow}</p> : null}
        <h2 className="text-[22px] font-semibold leading-tight text-[#2B2B2D] dark:text-slate-100 dark:text-slate-100 md:text-[24px]">{title}</h2>
        {description ? <p className="max-w-3xl text-[15px] leading-7 text-[#6B788E] dark:text-slate-300 dark:text-slate-400">{description}</p> : null}
      </div>
      {resolvedAction ? <div className="flex flex-wrap items-center gap-3">{resolvedAction}</div> : null}
    </div>
  );
}
