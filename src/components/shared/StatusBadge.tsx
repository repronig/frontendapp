import { cn } from '@/utils/cn';

function normalize(value?: string | null) {
  return (value || 'unknown').replace(/_/g, ' ');
}

/** Human-readable labels for raw API status strings (otherwise title-case from {@link normalize}). */
const STATUS_LABELS: Record<string, string> = {
  pending_offline: 'Offline — pending verification',
  partially_paid: 'Partially paid',
  fully_paid: 'Fully paid',
  changes_requested: 'Changes requested',
};

const STATUS_TONES: Record<string, string> = {
  approved: 'bg-[#ECFDF3] text-[#117A46] border-[#B7E4C7] dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900',
  active: 'bg-[#ECFDF3] text-[#117A46] border-[#B7E4C7] dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900',
  enabled: 'bg-[#ECFDF3] text-[#117A46] border-[#B7E4C7] dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900',
  paid: 'bg-[#ECFDF3] text-[#117A46] border-[#B7E4C7] dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900',
  verified: 'bg-[#ECFDF3] text-[#117A46] border-[#B7E4C7] dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900',
  successful: 'bg-[#ECFDF3] text-[#117A46] border-[#B7E4C7] dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900',
  pending: 'bg-[#FFFAEB] text-[#B76E00] border-[#F4D58D] dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900',
  pending_offline: 'bg-[#FFFAEB] text-[#B76E00] border-[#F4D58D] dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900',
  draft: 'bg-[#FFFAEB] text-[#B76E00] border-[#F4D58D] dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900',
  submitted: 'bg-[#FFFAEB] text-[#B76E00] border-[#F4D58D] dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900',
  processing: 'bg-[#EFF8FF] text-[#175CD3] border-[#B2DDFF] dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-900',
  under_review: 'bg-[#EFF8FF] text-[#175CD3] border-[#B2DDFF] dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-900',
  review: 'bg-[#EFF8FF] text-[#175CD3] border-[#B2DDFF] dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-900',
  changes_requested: 'bg-[#EFF8FF] text-[#175CD3] border-[#B2DDFF] dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-900',
  rejected: 'bg-[#FFF1F3] text-[#B42318] border-[#F5C2C7] dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900',
  inactive: 'bg-[#FFF1F3] text-[#B42318] border-[#F5C2C7] dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900',
  disabled: 'bg-[#FFF1F3] text-[#B42318] border-[#F5C2C7] dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900',
  suspended: 'bg-[#FFF1F3] text-[#B42318] border-[#F5C2C7] dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900',
  failed: 'bg-[#FFF1F3] text-[#B42318] border-[#F5C2C7] dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900',
};

function resolveTone(raw: string) {
  if (STATUS_TONES[raw]) return STATUS_TONES[raw];
  if (raw.includes('approve') || raw.includes('active') || raw.includes('paid') || raw.includes('verified')) return STATUS_TONES.approved;
  if (raw.includes('pending') || raw.includes('draft') || raw.includes('submitted')) return STATUS_TONES.pending;
  if (raw.includes('review') || raw.includes('changes')) return STATUS_TONES.under_review;
  if (raw.includes('reject') || raw.includes('suspend') || raw.includes('failed') || raw.includes('inactive') || raw.includes('disable')) return STATUS_TONES.rejected;
  return 'bg-[#F5F7FA] text-[#475467] dark:text-slate-300 border-[#D0D5DD] dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700';
}

export function StatusBadge({ value, label, className }: { value?: string | null; label?: string | null; className?: string }) {
  const raw = (value || 'unknown').toLowerCase();
  const tone = resolveTone(raw);
  const mappedLabel = !label && raw in STATUS_LABELS ? STATUS_LABELS[raw] : null;
  const displayLabel = label ?? mappedLabel ?? normalize(value);
  const textCase = mappedLabel && !label ? 'normal-case' : 'capitalize';

  return (
    <span className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium', textCase, tone, className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {displayLabel}
    </span>
  );
}
