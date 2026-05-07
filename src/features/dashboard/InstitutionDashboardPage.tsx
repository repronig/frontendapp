import { Alert } from '@/components/ui/alert';
import { DashboardError, DashboardLoading } from '@/features/dashboard/DashboardState';
import { useInstitutionDashboard } from '@/features/dashboard/useDashboard';
import { DashboardList, DashboardListItem } from '@/components/shared/DashboardList';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { StatCard, statCardVariantAt } from '@/components/shared/StatCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { normalizeApiError } from '@/api/error';
import { EmptyState } from '@/components/shared/EmptyState';
import { DistributionCard, TrendChartCard } from '@/components/shared/Charts';
import { Building2, CreditCard, FileText, ShieldCheck } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/format';
import { resolveFileUrl } from '@/utils/fileUrl';
import { RecentDashboardActivityList } from '@/features/dashboard/RecentDashboardActivityList';

export function InstitutionDashboardPage() {
  const query = useInstitutionDashboard();

  if (query.isLoading) return <DashboardLoading label="institution dashboard" />;
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
  const recentLicences = dashboard.recent_licences ?? [];
  const recentAnnual = dashboard.recent_annual_declarations ?? [];
  const institutionLogo = resolveFileUrl(dashboard.institution.logo_thumb_url ?? dashboard.institution.logo_medium_url ?? dashboard.institution.logo_url ?? null);
  const stats = {
    totalLicences: dashboard.stats?.total_licences ?? 0,
    activeLicences: dashboard.stats?.active_licences ?? 0,
    pendingPaymentLicences: dashboard.stats?.pending_payment_licences ?? 0,
    totalAnnualDeclarations: dashboard.stats?.total_annual_declarations ?? 0,
    submittedAnnualDeclarations: dashboard.stats?.submitted_annual_declarations ?? 0,
    paidPayments: dashboard.stats?.paid_payments ?? 0,
    totalPaidAmount: dashboard.stats?.total_paid_amount ?? 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#F2D7A0] bg-[#FFF8E7] text-[#7A1C1C] dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-100">
          {institutionLogo ? <img src={institutionLogo} alt={dashboard.institution.name} className="h-full w-full object-cover" /> : <Building2 className="h-6 w-6" />}
        </div>
        <SectionHeader title={dashboard.institution.name} description="Licences, declarations, and payments." />
      </div>

      {dashboard.onboarding_status.onboarding_status && dashboard.onboarding_status.onboarding_status !== 'approved' ? (
        <Alert
          title="Institution onboarding not completed"
          description="Complete the onboarding flow before all institution features become available."
        />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard variant={statCardVariantAt(0)} label="Active licences" value={stats.activeLicences} icon={<Building2 className="h-6 w-6" />} />
        <StatCard variant={statCardVariantAt(1)} label="Pending payment" value={stats.pendingPaymentLicences} icon={<CreditCard className="h-6 w-6" />} />
        <StatCard variant={statCardVariantAt(2)} label="Total licences" value={stats.totalLicences} icon={<ShieldCheck className="h-6 w-6" />} />
        <StatCard
          variant={statCardVariantAt(3)}
          label="Annual declarations"
          value={stats.totalAnnualDeclarations}
          hint={`${stats.submittedAnnualDeclarations} submitted`}
          icon={<FileText className="h-6 w-6" />}
        />
        <StatCard
          variant={statCardVariantAt(4)}
          label="Total paid (NGN)"
          value={formatCurrency(stats.totalPaidAmount, 'NGN')}
          hint={`${stats.paidPayments} recorded licence payments`}
          icon={<CreditCard className="h-6 w-6" />}
          compactValue
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <TrendChartCard
          title="Institution activity"
          subtitle="Headline counts for your institution."
          values={[
            stats.activeLicences,
            stats.pendingPaymentLicences,
            stats.totalLicences,
            stats.totalAnnualDeclarations,
            stats.submittedAnnualDeclarations,
            stats.paidPayments,
          ]}
          labels={['Active', 'Pending', 'Total L.', 'Declarations', 'Submitted', 'Paid']}
        />
        <DistributionCard
          title="Licensing mix"
          subtitle="Licence, declaration, and payment shares."
          items={[
            { label: 'Active licences', value: stats.activeLicences, color: '#9EC5A4' },
            { label: 'Pending payment', value: stats.pendingPaymentLicences, color: '#DCCAA0' },
            { label: 'Annual declarations', value: stats.totalAnnualDeclarations, color: '#B9D3D9' },
            { label: 'Paid payments', value: stats.paidPayments, color: '#BAC1DB' },
          ]}
        />
      </div>

      <RecentDashboardActivityList title="Recent institution activity" description="Latest audit entries." items={dashboard.recent_activity ?? []} />

      <DashboardList title="Recent annual declarations" description="By licensing year.">
        {recentAnnual.length ? (
          recentAnnual.map((declaration) => (
            <DashboardListItem
              key={declaration.id}
              title={declaration.licensing_year != null ? `Licensing year ${declaration.licensing_year}` : `Declaration #${declaration.id}`}
              subtitle={declaration.basis_type ? `Basis • ${declaration.basis_type.replace(/_/g, ' ')}` : 'Annual declaration'}
              meta={<StatusBadge value={declaration.declaration_status} />}
              trailing={declaration.submitted_at ? <span className="text-xs text-[#667085]">{formatDate(declaration.submitted_at)}</span> : null}
            />
          ))
        ) : (
          <div className="p-6">
            <EmptyState title="No annual declarations yet" description="Annual declarations will show here once they are created or submitted." />
          </div>
        )}
      </DashboardList>

      <DashboardList title="Recent licences" description="Most recent licence records.">
        {recentLicences.length ? (
          recentLicences.map((licence) => (
            <DashboardListItem
              key={licence.id}
              title={licence.licence_number || `Licence ${licence.licence_year ?? licence.id}`}
              subtitle={licence.licence_year ? `Licence year ${licence.licence_year}` : 'Licence record'}
              meta={
                <>
                  <StatusBadge value={licence.licence_status} />
                  <StatusBadge value={licence.payment_status} />
                  {typeof licence.outstanding_amount === 'number' ? <span>Outstanding: {formatCurrency(licence.outstanding_amount, 'NGN')}</span> : null}
                </>
              }
            />
          ))
        ) : (
          <div className="p-6"><EmptyState title="No licences yet" description="Licence management data will appear here as records are created and processed." /></div>
        )}
      </DashboardList>
    </div>
  );
}
