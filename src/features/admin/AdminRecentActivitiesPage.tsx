import { useState } from 'react';
import { useTablePagination } from '@/hooks/useTablePagination';
import { useQuery } from '@tanstack/react-query';
import { DataTable } from '@/components/shared/DataTable';
import { DetailGrid } from '@/components/shared/DetailGrid';
import { DetailPanelState } from '@/components/shared/DetailPanelState';
import { Modal } from '@/components/shared/Modal';
import { PaginationBar } from '@/components/shared/PaginationBar';
import { SearchFilterBar } from '@/components/shared/SearchFilterBar';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { StatCard } from '@/components/shared/StatCard';
import { getAdminAuditLog, listAdminAuditLogs } from '@/features/admin/api';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import type { AuditLogResource } from '@/types/domain';
import { formatDate, humanizeLabel } from '@/utils/format';
import { queryKeys } from '@/lib/queryKeys';

export function AdminRecentActivitiesPage() {
  const { page, setPage, perPage, setPerPage } = useTablePagination();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const listQuery = usePaginatedList({
    queryKey: [...queryKeys.adminRecentActivities, page, perPage, search],
    queryFn: listAdminAuditLogs,
    params: { page, per_page: perPage, search: search || undefined },
  });

  const detailQuery = useQuery({
    queryKey: queryKeys.adminRecentActivityDetail(selectedId),
    queryFn: async () => getAdminAuditLog(selectedId as number),
    enabled: Boolean(selectedId) && modalOpen,
  });

  function openDetails(id: number) {
    setSelectedId(id);
    setModalOpen(true);
  }

  const rows = listQuery.data?.data ?? [];

  return (
    <div className="space-y-6">
      <SectionHeader title="Recent Activities" description="Latest admin audit entries." />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Filtered activities" value={listQuery.data?.meta?.total ?? 0} hint={search ? 'Search narrowed the activity stream' : 'Most recent admin activity'} />
        <StatCard label="Rows on this page" value={rows.length} hint="Current activity records returned by the backend" />
        <StatCard label="Selected activity" value={selectedId ?? '—'} hint={selectedId ? 'Open in details modal' : 'Choose a row to inspect'} />
      </div>

      <SearchFilterBar search={search} onSearchChange={(value) => { setSearch(value); setPage(1); }} searchPlaceholder="Search action, actor, or subject" onReset={() => { setSearch(''); setPage(1); }} />

      <DataTable
        columns={[
          { key: 'action', header: 'Activity', render: (row: AuditLogResource) => <div><p className="font-semibold text-[#101828]">{humanizeLabel(row.action ?? 'Activity')}</p><p className="mt-1 text-sm text-[#667085] dark:text-slate-300">{row.subject_type ? `${humanizeLabel(row.subject_type)} #${row.subject_id ?? '—'}` : 'Administrative activity'}</p></div> },
          { key: 'actor', header: 'Actor', render: (row: AuditLogResource) => row.actor?.name ?? row.actor?.email ?? 'System' },
          { key: 'created_at', header: 'Date', render: (row: AuditLogResource) => formatDate(row.created_at) },
        ]}
        rows={rows}
        isLoading={listQuery.isLoading}
        loadingTitle="Loading recent activities"
        loadingDescription="The latest admin activity records are being fetched from the backend."
        emptyTitle="No recent activities found"
        emptyDescription="Recent admin actions will appear here after workflow, declaration, finance, and governance events are logged."
        onRowClick={(row) => openDetails(row.id)}
        getRowKey={(row) => row.id}
      />
      <PaginationBar meta={listQuery.data?.meta} onPageChange={setPage} subject="activities" perPage={perPage} onPerPageChange={setPerPage} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Recent activity details" subtitle="Inspect the selected action, actor, subject, and before/after payload." size="lg">
        {detailQuery.isLoading ? <DetailPanelState mode="loading" title="Loading activity" description="Please wait…preparing selected activity." /> : null}
        {!detailQuery.isLoading && !detailQuery.data?.data ? <DetailPanelState mode="empty" title="No activity selected" description="Choose an activity row to continue." /> : null}
        {detailQuery.data?.data ? (
          <div className="space-y-5">
            <DetailGrid items={[
              { label: 'Action', value: humanizeLabel(detailQuery.data.data.action ?? 'Activity') },
              { label: 'Subject', value: `${detailQuery.data.data.subject_type ?? '—'} #${detailQuery.data.data.subject_id ?? '—'}` },
              { label: 'Actor', value: detailQuery.data.data.actor?.name ?? detailQuery.data.data.actor?.email ?? 'System' },
              { label: 'Created', value: formatDate(detailQuery.data.data.created_at) },
            ]} />
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
