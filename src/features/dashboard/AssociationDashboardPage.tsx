import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, CheckCircle2, Clock3, FileSearch, XCircle } from 'lucide-react';
import { getAssociationApplication } from '@/features/association/api';
import { normalizeApiError } from '@/api/error';
import { DashboardError, DashboardLoading } from '@/features/dashboard/DashboardState';
import { useAssociationDashboard } from '@/features/dashboard/useDashboard';
import { DashboardList, DashboardListItem } from '@/components/shared/DashboardList';
import { EmptyState } from '@/components/shared/EmptyState';
import { Modal } from '@/components/shared/Modal';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { StatCard, statCardVariantAt } from '@/components/shared/StatCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { AssociationApplicationDetail } from '@/features/association-review/AssociationApplicationDetail';
import { DistributionCard, TrendChartCard } from '@/components/shared/Charts';
import { RecentDashboardActivityList } from '@/features/dashboard/RecentDashboardActivityList';
import { resolveFileUrl } from '@/utils/fileUrl';
import { queryKeys } from '@/lib/queryKeys';

export function AssociationDashboardPage() {
  const query = useAssociationDashboard();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const detailQuery = useQuery({
    queryKey: queryKeys.associationDashboardApplication(selectedId),
    queryFn: async () => {
      if (!selectedId) throw new Error('Missing application id.');
      return getAssociationApplication(selectedId);
    },
    enabled: Boolean(selectedId),
  });

  if (query.isLoading) return <DashboardLoading label="association dashboard" />;
  if (query.isError || !query.data) {
    return (
      <DashboardError
        message={normalizeApiError(query.error).message}
        onRetry={() => void query.refetch()}
        isRetrying={query.isFetching && !query.isLoading}
      />
    );
  }

  const dashboard = query.data;
  const associationLogoUrl = resolveFileUrl(dashboard.association.logo_medium_url ?? dashboard.association.logo_url ?? dashboard.association.logo_thumb_url ?? null);
  const associationInitials = (dashboard.association.name || 'Association')
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const recentApplications = dashboard.recent_applications ?? [];
  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:items-center">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#D6E6FF] bg-[#F4F8FF] text-base font-bold text-[#1D4ED8] dark:border-slate-700 dark:bg-slate-900 dark:text-sky-300">
            {associationLogoUrl ? (
              <img src={associationLogoUrl} alt={`${dashboard.association.name} logo`} className="h-full w-full object-cover" />
            ) : associationInitials ? (
              associationInitials
            ) : (
              <Building2 className="h-7 w-7" />
            )}
          </div>
          <SectionHeader title={dashboard.association.name} description="Applications in review." />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard variant={statCardVariantAt(0)} label="Total" value={dashboard.stats.total_applications} icon={<FileSearch className="h-6 w-6" />} />
          <StatCard variant={statCardVariantAt(1)} label="Submitted" value={dashboard.stats.submitted_applications} icon={<Clock3 className="h-6 w-6" />} />
          <StatCard variant={statCardVariantAt(2)} label="Approved" value={dashboard.stats.approved_applications} icon={<CheckCircle2 className="h-6 w-6" />} />
          <StatCard variant={statCardVariantAt(3)} label="Rejected" value={dashboard.stats.rejected_applications} icon={<XCircle className="h-6 w-6" />} />
          <StatCard variant={statCardVariantAt(4)} label="Changes requested" value={dashboard.stats.changes_requested_applications} />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <TrendChartCard
            title="Application review flow"
            subtitle="Pipeline counts by stage."
            values={[
              dashboard.stats.submitted_applications,
              dashboard.stats.changes_requested_applications,
              dashboard.stats.approved_applications,
              dashboard.stats.rejected_applications,
              dashboard.stats.total_applications,
            ]}
            labels={['Submitted', 'Changes', 'Approved', 'Rejected', 'Total']}
          />
          <DistributionCard
            title="Outcomes mix"
            subtitle="Share of each application outcome."
            items={[
              { label: 'Approved', value: dashboard.stats.approved_applications, color: '#9EC5A4' },
              { label: 'Submitted', value: dashboard.stats.submitted_applications, color: '#BAC1DB' },
              { label: 'Rejected', value: dashboard.stats.rejected_applications, color: '#DCCAA0' },
              { label: 'Changes requested', value: dashboard.stats.changes_requested_applications, color: '#B9D3D9' },
            ]}
          />
        </div>

        <div className="grid gap-6">
          <DashboardList title="Recent applications" description="Newest first.">
            {recentApplications.length ? (
              <div className="grid gap-0 md:grid-cols-2">
                {recentApplications.map((application) => (
                  <DashboardListItem
                    key={application.id}
                    title={application.user?.name || `Application #${application.id}`}
                    subtitle={application.applicant_type}
                    meta={
                      <>
                        <StatusBadge value={application.application_status} />
                        {application.submission_stage ? <span>{application.submission_stage}</span> : null}
                      </>
                    }
                    trailing={
                      <Button variant="outline" size="sm" onClick={() => setSelectedId(application.id)}>
                        View
                      </Button>
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="p-6"><EmptyState title="No applications found" description="Recent applications will appear here once members submit them to your association." /></div>
            )}
          </DashboardList>
        </div>

        <RecentDashboardActivityList title="Recent governance activity" description="Latest audit entries." items={dashboard.recent_activity ?? []} />
      </div>

      <Modal
        open={Boolean(selectedId)}
        onClose={() => setSelectedId(null)}
        title="Application details"
        subtitle="Inspect the latest application details from your dashboard."
        size="lg"
      >
        {detailQuery.isLoading ? <Alert title="Loading application" description="Please wait…preparing selected resource." /> : null}
        {detailQuery.isError ? (
          <div className="space-y-3">
            <Alert title="Unable to load application" description={normalizeApiError(detailQuery.error).message} />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void detailQuery.refetch()}
              disabled={detailQuery.isFetching && !detailQuery.isLoading}
            >
              {detailQuery.isFetching && !detailQuery.isLoading ? 'Retrying…' : 'Try again'}
            </Button>
          </div>
        ) : null}
        {detailQuery.data?.data ? <AssociationApplicationDetail application={detailQuery.data.data} /> : null}
      </Modal>
    </>
  );
}
