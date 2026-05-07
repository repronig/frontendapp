import { CheckCircle2, CircleDashed } from 'lucide-react';
import { Card } from '@/components/ui/card';

export interface ProfileCompleteness {
  completed_fields: number;
  total_fields: number;
  percentage: number;
  is_complete: boolean;
  missing_fields: string[];
}

function formatMissingField(field: string) {
  return field.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export function ProfileCompletenessCard({
  title = 'Profile completeness',
  description = 'Complete the missing fields to improve readiness across the platform.',
  completeness,
  tone = 'default',
}: {
  title?: string;
  description?: string;
  completeness?: ProfileCompleteness | null;
  tone?: 'default' | 'cream' | 'sage';
}) {
  const percentage = completeness?.percentage ?? 0;
  const missing = completeness?.missing_fields ?? [];
  const toneClasses = tone === 'cream'
    ? {
        card: 'border-[#F2D7A0] bg-[#FFF8E7] dark:border-amber-900/60 dark:bg-amber-950/20',
        badge: 'bg-[#F9E7B0] text-[#7A1C1C] dark:bg-amber-900/50 dark:text-amber-100',
        track: 'bg-[#F4DEAB] dark:bg-amber-950/60',
        bar: 'bg-[#B8860B]',
        pending: 'bg-[#F9E7B0] text-[#7A1C1C] dark:bg-amber-900/50 dark:text-amber-100',
        chip: 'border-[#E9C46A] bg-white/80 text-[#7A1C1C] dark:border-amber-800 dark:bg-slate-950 dark:text-amber-100',
      }
    : tone === 'sage'
      ? {
          card: 'border-[#BFD8C2] bg-[#F0FAF2] dark:border-emerald-900/60 dark:bg-emerald-950/20',
          badge: 'bg-[#DDF3E0] text-[#14532D] dark:bg-emerald-900/50 dark:text-emerald-100',
          track: 'bg-[#D9EEDC] dark:bg-emerald-950/60',
          bar: 'bg-[#2E7D32]',
          pending: 'bg-[#DDF3E0] text-[#14532D] dark:bg-emerald-900/50 dark:text-emerald-100',
          chip: 'border-[#BFD8C2] bg-white/80 text-[#14532D] dark:border-emerald-800 dark:bg-slate-950 dark:text-emerald-100',
        }
      : {
          card: '',
          badge: 'bg-[#EFF6FF] text-[#1D4ED8] dark:bg-sky-950/60 dark:text-sky-300',
          track: 'bg-[#E2E8F0] dark:bg-slate-800',
          bar: 'bg-[#1D4ED8]',
          pending: 'bg-[#EFF6FF] text-[#1D4ED8] dark:bg-sky-950/60 dark:text-sky-300',
          chip: 'border-[#D0D5DD] bg-white text-[#344054] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
        };

  return (
    <Card className={`space-y-4 p-5 ${toneClasses.card}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-base font-semibold text-[#0F172A] dark:text-slate-100">{title}</p>
          <p className="mt-1 text-sm text-[#64748B] dark:text-slate-400">{description}</p>
        </div>
        <div className={`rounded-full px-3 py-1 text-sm font-semibold ${toneClasses.badge}`}>{percentage}%</div>
      </div>

      <div className={`h-3 overflow-hidden rounded-full ${toneClasses.track}`}>
        <div className={`h-full rounded-full transition-all ${toneClasses.bar}`} style={{ width: `${percentage}%` }} />
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm text-[#475467] dark:text-slate-300">
        <span>{completeness?.completed_fields ?? 0} of {completeness?.total_fields ?? 0} fields completed</span>
        {completeness?.is_complete ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#ECFDF3] px-2.5 py-1 text-xs font-semibold text-[#027A48] dark:bg-emerald-950/60 dark:text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" /> Complete
          </span>
        ) : (
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${toneClasses.pending}`}>
            <CircleDashed className="h-3.5 w-3.5" /> In progress
          </span>
        )}
      </div>

      {missing.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#667085] dark:text-slate-400">Missing fields</p>
          <div className="flex flex-wrap gap-2">
            {missing.slice(0, 8).map((field) => (
              <span key={field} className={`rounded-full border px-2.5 py-1 text-xs font-medium ${toneClasses.chip}`}>
                {formatMissingField(field)}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </Card>
  );
}
