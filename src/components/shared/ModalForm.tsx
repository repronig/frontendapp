import { type ComponentProps, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

export function ModalFormSection({
  badge,
  title,
  description,
  children,
  className,
}: {
  badge: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/40 p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:from-slate-950 dark:to-slate-950/80 dark:shadow-none',
        className,
      )}
    >
      <header className="mb-6 flex items-start gap-3 border-b border-slate-200/70 pb-5 dark:border-slate-800/80">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#7A1F1A] to-[#9B2C24] text-xs font-bold text-white shadow-sm ring-1 ring-black/5 dark:from-amber-600 dark:to-amber-700 dark:text-amber-950 dark:ring-amber-900/20">
          {badge}
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">{title}</h4>
          {description ? <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{description}</p> : null}
        </div>
      </header>
      {children}
    </section>
  );
}

export function ModalFormRoot({ className, ...props }: ComponentProps<'form'>) {
  return <form className={cn('flex min-h-0 flex-1 flex-col', className)} {...props} />;
}

export function ModalFormScrollBody({ className, children }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto pb-2', className)}>{children}</div>;
}

/** Flush footer inside shared `Modal` body (matches Add work modal actions). */
export function ModalFormActions({ className, children }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'z-10 -mx-5 -mb-5 flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-slate-200/80 bg-[#f8f7f7] px-5 pb-5 pt-4 shadow-[inset_0_1px_0_rgba(15,23,42,0.03)] dark:border-slate-700/80 dark:bg-slate-900 sm:-mx-8 sm:-mb-7 sm:px-8 sm:pb-7 sm:pt-5',
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Same visual as modal actions bar, for full-width footers inside cards (no modal horizontal bleed). */
export function PortalFormFooter({ className, children }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-slate-200/80 bg-[#f8f7f7] px-5 py-4 shadow-[inset_0_1px_0_rgba(15,23,42,0.03)] dark:border-slate-700/80 dark:bg-slate-900 sm:px-6 sm:py-5',
        className,
      )}
    >
      {children}
    </div>
  );
}
