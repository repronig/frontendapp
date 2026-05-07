import { useState } from 'react';
import { useTablePagination } from '@/hooks/useTablePagination';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/shared/DataTable';
import { DetailPanelState } from '@/components/shared/DetailPanelState';
import { DetailGrid } from '@/components/shared/DetailGrid';
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

export function AdminAuditLogsPage() {
  const { page, setPage, perPage, setPerPage } = useTablePagination();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const listQuery = usePaginatedList({
    queryKey: [...queryKeys.adminAuditPage, page, perPage, search],
    queryFn: listAdminAuditLogs,
    params: { page, per_page: perPage, search: search || undefined },
  });

  const detailQuery = useQuery({
    queryKey: queryKeys.adminAuditPageDetail(selectedId),
    queryFn: async () => getAdminAuditLog(selectedId as number),
    enabled: Boolean(selectedId) && modalOpen,
  });

  function openDetails(id: number) {
    setSelectedId(id);
    setModalOpen(true);
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Audit logs" description="Searchable audit trail." />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Filtered audit entries" value={listQuery.data?.meta?.total ?? 0} hint={search ? "Search narrowed the activity stream" : "Recent admin actions in scope"} />
        <StatCard label="Rows on this page" value={listQuery.data?.data?.length ?? 0} hint="Current audit page returned by the backend" />
        <StatCard label="Selected log" value={selectedId ?? "—"} hint={selectedId ? "Detail modal stays aligned with selection" : "Choose a row to inspect payload changes"} />
      </div>
      <SearchFilterBar search={search} onSearchChange={(value) => { setSearch(value); setPage(1); }} searchPlaceholder="Search action, actor, or subject" onReset={() => { setSearch(''); setPage(1); }} />
      <DataTable
        columns={[
          { key: 'event', header: 'Event', render: (row: AuditLogResource) => row.action ?? '—' },
          { key: 'subject', header: 'Subject', render: (row: AuditLogResource) => `${row.subject_type ?? '—'} #${row.subject_id ?? '—'}` },
          { key: 'actor', header: 'Actor', render: (row: AuditLogResource) => row.actor?.name ?? row.actor?.email ?? 'System' },
          { key: 'at', header: 'At', render: (row: AuditLogResource) => formatDate(row.created_at) },
        ]}
        rows={listQuery.data?.data ?? []}
        isLoading={listQuery.isLoading}
        loadingTitle="Loading audit logs"
        loadingDescription="The latest audit activity is being fetched from the backend."
        onRowClick={(row) => openDetails(row.id)}
        getRowKey={(row) => row.id}
        emptyTitle="No audit logs found"
      />
      <PaginationBar meta={listQuery.data?.meta} onPageChange={setPage} perPage={perPage} onPerPageChange={setPerPage} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Audit log details" subtitle="Inspect the exact action, subject, actor, and before/after state returned by the backend." size="lg">
        {detailQuery.isLoading ? <DetailPanelState mode="loading" title="Loading audit log" description="Please wait…preparing selected resource." /> : null}
        {!detailQuery.isLoading && !detailQuery.data?.data ? <DetailPanelState mode="empty" title="No audit log selected" description="Choose an audit log row to continue." /> : null}
        {detailQuery.data?.data ? (
          <div className="space-y-5">
            <DetailGrid items={[
              { label: 'Action', value: detailQuery.data.data.action ?? '—' },
              { label: 'Subject', value: `${detailQuery.data.data.subject_type ?? '—'} #${detailQuery.data.data.subject_id ?? '—'}` },
              { label: 'Actor', value: detailQuery.data.data.actor?.name ?? detailQuery.data.data.actor?.email ?? 'System' },
              { label: 'Created', value: formatDate(detailQuery.data.data.created_at) },
            ]} />
            <Card className="space-y-3 p-5">
              <h4 className="text-base font-semibold text-[#101828]">Before</h4>
              <pre className="overflow-auto rounded-2xl bg-slate-50 dark:bg-slate-900 p-4 text-xs text-slate-700 dark:text-slate-300">{JSON.stringify(detailQuery.data.data.before, null, 2)}</pre>
            </Card>
            <Card className="space-y-3 p-5">
              <h4 className="text-base font-semibold text-[#101828]">After</h4>
              <pre className="overflow-auto rounded-2xl bg-slate-50 dark:bg-slate-900 p-4 text-xs text-slate-700 dark:text-slate-300">{JSON.stringify(detailQuery.data.data.after, null, 2)}</pre>
            </Card>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
