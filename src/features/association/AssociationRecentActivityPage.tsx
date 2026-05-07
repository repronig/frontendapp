import { DashboardError, DashboardLoading } from '@/features/dashboard/DashboardState';
import { useAssociationDashboard } from '@/features/dashboard/useDashboard';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { DashboardList, DashboardListItem } from '@/components/shared/DashboardList';
import { EmptyState } from '@/components/shared/EmptyState';
import { normalizeApiError } from '@/api/error';
import { formatDateTime, humanizeActivityLabel, humanizeActivitySubject } from '@/utils/format';

export function AssociationRecentActivityPage() {
  const query = useAssociationDashboard();

  if (query.isLoading) return <DashboardLoading label="recent activity" />;
  if (query.isError || !query.data?.association) {
    return (
      <DashboardError
        message={normalizeApiError(query.error).message}
        onRetry={() => void query.refetch()}
        isRetrying={query.isFetching && !query.isLoading}
      />
    );
  }

  const activity = query.data.recent_activity ?? [];

  return (
    <div className="space-y-6">
      <SectionHeader title="Recent activity" description="Association audit trail." />

      <DashboardList title="Activity feed" description="Governance and application events.">
        {activity.length ? activity.map((item) => (
          <DashboardListItem
            key={item.id}
            title={humanizeActivityLabel(item.action)}
            subtitle={item.subject_type ? `${humanizeActivitySubject(item.subject_type)} • ${formatDateTime(item.created_at)}` : formatDateTime(item.created_at)}
            meta={item.actor ? <span>By {item.actor.name}</span> : undefined}
            trailing={<span className="text-xs font-medium text-[#667085] dark:text-slate-300 dark:text-slate-400">{formatDateTime(item.created_at)}</span>}
          />
        )) : <div className="p-6"><EmptyState title="No recent activity" description="Recent association activity will appear here as review and governance actions happen." /></div>}
      </DashboardList>
    </div>
  );
}
