import { FileText, Layers3, ShieldCheck, Upload } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { DashboardError, DashboardLoading } from '@/features/dashboard/DashboardState';
import { useMeDashboardSummary } from '@/features/dashboard/useDashboard';
import { DashboardList, DashboardListItem } from '@/components/shared/DashboardList';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { StatCard, statCardVariantAt } from '@/components/shared/StatCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { normalizeApiError } from '@/api/error';
import { EmptyState } from '@/components/shared/EmptyState';
import { TrendChartCard } from '@/components/shared/Charts';
import { ProfileCompletenessCard } from '@/components/shared/ProfileCompletenessCard';
import { formatDate } from '@/utils/format';
import { RecentDashboardActivityList } from '@/features/dashboard/RecentDashboardActivityList';

const priorityTone: Record<'high' | 'medium' | 'low', string> = {
  high: 'bg-[#FEF3F2] text-[#B42318]',
  medium: 'bg-[#EFF6FF] dark:bg-sky-950/40 text-[#1D4ED8] dark:text-sky-300',
  low: 'bg-[#ECFDF3] text-[#027A48]',
};

function formatFieldLabel(field: string) {
  return field.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export function MemberDashboardPage() {
  const query = useMeDashboardSummary();
  if (query.isLoading) return <DashboardLoading label="member dashboard" />;
  if (query.isError || !query.data?.member) {
    return (
      <DashboardError
        message={normalizeApiError(query.error).message}
        onRetry={() => void query.refetch()}
        isRetrying={query.isFetching && !query.isLoading}
      />
    );
  }
  const dashboard = query.data.member;

  return (
    <div className="space-y-6">
      <SectionHeader title="Dashboard" description="Works and onboarding at a glance." />

      {dashboard.member_application && !dashboard.onboarding_status.approved_member ? (
        <Alert title="Onboarding still in progress" description={`Your application is currently ${dashboard.member_application.application_status?.replace(/_/g, ' ')}.`} />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard variant={statCardVariantAt(0)} label="Total works" value={dashboard.stats.total_works} icon={<Layers3 className="h-6 w-6" />} />
        <StatCard variant={statCardVariantAt(1)} label="Draft works" value={dashboard.stats.draft_works} icon={<FileText className="h-6 w-6" />} />
        <StatCard variant={statCardVariantAt(2)} label="Submitted works" value={dashboard.stats.submitted_works} icon={<Upload className="h-6 w-6" />} />
        <StatCard variant={statCardVariantAt(3)} label="Verified works" value={dashboard.stats.verified_works} icon={<ShieldCheck className="h-6 w-6" />} />
      </div>

      <TrendChartCard title="Works status" subtitle="Draft through verified." values={[dashboard.stats.draft_works, dashboard.stats.submitted_works, dashboard.stats.verified_works, dashboard.stats.total_works]} labels={['Draft', 'Submitted', 'Verified', 'Total']} />

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <ProfileCompletenessCard tone="cream" title="Membership readiness" description="Profile fields still needed." completeness={dashboard.profile_completeness} />

        <DashboardList title="Pending actions" description="Open tasks for your account.">
          {dashboard.pending_actions.length ? dashboard.pending_actions.map((item) => (
            <DashboardListItem
              key={item.key}
              title={item.label}
              subtitle={item.description}
              meta={item.missing_fields?.length ? item.missing_fields.slice(0, 4).map((field) => (
                <span key={field} className="rounded-full border border-[#D0D5DD] bg-white dark:bg-slate-950 px-2.5 py-1 text-xs font-medium text-[#344054] dark:text-slate-200">
                  {formatFieldLabel(field)}
                </span>
              )) : undefined}
              trailing={<span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${priorityTone[item.priority]}`}>{item.priority}</span>}
            />
          )) : <div className="p-6"><EmptyState title="No pending actions" description="Your current member account does not have any urgent follow-up items." /></div>}
        </DashboardList>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_1fr]">
        <DashboardList title="Recent works" description="Your latest repertoire rows.">
          {dashboard.recent_works.length ? dashboard.recent_works.map((work) => (
            <DashboardListItem
              key={work.id}
              title={work.title}
              subtitle={work.publisher_name || work.type_of_work || 'Work record'}
              meta={<><StatusBadge value={work.work_status} /><StatusBadge value={work.verification_status} />{work.reference_number ? <span>Ref: {work.reference_number}</span> : null}</>}
            />
          )) : <div className="p-6"><EmptyState title="No works yet" description="Your work registration pipeline will populate here as soon as records are created." /></div>}
        </DashboardList>

        <DashboardList title="Recent submissions" description="Recently submitted works.">
          {dashboard.recent_submissions.length ? dashboard.recent_submissions.map((work) => (
            <DashboardListItem
              key={work.id}
              title={work.title}
              subtitle={work.submitted_at ? `Submitted ${formatDate(work.submitted_at)}` : 'Submission date unavailable'}
              trailing={<StatusBadge value={work.verification_status || work.work_status} />}
            />
          )) : <DashboardListItem title="No recent submissions" subtitle="Submitted works will appear here once you begin filing records for review." />}
        </DashboardList>
      </div>

      <DashboardList title="Membership status" description="Profile and application state.">
        <DashboardListItem title={dashboard.member_profile ? 'Approved member profile found' : 'Member profile not created yet'} subtitle={dashboard.member_profile ? 'You already have a member record in the system.' : 'Approval is still pending.'} meta={dashboard.member_profile ? <StatusBadge value={dashboard.member_profile.approval_status} /> : undefined} />
        <DashboardListItem title="Application status" subtitle={dashboard.member_application?.submission_stage || 'No submission stage available'} trailing={<StatusBadge value={dashboard.member_application?.application_status} />} />
      </DashboardList>

      <RecentDashboardActivityList title="Recent account activity" description="Latest audit entries." items={dashboard.recent_activity ?? []} />
    </div>
  );
}
