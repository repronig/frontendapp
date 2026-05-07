import { Card } from '@/components/ui/card';

export function DetailPanelState({
  mode,
  title,
  description,
}: {
  mode: 'loading' | 'empty';
  title: string;
  description?: string;
}) {
  const isLoading = mode === 'loading';

  return (
    <Card className="grid min-h-[220px] place-items-center bg-[linear-gradient(180deg,#fff_0%,#fcfcf7_100%)] text-center dark:border-slate-800 dark:bg-none dark:bg-slate-950">
      <div className="max-w-md space-y-3 px-4">
        <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${isLoading ? 'bg-[#F4F8FF] text-[#2563EB] dark:bg-slate-900 dark:text-sky-300' : 'bg-[#F9FAFB] text-[#667085] dark:text-slate-300 dark:bg-slate-900 dark:text-slate-400'}`}>
          {isLoading ? <div className="h-8 w-8 animate-pulse rounded-full bg-sky-100 dark:bg-sky-900/50" /> : <span className="text-2xl">•</span>}
        </div>
        <h3 className="text-2xl font-semibold text-[#2B2B2D] dark:text-slate-100 dark:text-slate-100">{title}</h3>
        <p className={`text-base leading-7 ${isLoading ? 'text-[#3B82F6] dark:text-sky-300' : 'text-[#6B788E] dark:text-slate-300 dark:text-slate-400'}`}>{description ?? (isLoading ? 'Please wait…preparing selected resource.' : 'There is nothing to show here yet.')}</p>
      </div>
    </Card>
  );
}
