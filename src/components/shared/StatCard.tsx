import { type ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/utils/cn';

/** Ordered for dashboard grids — cycles so adjacent cards differ. */
export const STAT_CARD_VARIANTS = ['sky', 'violet', 'amber', 'emerald', 'rose', 'cyan', 'orange', 'indigo'] as const;
export type StatCardColorVariant = (typeof STAT_CARD_VARIANTS)[number];
export type StatCardVariant = StatCardColorVariant | 'slate';

/** Cycle colorful variants for dashboard stat grids (0 → sky, 1 → violet, …). */
export function statCardVariantAt(index: number): StatCardColorVariant {
  return STAT_CARD_VARIANTS[index % STAT_CARD_VARIANTS.length]!;
}

type Palette = {
  card: string;
  label: string;
  value: string;
  hint: string;
  iconWrap: string;
};

const PALETTES: Record<StatCardVariant, Palette> = {
  slate: {
    card: 'border-[#EAECF0] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950',
    label: 'text-[#6B788E] dark:text-slate-400',
    value: 'text-[#2B2B2D] dark:text-slate-100',
    hint: 'text-[#6B788E] dark:text-slate-400',
    iconWrap: 'bg-[#FFF4F4] text-[#AF1512] dark:bg-slate-800 dark:text-red-300',
  },
  sky: {
    card: 'border-sky-200/90 bg-gradient-to-br from-sky-50 via-white to-sky-100/70 shadow-sm dark:border-sky-900/50 dark:from-sky-950/40 dark:via-slate-950 dark:to-sky-950/30',
    label: 'text-sky-900/75 dark:text-sky-200/85',
    value: 'text-sky-950 dark:text-sky-50',
    hint: 'text-sky-800/70 dark:text-sky-300/80',
    iconWrap: 'bg-sky-200/60 text-sky-900 dark:bg-sky-900/50 dark:text-sky-100',
  },
  violet: {
    card: 'border-violet-200/90 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50/80 shadow-sm dark:border-violet-900/45 dark:from-violet-950/35 dark:via-slate-950 dark:to-fuchsia-950/25',
    label: 'text-violet-900/75 dark:text-violet-200/85',
    value: 'text-violet-950 dark:text-violet-50',
    hint: 'text-violet-800/70 dark:text-violet-300/80',
    iconWrap: 'bg-violet-200/55 text-violet-900 dark:bg-violet-900/50 dark:text-violet-100',
  },
  amber: {
    card: 'border-amber-200/90 bg-gradient-to-br from-amber-50 via-white to-orange-50/70 shadow-sm dark:border-amber-900/45 dark:from-amber-950/35 dark:via-slate-950 dark:to-orange-950/20',
    label: 'text-amber-900/80 dark:text-amber-200/85',
    value: 'text-amber-950 dark:text-amber-50',
    hint: 'text-amber-800/72 dark:text-amber-300/80',
    iconWrap: 'bg-amber-200/60 text-amber-950 dark:bg-amber-900/45 dark:text-amber-100',
  },
  emerald: {
    card: 'border-emerald-200/90 bg-gradient-to-br from-emerald-50 via-white to-teal-50/70 shadow-sm dark:border-emerald-900/45 dark:from-emerald-950/35 dark:via-slate-950 dark:to-teal-950/25',
    label: 'text-emerald-900/78 dark:text-emerald-200/85',
    value: 'text-emerald-950 dark:text-emerald-50',
    hint: 'text-emerald-800/72 dark:text-emerald-300/80',
    iconWrap: 'bg-emerald-200/55 text-emerald-950 dark:bg-emerald-900/50 dark:text-emerald-100',
  },
  rose: {
    card: 'border-rose-200/90 bg-gradient-to-br from-rose-50 via-white to-pink-50/70 shadow-sm dark:border-rose-900/45 dark:from-rose-950/30 dark:via-slate-950 dark:to-pink-950/20',
    label: 'text-rose-900/78 dark:text-rose-200/85',
    value: 'text-rose-950 dark:text-rose-50',
    hint: 'text-rose-800/72 dark:text-rose-300/80',
    iconWrap: 'bg-rose-200/55 text-rose-950 dark:bg-rose-900/50 dark:text-rose-100',
  },
  cyan: {
    card: 'border-cyan-200/90 bg-gradient-to-br from-cyan-50 via-white to-sky-50/60 shadow-sm dark:border-cyan-900/45 dark:from-cyan-950/30 dark:via-slate-950 dark:to-sky-950/25',
    label: 'text-cyan-900/78 dark:text-cyan-200/85',
    value: 'text-cyan-950 dark:text-cyan-50',
    hint: 'text-cyan-800/72 dark:text-cyan-300/80',
    iconWrap: 'bg-cyan-200/55 text-cyan-950 dark:bg-cyan-900/50 dark:text-cyan-100',
  },
  orange: {
    card: 'border-orange-200/90 bg-gradient-to-br from-orange-50 via-white to-amber-50/60 shadow-sm dark:border-orange-900/40 dark:from-orange-950/30 dark:via-slate-950 dark:to-amber-950/20',
    label: 'text-orange-900/78 dark:text-orange-200/85',
    value: 'text-orange-950 dark:text-orange-50',
    hint: 'text-orange-800/72 dark:text-orange-300/80',
    iconWrap: 'bg-orange-200/55 text-orange-950 dark:bg-orange-900/45 dark:text-orange-100',
  },
  indigo: {
    card: 'border-indigo-200/90 bg-gradient-to-br from-indigo-50 via-white to-blue-50/70 shadow-sm dark:border-indigo-900/45 dark:from-indigo-950/35 dark:via-slate-950 dark:to-blue-950/25',
    label: 'text-indigo-900/78 dark:text-indigo-200/85',
    value: 'text-indigo-950 dark:text-indigo-50',
    hint: 'text-indigo-800/72 dark:text-indigo-300/80',
    iconWrap: 'bg-indigo-200/55 text-indigo-950 dark:bg-indigo-900/50 dark:text-indigo-100',
  },
};

export function StatCard({
  label,
  value,
  hint,
  icon,
  compactValue = false,
  variant = 'slate',
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  compactValue?: boolean;
  /** Pass a colorful variant on dashboards; default `slate` matches neutral admin lists. */
  variant?: StatCardVariant;
}) {
  const p = PALETTES[variant] ?? PALETTES.slate;

  return (
    <Card className={cn('min-w-0 overflow-hidden p-5', p.card)}>
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className={cn('text-sm font-medium', p.label)}>{label}</p>
          <p
            className={cn(
              compactValue ? 'text-[16px] sm:text-[18px] xl:text-[20px]' : 'text-[18px] sm:text-[20px] xl:text-[22px]',
              'mt-3 max-w-full whitespace-normal break-all font-semibold leading-tight tracking-tight',
              p.value,
            )}
          >
            {value}
          </p>
          {hint ? <p className={cn('mt-2 break-words text-sm', p.hint)}>{hint}</p> : null}
        </div>
        {icon ? (
          <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl', p.iconWrap)}>{icon}</div>
        ) : null}
      </div>
    </Card>
  );
}
