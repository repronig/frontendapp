import { useInstitutionDashboard } from '@/features/dashboard/useDashboard';
import { DataTable } from '@/components/shared/DataTable';
import { DashboardError, DashboardLoading } from '@/features/dashboard/DashboardState';
import { EmptyState } from '@/components/shared/EmptyState';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { StatCard } from '@/components/shared/StatCard';
import { normalizeApiError } from '@/api/error';
import type { DashboardActivityItem } from '@/types/dashboard';
import { formatDateTime, humanizeActivityLabel, humanizeActivitySubject } from '@/utils/format';

export function InstitutionRecentActivitiesPage() {
  const query = useInstitutionDashboard();

  if (query.isLoading) return <DashboardLoading label="institution activities" />;
  if (query.isError || !query.data) {
    return (
      <DashboardError
        message={normalizeApiError(query.error).message}
        onRetry={() => void query.refetch()}
        isRetrying={query.isFetching && !query.isLoading}
      />
    );
  }

  const rows = query.data.recent_activity ?? [];

  return (
    <div className="space-y-6">
      <SectionHeader title="Recent Activities" description="Your institution audit trail." />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Recent activities" value={rows.length} hint="Latest records returned by the institution dashboard endpoint" />
        <StatCard label="Institution" value={query.data.institution.name} hint={query.data.institution.licence_id ? `Licence ID: ${query.data.institution.licence_id}` : 'Institution activity stream'} />
        <StatCard label="Account status" value={query.data.onboarding_status.account_status ?? '—'} hint="Current institution account state" />
      </div>

      {rows.length ? (
        <DataTable
          columns={[
            { key: 'action', header: 'Activity', render: (row: DashboardActivityItem) => <div><p className="font-semibold text-foreground">{humanizeActivityLabel(row.action)}</p><p className="mt-1 text-sm text-muted-foreground">{row.subject_type ? `${humanizeActivitySubject(row.subject_type)} #${row.subject_id ?? '—'}` : 'Institution activity'}</p><p className="mt-1 text-xs text-muted-foreground">{formatDateTime(row.created_at)}</p></div> },
            { key: 'actor', header: 'Actor', render: (row: DashboardActivityItem) => row.actor?.name ?? row.actor?.email ?? 'System' },
            { key: 'created_at', header: 'Date', render: (row: DashboardActivityItem) => formatDateTime(row.created_at), exportValue: (row: DashboardActivityItem) => formatDateTime(row.created_at) },
          ]}
          rows={rows}
          getRowKey={(row) => row.id}
          exportTitle="Institution recent activities"
        />
      ) : (
        <EmptyState title="No recent activity" description="Recent auditable institution actions will appear here as workflows progress." />
      )}
    </div>
  );
}
