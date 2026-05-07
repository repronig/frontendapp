import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';

/**
 * Explicit refresh (invalidate/refetch) — web equivalent of pull-to-refresh when lists
 * do not use infinite pull gestures.
 */
export function QueryRefreshButton({
  onRefresh,
  isRefreshing,
  label = 'Refresh',
}: {
  onRefresh: () => void;
  isRefreshing?: boolean;
  label?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onRefresh}
      disabled={isRefreshing}
      className="gap-2"
      aria-busy={isRefreshing}
    >
      <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} aria-hidden />
      {isRefreshing ? 'Refreshing…' : label}
    </Button>
  );
}
