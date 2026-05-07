import { Button } from '@/components/ui/button';

/**
 * Compact error + retry for dropdowns, gates, and other tight layouts.
 * Full-page or section errors should prefer {@link DashboardError} from `@/features/dashboard/DashboardState`.
 */
export function QueryRetryBanner({
  message,
  onRetry,
  retryLabel = 'Try again',
  isRetrying,
}: {
  message: string;
  onRetry: () => void;
  retryLabel?: string;
  isRetrying?: boolean;
}) {
  return (
    <div className="rounded-md border border-[#FECDCA] bg-[#FEF3F2] px-4 py-3 text-sm text-[#B42318] dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
      <p>{message}</p>
      <Button type="button" variant="outline" size="sm" className="mt-2 border-[#FECDCA] bg-white dark:border-rose-900/60 dark:bg-slate-950" onClick={onRetry} disabled={isRetrying}>
        {isRetrying ? 'Retrying…' : retryLabel}
      </Button>
    </div>
  );
}
