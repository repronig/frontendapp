import { useQuery } from '@tanstack/react-query';
import { Banknote, Building2, Cable, CreditCard, FileText, Landmark, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { StatCardVariant } from '@/components/shared/StatCard';
import { StatCard, statCardVariantAt } from '@/components/shared/StatCard';
import { DashboardError, DashboardLoading } from '@/features/dashboard/DashboardState';
import { normalizeApiError } from '@/api/error';
import { getSuperIntegrationOutboxSummary } from '@/features/super-admin/api';
import { useSuperAdminDashboardSummary } from '@/features/dashboard/useDashboard';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { DistributionCard, TrendChartCard } from '@/components/shared/Charts';
import { RecentDashboardActivityList } from '@/features/dashboard/RecentDashboardActivityList';
import { showWipoConnectOutboxUi } from '@/config/features';
import { formatCurrency, formatPaymentVolumeVsInvoiceTotal } from '@/utils/format';
import { queryKeys } from '@/lib/queryKeys';

const STAT_VARIANTS: StatCardVariant[] = ['emerald', 'indigo', 'sky', 'violet', 'amber', 'orange'];

export function SuperAdminDashboardPage() {
  const query = useSuperAdminDashboardSummary();
  const outboxSummaryQuery = useQuery({
    queryKey: queryKeys.superDashboardIntegrationOutboxSummary,
    queryFn: async () => (await getSuperIntegrationOutboxSummary()).data,
    staleTime: 30_000,
    enabled: showWipoConnectOutboxUi,
  });

  if (query.isLoading) return <DashboardLoading label="super admin dashboard" />;
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

  const invoiceSum = dashboard.invoices.total_amount_sum ?? 0;
  const paymentSum = dashboard.payments.total_amount_sum ?? 0;
  const paymentCount = dashboard.payments.total;
  const paymentHint = `${paymentCount} payment${paymentCount === 1 ? '' : 's'} · ${formatPaymentVolumeVsInvoiceTotal(paymentSum, invoiceSum)}`;

  const trendValues = [
    dashboard.invoices.total,
    dashboard.payments.total,
    dashboard.members.total,
    dashboard.organizations.institutions,
    dashboard.associations.total,
    dashboard.payments.paid,
  ];

  return (
    <div className="space-y-6">
      <SectionHeader title="Dashboard" description="Key data and insights from all users" />

      <div className="grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          variant={STAT_VARIANTS[0]}
          label="Revenue"
          value={formatCurrency(dashboard.revenue.total_paid_amount, 'NGN')}
          hint={`${dashboard.revenue.paid_payments} paid payments`}
          icon={<Banknote className="h-6 w-6" />}
          compactValue
        />
        <StatCard
          variant={STAT_VARIANTS[1]}
          label="Total invoices"
          value={formatCurrency(invoiceSum, 'NGN')}
          hint={`${dashboard.invoices.total} invoice${dashboard.invoices.total === 1 ? '' : 's'}`}
          icon={<FileText className="h-6 w-6" />}
          compactValue
        />
        <StatCard
          variant={STAT_VARIANTS[2]}
          label="Total payments"
          value={formatCurrency(paymentSum, 'NGN')}
          hint={paymentHint}
          icon={<CreditCard className="h-6 w-6" />}
          compactValue
        />
        <StatCard
          variant={STAT_VARIANTS[3]}
          label="Members"
          value={dashboard.members.total}
          hint={`${dashboard.members.approved} approved`}
          icon={<Users className="h-6 w-6" />}
        />
        <StatCard
          variant={STAT_VARIANTS[4]}
          label="Institutions"
          value={dashboard.organizations.institutions}
          hint={`${dashboard.organizations.active_institutions} active`}
          icon={<Building2 className="h-6 w-6" />}
        />
        <StatCard
          variant={STAT_VARIANTS[5]}
          label="Associations"
          value={dashboard.associations.total}
          hint={`${dashboard.associations.enabled} enabled`}
          icon={<Landmark className="h-6 w-6" />}
        />
      </div>

      {showWipoConnectOutboxUi && outboxSummaryQuery.data ? (
        <div className="rounded-2xl border border-[#EAECF0] bg-[#FCFCFD] p-5 dark:border-slate-800 dark:bg-slate-950/40">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-[#101828] dark:text-slate-100">Integration outbox</h3>
            <Link to="/super-admin/integrations" className="inline-flex items-center gap-2 text-sm font-semibold text-[#2F6FED] hover:underline">
              <Cable className="h-4 w-4" aria-hidden />
              Open integrations
            </Link>
          </div>
          <div className="mt-4 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard variant={statCardVariantAt(6)} label="Pending" value={outboxSummaryQuery.data.pending_total} hint="Across all providers" />
            <StatCard variant={statCardVariantAt(7)} label="Processing" value={outboxSummaryQuery.data.processing_total} hint="In flight now" />
            <StatCard variant={statCardVariantAt(0)} label="Failed (window)" value={outboxSummaryQuery.data.failed_last_24h} hint="Recent failures in health window" />
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <TrendChartCard
          title="Volume snapshot"
          subtitle="Six headline counts (invoices through paid)."
          values={trendValues}
          labels={['Invoices', 'Payments', 'Members', 'Institutions', 'Associations', 'Paid']}
        />
        <DistributionCard
          title="User account status"
          subtitle="Active, inactive, and suspended."
          items={[
            { label: 'Active', value: dashboard.users.active, color: '#9EC5A4' },
            { label: 'Inactive', value: dashboard.users.inactive, color: '#BAC1DB' },
            { label: 'Suspended', value: dashboard.users.suspended, color: '#DCCAA0' },
          ]}
        />
      </div>

      <RecentDashboardActivityList title="Recent platform activity" description="Latest audit entries." items={dashboard.recent_activity ?? []} />
    </div>
  );
}
