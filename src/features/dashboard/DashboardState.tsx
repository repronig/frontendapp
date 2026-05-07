import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function DashboardLoading({ label }: { label: string }) {
  return (
    <Card className="border-[#D6E6FF] bg-[#F4F8FF] dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-3 text-sm font-medium text-[#2563EB] dark:text-sky-300">
        <img src="/assets/loading-spinner.gif" alt="Loading" className="h-8 w-8 rounded-full" />
        <span>Loading {label}…</span>
      </div>
    </Card>
  );
}

export function DashboardError({
  message,
  onRetry,
  retryLabel = 'Try again',
  isRetrying,
}: {
  message: string;
  /** When set, shows the standard retry control (invalidate / refetch from the caller). */
  onRetry?: () => void;
  retryLabel?: string;
  isRetrying?: boolean;
}) {
  return (
    <Card className="border-[#F2C9C8] bg-[#FFF4F4] dark:border-rose-900/60 dark:bg-rose-950/30">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-[#6A1025] dark:text-rose-200">{message}</p>
        {onRetry ? (
          <Button type="button" variant="outline" size="sm" className="shrink-0 border-[#F2C9C8] bg-white dark:border-rose-900/60 dark:bg-slate-950" onClick={onRetry} disabled={isRetrying}>
            {isRetrying ? 'Retrying…' : retryLabel}
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
