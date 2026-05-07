import { useEffect, useState } from 'react';
import { useTablePagination } from '@/hooks/useTablePagination';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable';
import { FieldError, FieldHint, FieldLabel } from '@/components/shared/FieldLabel';
import { FileUploadField } from '@/components/shared/FileUploadField';
import { DetailPanelState } from '@/components/shared/DetailPanelState';
import { PaginationBar } from '@/components/shared/PaginationBar';
import { ResourceInspector } from '@/components/shared/ResourceInspector';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { StatCard } from '@/components/shared/StatCard';
import { createAdminImport, listAdminImports, processAdminImport } from '@/features/admin/api';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import type { ImportBatchResource } from '@/types/domain';
import { confirmAdminSensitiveAction } from '@/features/admin/security';
import { getAdminFieldError, showAdminActionError, showAdminActionSuccess } from '@/features/admin/action-feedback';
import { queryKeys } from '@/lib/queryKeys';

export function AdminImportsPage() {
  const { page, setPage, perPage, setPerPage } = useTablePagination();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [importType, setImportType] = useState<'' | 'members' | 'works' | 'institutions'>('');
  const [file, setFile] = useState<File | null>(null);
  const [createErrors, setCreateErrors] = useState<{ importType?: string; file?: string }>({});
  const listQuery = usePaginatedList({ queryKey: [...queryKeys.adminImportsPage, page, perPage], queryFn: listAdminImports, params: { page, per_page: perPage } });
  const selected = listQuery.data?.data?.find((row) => row.id === selectedId) ?? null;

  useEffect(() => {
    const first = listQuery.data?.data?.[0];
    if (!selectedId && first) setSelectedId(first.id);
  }, [listQuery.data, selectedId]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const nextErrors: { importType?: string; file?: string } = {};

      if (!importType) nextErrors.importType = 'Choose an import type to continue.';
      if (!file) nextErrors.file = 'Upload a CSV or TXT file to continue.';

      setCreateErrors(nextErrors);
      if (Object.keys(nextErrors).length || !file) throw new Error('Please correct the highlighted fields and try again.');
      const selectedFile = file;

      return createAdminImport({ import_type: importType as 'members' | 'works' | 'institutions', file: selectedFile });
    },
    onSuccess: (response) => {
      showAdminActionSuccess('Import batch created successfully.', response.message);
      setCreateErrors({});
      setFile(null);
      listQuery.refetch();
    },
    onError: (error) => {
      setCreateErrors((current) => ({
        importType: getAdminFieldError(error, ['import_type']) ?? current.importType,
        file: getAdminFieldError(error, ['file']) ?? current.file,
      }));
      showAdminActionError(error, 'The import batch could not be created. Check the import type and file, then try again.');
    },
  });
  const processMutation = useMutation({ mutationFn: async (batch: ImportBatchResource) => { const confirmed = await confirmAdminSensitiveAction({ title: 'Confirm import processing', description: 'Processing this import batch changes operational records. Confirm with your 6 digit admin PIN, and complete two-factor verification if required.', confirmLabel: 'Process batch' }); if (!confirmed) throw new Error('Security confirmation cancelled.'); return processAdminImport(batch.id); }, onSuccess: (response) => { showAdminActionSuccess('Import batch processed successfully.', response.message); listQuery.refetch(); }, onError: (error) => showAdminActionError(error, 'The import batch could not be processed.') });

  return <div className="space-y-6">
    <SectionHeader title="Import batches" description="CSV batches and status." />
    <div className="grid gap-4 md:grid-cols-3">
      <StatCard label="Total batches" value={listQuery.data?.meta?.total ?? 0} hint="Upload first, then process the selected batch" />
      <StatCard label="Rows on this page" value={listQuery.data?.data?.length ?? 0} hint="Latest batches returned by the backend" />
      <StatCard label="Selected batch" value={selectedId ?? "—"} hint={selected ? `Status • ${selected.status ?? "unknown"}` : "Choose a batch to inspect and process"} />
    </div>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="space-y-4"><DataTable columns={[
        { key: 'id', header: 'Batch', render: (row: ImportBatchResource) => `#${row.id}` },
        { key: 'type', header: 'Type', render: (row: ImportBatchResource) => row.import_type ?? '—' },
        { key: 'status', header: 'Status', render: (row: ImportBatchResource) => row.status ?? '—' },
        { key: 'summary', header: 'Summary', render: (row: ImportBatchResource) => `${row.processed_rows ?? 0}/${row.total_rows ?? 0}` },
      ]} rows={listQuery.data?.data ?? []} isLoading={listQuery.isLoading} loadingTitle="Loading import batches" loadingDescription="The latest import batches are being fetched from the backend." onRowClick={(row) => setSelectedId(row.id)} getRowKey={(row) => row.id} selectedRowKey={selectedId ?? undefined} exportTitle="Admin import batches"
        emptyTitle="No import batches yet" emptyDescription="Create a new batch from the form on the right, then return here to inspect and process it." /><PaginationBar meta={listQuery.data?.meta} onPageChange={setPage} perPage={perPage} onPerPageChange={setPerPage} /></div>
      <div className="space-y-4">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white dark:bg-slate-950 p-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Create import batch</h3>
          <label className="block space-y-2">
            <FieldLabel required>Import type</FieldLabel>
            <select className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:bg-slate-950" value={importType} onChange={(event) => { setImportType(event.target.value as '' | 'members' | 'works' | 'institutions'); setCreateErrors((current) => ({ ...current, importType: undefined })); }}>
              <option value="" disabled>Select import type</option>
              <option value="members">Members</option>
              <option value="works">Works</option>
              <option value="institutions">Institutions</option>
            </select>
            <FieldError message={createErrors.importType} />
            {!createErrors.importType ? <FieldHint>Choose the record group that matches the uploaded file.</FieldHint> : null}
          </label>
          <FileUploadField
            label="File"
            required
            file={file}
            accept=".csv,.txt"
            error={createErrors.file}
            helperText="Upload a CSV or TXT file for the selected import type."
            onFileChange={(selectedFile) => { setFile(selectedFile); setCreateErrors((current) => ({ ...current, file: undefined })); }}
          />
          <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>{createMutation.isPending ? 'Creating…' : 'Create batch'}</Button>
        </div>
        {selected ? <div className="space-y-4"><Button onClick={() => processMutation.mutate(selected)} disabled={processMutation.isPending}>{processMutation.isPending ? 'Processing…' : 'Process batch'}</Button><ResourceInspector title="Selected import batch" data={selected} /></div> : <DetailPanelState mode="empty" title="No import batch selected" description="Choose a batch from the table after upload to inspect its details and process it." />}
      </div>
    </div>
  </div>;
}
