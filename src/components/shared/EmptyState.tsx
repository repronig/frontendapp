import { ReactNode } from 'react';
import { Card } from '@/components/ui/card';

type EmptyStateTone = 'neutral' | 'warning';

export function EmptyState({
  title,
  description,
  action,
  tone = 'neutral',
}: {
  title: string;
  description: string;
  action?: ReactNode;
  tone?: EmptyStateTone;
}) {
  const iconClass = tone === 'warning'
    ? 'bg-[#FFFBEB] text-[#B54708] dark:bg-amber-950/50 dark:text-amber-300'
    : 'bg-[#F4F8FF] text-[#2563EB] dark:bg-slate-900 dark:text-sky-300';

  return (
    <Card className="grid min-h-[220px] place-items-center bg-[linear-gradient(180deg,#fff_0%,#fcfcf7_100%)] text-center dark:bg-none dark:bg-slate-950">
      <div className="max-w-md space-y-3">
        <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${iconClass}`}>•</div>
        <h3 className="text-2xl font-semibold text-[#2B2B2D] dark:text-slate-100 dark:text-slate-100">{title}</h3>
        <p className="text-base leading-7 text-[#6B788E] dark:text-slate-300 dark:text-slate-400">{description}</p>
        {action ? <div className="pt-2">{action}</div> : null}
      </div>
    </Card>
  );
}
