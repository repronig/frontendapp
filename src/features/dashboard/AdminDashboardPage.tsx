import { Banknote, Building2, CreditCard, FileText, Landmark, Users } from 'lucide-react';
import type { StatCardVariant } from '@/components/shared/StatCard';
import { DashboardError, DashboardLoading } from '@/features/dashboard/DashboardState';
import { useAdminDashboardSummary } from '@/features/dashboard/useDashboard';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { StatCard } from '@/components/shared/StatCard';
import { normalizeApiError } from '@/api/error';
import { DistributionCard, TrendChartCard } from '@/components/shared/Charts';
import { RecentDashboardActivityList } from '@/features/dashboard/RecentDashboardActivityList';
import { formatCurrency, formatPaymentVolumeVsInvoiceTotal } from '@/utils/format';

/** Order: Revenue, Total invoices, Total payments, Members, Institutions, Associations. */
const STAT_VARIANTS: StatCardVariant[] = ['emerald', 'indigo', 'sky', 'violet', 'amber', 'orange'];

export function AdminDashboardPage() {
  const query = useAdminDashboardSummary();
  if (query.isLoading) return <DashboardLoading label="admin dashboard" />;
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
    dashboard.institutions.total,
    dashboard.associations.total,
    dashboard.payments.paid,
  ];

  return (
    <div className="space-y-6">
      <SectionHeader title="Dashboard" description="Key numbers and activity." />

      <div className="grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          variant={STAT_VARIANTS[0]}
          label="Revenue"
          value={formatCurrency(dashboard.payments.total_paid_amount, 'NGN')}
          hint={`${dashboard.payments.paid} paid payments`}
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
          value={dashboard.institutions.total}
          hint={`${dashboard.institutions.active} active`}
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
