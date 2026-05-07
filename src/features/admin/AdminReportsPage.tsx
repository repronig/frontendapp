import { useMemo, useState } from 'react';
import { useTablePagination } from '@/hooks/useTablePagination';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DistributionCard, MiniBarsCard, TrendChartCard } from '@/components/shared/Charts';
import { DataTable } from '@/components/shared/DataTable';
import { PaginationBar } from '@/components/shared/PaginationBar';
import { SearchFilterBar } from '@/components/shared/SearchFilterBar';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { StatCard, statCardVariantAt } from '@/components/shared/StatCard';
import { getAdminBoardSummary, getAdminCompletenessReport, getAdminMemberReport, getAdminWorkReport, listAdminLicenceReports } from '@/features/admin/api';
import { normalizeApiError } from '@/api/error';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import type { InstitutionLicensingSummary } from '@/types/domain';
import { triggerBlobDownload } from '@/utils/download';
import { formatCurrency } from '@/utils/format';
import { queryKeys } from '@/lib/queryKeys';

export function AdminReportsPage() {
  const location = useLocation();
  const isSuperAdminPortal = location.pathname.startsWith('/super-admin');
  const { page, setPage, perPage, setPerPage } = useTablePagination();
  const [search, setSearch] = useState('');

  const boardSummaryQuery = useQuery({ queryKey: queryKeys.adminBoardSummary, queryFn: async () => (await getAdminBoardSummary()).data });
  const memberReportQuery = useQuery({ queryKey: queryKeys.adminMemberReport, queryFn: async () => (await getAdminMemberReport()).data });
  const workReportQuery = useQuery({ queryKey: queryKeys.adminWorkReport, queryFn: async () => (await getAdminWorkReport()).data });
  const completenessReportQuery = useQuery({ queryKey: queryKeys.adminCompletenessReport, queryFn: async () => (await getAdminCompletenessReport()).data });
  const licenceReportQuery = usePaginatedList({
    queryKey: [...queryKeys.adminLicenceReport, page, perPage, search],
    queryFn: listAdminLicenceReports,
    params: { page, per_page: perPage, search: search || undefined },
  });

  const error = [boardSummaryQuery.error, memberReportQuery.error, workReportQuery.error, completenessReportQuery.error, licenceReportQuery.error].find(Boolean);

  const exportRows = useMemo(
    () => (licenceReportQuery.data?.data ?? []).map((row) => ({
      institution: row.institution_name ?? '',
      licenceId: row.licence_id ?? '',
      year: row.licensing_year ?? '',
      expected: row.expected_amount ?? 0,
      outstanding: row.outstanding_amount ?? 0,
    })),
    [licenceReportQuery.data?.data],
  );

  function exportLicenceReport() {
    const lines = [
      ['Institution', 'Licence ID', 'Year', 'Expected Amount', 'Outstanding Amount'],
      ...exportRows.map((row) => [row.institution, row.licenceId, String(row.year), String(row.expected), String(row.outstanding)]),
    ];
    const csv = lines
      .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    triggerBlobDownload(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `licence_report_${new Date().toISOString().slice(0, 10)}.csv`);
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title={isSuperAdminPortal ? 'Reports' : 'Admin reports'}
        description={isSuperAdminPortal ? 'Board metrics and licence export.' : 'Board, operational, and completeness views.'}
        action={<Button variant="outline" onClick={exportLicenceReport} disabled={!exportRows.length}>Export report</Button>}
      />

      {error ? <Card><p className="text-sm text-red-600">{normalizeApiError(error).message}</p></Card> : null}

      {boardSummaryQuery.data ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard variant={statCardVariantAt(0)} label="Members" value={boardSummaryQuery.data.total_members} hint={`${boardSummaryQuery.data.approved_members} approved`} />
          <StatCard variant={statCardVariantAt(1)} label="Pending members" value={boardSummaryQuery.data.pending_members} hint={`Period ${boardSummaryQuery.data.period}`} />
          <StatCard variant={statCardVariantAt(2)} label="Works registered" value={boardSummaryQuery.data.works_registered} hint={`${boardSummaryQuery.data.verified_works} verified`} />
          <StatCard variant={statCardVariantAt(3)} label="Institutions onboarded" value={boardSummaryQuery.data.institutions_onboarded} hint={`${boardSummaryQuery.data.licences_issued} licences issued`} />
          <StatCard variant={statCardVariantAt(4)} label="Collection rate" value={`${boardSummaryQuery.data.invoice_collection_rate}%`} hint={formatCurrency(boardSummaryQuery.data.outstanding_receivables)} />
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        {memberReportQuery.data ? (
          <TrendChartCard title="Member report" subtitle="Member and application counts." values={[memberReportQuery.data.summary.total_members, memberReportQuery.data.summary.approved_members, memberReportQuery.data.summary.author_members, memberReportQuery.data.summary.publisher_members, memberReportQuery.data.applications.submitted, memberReportQuery.data.applications.changes_requested]} labels={['Total', 'Approved', 'Authors', 'Publishers', 'Applications', 'Changes requested']} />
        ) : null}

        {workReportQuery.data ? (
          <MiniBarsCard title="Work report" values={[{ label: 'Total', value: workReportQuery.data.summary.total_works }, { label: 'Draft', value: workReportQuery.data.summary.draft_works }, { label: 'Submitted', value: workReportQuery.data.summary.submitted_works }, { label: 'Verified', value: workReportQuery.data.summary.verified_works }]} />
        ) : null}

        {completenessReportQuery.data ? (
          <DistributionCard title="Completeness report" subtitle="Profiles and licence-related counts." items={[{ label: 'Profiles complete', value: completenessReportQuery.data.institutions.with_profile, color: '#9EC5A4' }, { label: 'Profiles missing', value: completenessReportQuery.data.institutions.without_profile, color: '#DCCAA0' }, { label: 'Licences', value: completenessReportQuery.data.licences.total_licences, color: '#BAC1DB' }, { label: 'Usage submitted', value: completenessReportQuery.data.licences.submitted_usage_declarations, color: '#B9D3D9' }]} />
        ) : null}

        {memberReportQuery.data ? (
          <Card className="space-y-3">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Report summary</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <StatCard variant={statCardVariantAt(5)} label="Total members" value={memberReportQuery.data.summary.total_members} />
              <StatCard variant={statCardVariantAt(6)} label="Approved members" value={memberReportQuery.data.summary.approved_members} />
              <StatCard variant={statCardVariantAt(7)} label="Submitted works" value={workReportQuery.data?.summary.submitted_works ?? 0} />
              <StatCard variant={statCardVariantAt(0)} label="Verified works" value={workReportQuery.data?.summary.verified_works ?? 0} />
            </div>
          </Card>
        ) : null}
      </div>

      <SectionHeader title="Licence report" description="Per-institution licensing rows." />
      <SearchFilterBar search={search} onSearchChange={(value) => { setSearch(value); setPage(1); }} searchPlaceholder="Search institution name or licence id" onReset={() => { setSearch(''); setPage(1); }} />
      <DataTable columns={[
        { key: 'institution_name', header: 'Institution', render: (row: InstitutionLicensingSummary) => row.institution_name ?? '—' },
        { key: 'licence_id', header: 'Licence ID', render: (row: InstitutionLicensingSummary) => row.licence_id ?? '—' },
        { key: 'year', header: 'Year', render: (row: InstitutionLicensingSummary) => row.licensing_year ?? '—' },
        { key: 'expected', header: 'Expected', render: (row: InstitutionLicensingSummary) => formatCurrency(row.expected_amount) },
        { key: 'outstanding', header: 'Outstanding', render: (row: InstitutionLicensingSummary) => formatCurrency(row.outstanding_amount) },
      ]} rows={licenceReportQuery.data?.data ?? []} isLoading={licenceReportQuery.isLoading} loadingTitle="Loading licence report" loadingDescription="The latest licence report rows are being fetched from the backend." exportTitle="Admin licence report" emptyTitle="No licence report rows found" />
      <PaginationBar meta={licenceReportQuery.data?.meta} onPageChange={setPage} perPage={perPage} onPerPageChange={setPerPage} />
    </div>
  );
}
