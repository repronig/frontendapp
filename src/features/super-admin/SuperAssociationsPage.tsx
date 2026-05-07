import { type Dispatch, type SetStateAction, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ActionDialog } from '@/components/shared/ActionDialog';
import { ActivityTimeline } from '@/components/shared/ActivityTimeline';
import { DataTable } from '@/components/shared/DataTable';
import { DetailGrid } from '@/components/shared/DetailGrid';
import { FormField } from '@/components/shared/FormField';
import { FormTextareaField } from '@/components/shared/FormTextareaField';
import { Modal } from '@/components/shared/Modal';
import { PaginationBar } from '@/components/shared/PaginationBar';
import { SearchFilterBar } from '@/components/shared/SearchFilterBar';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { editActionButtonClass, viewActionButtonClass } from '@/components/shared/tableActionStyles';
import { activateSuperAssociation, createSuperAssociation, deactivateSuperAssociation, getSuperAssociation, listSuperAssociations, listSuperTimeline, updateSuperAssociation } from '@/features/super-admin/api';
import { onMutationApiError } from '@/lib/mutationFeedback';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { useTablePagination } from '@/hooks/useTablePagination';
import type { AssociationResource } from '@/types/domain';
import { queryKeys } from '@/lib/queryKeys';

const initialForm = {
  name: '',
  code: '',
  type: '',
  description: '',
  contact_email: '',
  contact_phone: '',
  status: 'active' as 'active' | 'inactive',
  country: 'Nigeria',
  is_enabled: true,
  disable_reason: '',
};

type ViewMode = 'create' | 'edit' | 'view' | null;

function AssociationForm({
  mode,
  form,
  setForm,
  onSave,
  onDeactivate,
  isSaving,
  isDeactivating,
  canDeactivate,
}: {
  mode: 'create' | 'edit';
  form: typeof initialForm;
  setForm: Dispatch<SetStateAction<typeof initialForm>>;
  onSave: () => void;
  onDeactivate: () => void;
  isSaving: boolean;
  isDeactivating: boolean;
  canDeactivate: boolean;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Name" requiredIndicator value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
        <FormField label="Code" requiredIndicator value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} />
        <FormField label="Type" requiredIndicator value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))} />
        <FormField label="Country" requiredIndicator value={form.country} onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))} />
        <FormField label="Contact email" requiredIndicator type="email" value={form.contact_email} onChange={(event) => setForm((current) => ({ ...current, contact_email: event.target.value }))} />
        <FormField label="Contact phone" requiredIndicator value={form.contact_phone} onChange={(event) => setForm((current) => ({ ...current, contact_phone: event.target.value }))} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-[15px] font-semibold text-[#2B2B2D] dark:text-slate-100">Status<span className="ml-1 text-red-600 dark:text-red-400">*</span></span>
          <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as 'active' | 'inactive' }))} className="h-11 w-full rounded-xl border border-slate-300 bg-white dark:bg-slate-950 px-3 text-sm">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        <label className="flex items-center justify-between rounded-2xl border border-[#EAECF0] dark:border-slate-800 bg-[#FCFCF7] dark:bg-slate-900 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-[#2B2B2D] dark:text-slate-100">Enabled in public listing</p>
            <p className="mt-1 text-sm text-[#6B788E] dark:text-slate-300">Controls visibility and platform access state.</p>
          </div>
          <input type="checkbox" checked={form.is_enabled} onChange={(event) => setForm((current) => ({ ...current, is_enabled: event.target.checked }))} className="h-4 w-4 rounded border-slate-300" />
        </label>
      </div>

      <FormTextareaField label="Description" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={5} />
      <FormTextareaField label="Disable reason" value={form.disable_reason} onChange={(event) => setForm((current) => ({ ...current, disable_reason: event.target.value }))} rows={4} />

      <div className="flex flex-wrap gap-3 pt-2">
        <Button onClick={onSave} disabled={isSaving}>{mode === 'create' ? 'Create association' : 'Save changes'}</Button>
        {canDeactivate ? <Button variant="destructive" onClick={onDeactivate} disabled={isDeactivating}>Deactivate association</Button> : null}
      </div>
    </div>
  );
}

export function SuperAssociationsPage() {
  const queryClient = useQueryClient();
  const { page, setPage, perPage, setPerPage } = useTablePagination();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState(initialForm);
  const [modalMode, setModalMode] = useState<ViewMode>(null);
  const [actionMode, setActionMode] = useState<'activate' | 'deactivate' | null>(null);

  const listQuery = usePaginatedList({ queryKey: [...queryKeys.superAssociations, page, perPage, search, status], queryFn: listSuperAssociations, params: { page, per_page: perPage, search: search || undefined, status: status || undefined } });
  const detailQuery = useQuery({ queryKey: queryKeys.superAssociation(selectedId), queryFn: async () => getSuperAssociation(selectedId as number), enabled: Boolean(selectedId) && modalMode !== null });
  const timelineQuery = useQuery({ queryKey: queryKeys.superAssociationTimeline(selectedId), queryFn: async () => listSuperTimeline('association', selectedId as number, { page: 1, per_page: 8 }), enabled: Boolean(selectedId) && modalMode === 'view' });

  useEffect(() => {
    const association = detailQuery.data?.data;
    if (!association || modalMode !== 'edit') return;
    setForm({
      name: association.name,
      code: association.code,
      type: association.type ?? '',
      description: association.description ?? '',
      contact_email: association.contact_email ?? '',
      contact_phone: association.contact_phone ?? '',
      status: association.status as 'active' | 'inactive',
      country: association.address.country ?? 'Nigeria',
      is_enabled: association.is_enabled,
      disable_reason: association.disable_reason ?? '',
    });
  }, [detailQuery.data, modalMode]);

  const selectedAssociation = useMemo(
    () => listQuery.data?.data.find((row) => row.id === selectedId) ?? detailQuery.data?.data ?? null,
    [detailQuery.data, listQuery.data, selectedId],
  );

  function openCreateModal() {
    setSelectedId(null);
    setModalMode('create');
    setForm(initialForm);
  }

  function openViewModal(id: number) {
    setSelectedId(id);
    setModalMode('view');
  }

  function openEditModal(id: number) {
    setSelectedId(id);
    setModalMode('edit');
  }

  function closeModal() {
    setModalMode(null);
  }

  const saveMutation = useMutation({
    mutationFn: async () => modalMode === 'create' ? createSuperAssociation(form) : updateSuperAssociation(selectedId as number, form),
    onSuccess: (response) => {
      toast.success(response.message);
      queryClient.invalidateQueries({ queryKey: queryKeys.superAssociations });
      if ('id' in response.data) setSelectedId(response.data.id);
      closeModal();
    },
    onError: onMutationApiError(),
  });

  const activateMutation = useMutation({
    mutationFn: async (id: number) => activateSuperAssociation(id),
    onSuccess: (response) => {
      toast.success(response.message);
      queryClient.invalidateQueries({ queryKey: queryKeys.superAssociations });
      queryClient.invalidateQueries({ queryKey: queryKeys.superAssociation(selectedId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.superAssociationTimeline(selectedId) });
      setActionMode(null);
    },
    onError: onMutationApiError(),
  });

  const deactivateMutation = useMutation({
    mutationFn: async ({ association, reason }: { association: AssociationResource; reason?: string }) => deactivateSuperAssociation(association.id, reason),
    onSuccess: (response) => {
      toast.success(response.message);
      queryClient.invalidateQueries({ queryKey: queryKeys.superAssociations });
      queryClient.invalidateQueries({ queryKey: queryKeys.superAssociation(selectedId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.superAssociationTimeline(selectedId) });
      setActionMode(null);
      closeModal();
    },
    onError: onMutationApiError(),
  });

  const associationForView = detailQuery.data?.data ?? selectedAssociation;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Association governance"
        description="Association directory and status."
        action={<Button onClick={openCreateModal}>New association</Button>}
      />

      <SearchFilterBar search={search} onSearchChange={(value) => { setSearch(value); setPage(1); }} status={status} onStatusChange={(value) => { setStatus(value); setPage(1); }} searchPlaceholder="Search name or code" onReset={() => { setSearch(''); setStatus(''); setPage(1); }} />

      <div className="space-y-4">
        <DataTable
          columns={[
            { key: 'name', header: 'Association', render: (row: AssociationResource) => row.name },
            { key: 'code', header: 'Code', render: (row: AssociationResource) => row.code },
            { key: 'status', header: 'Status', render: (row: AssociationResource) => <StatusBadge value={row.status} /> },
            { key: 'enabled', header: 'Enabled', render: (row: AssociationResource) => <StatusBadge value={row.is_enabled ? 'enabled' : 'disabled'} /> },
            {
              key: 'actions',
              header: '',
              render: (row: AssociationResource) => (
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" className={viewActionButtonClass} onClick={(event) => { event.stopPropagation(); openViewModal(row.id); }}>View</Button>
                  <Button size="sm" variant="outline" className={editActionButtonClass} onClick={(event) => { event.stopPropagation(); openEditModal(row.id); }}>Edit</Button>
                </div>
              ),
            },
          ]}
          rows={listQuery.data?.data ?? []}
          getRowKey={(row) => row.id}
        />
        <PaginationBar meta={listQuery.data?.meta} onPageChange={setPage} perPage={perPage} onPerPageChange={setPerPage} />
      </div>

      <Modal
        open={modalMode !== null}
        onClose={closeModal}
        title={modalMode === 'create' ? 'Create association' : modalMode === 'edit' ? 'Edit association' : 'Association details'}
        subtitle={modalMode === 'view' ? 'Review the selected association and its recent governance history.' : 'Association creation and editing happen in a modal instead of beside the list.'}
        size={modalMode === 'view' ? 'lg' : 'md'}
      >
        {modalMode === 'view' ? (
          detailQuery.isLoading ? <Alert title="Loading association" description="Please wait…preparing selected resource." /> : associationForView ? (
            <div className="space-y-6">
              <DetailGrid
                items={[
                  { label: 'Name', value: associationForView.name },
                  { label: 'Code', value: associationForView.code },
                  { label: 'Type', value: associationForView.type ?? '—' },
                  { label: 'Status', value: <StatusBadge value={associationForView.status} /> },
                  { label: 'Enabled', value: <StatusBadge value={associationForView.is_enabled ? 'enabled' : 'disabled'} /> },
                  { label: 'Country', value: associationForView.address?.country ?? 'Nigeria' },
                  { label: 'Contact email', value: associationForView.contact_email ?? '—' },
                  { label: 'Contact phone', value: associationForView.contact_phone ?? '—' },
                ]}
              />
              <Alert title="Description" description={associationForView.description ?? 'No description supplied.'} />
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => setModalMode('edit')}>Edit association</Button>
                {associationForView.is_enabled ? <Button variant="destructive" onClick={() => setActionMode('deactivate')}>Deactivate</Button> : <Button variant="outline" onClick={() => setActionMode('activate')}>Reactivate</Button>}
              </div>
              <ActivityTimeline items={timelineQuery.data?.data} isLoading={timelineQuery.isLoading} emptyTitle="No governance activity yet" />
            </div>
          ) : <Alert title="No association selected" description="Choose an association from the table to continue." />
        ) : (
          <AssociationForm
            mode={modalMode === 'create' ? 'create' : 'edit'}
            form={form}
            setForm={setForm}
            onSave={() => saveMutation.mutate()}
            onDeactivate={() => setActionMode('deactivate')}
            isSaving={saveMutation.isPending}
            isDeactivating={deactivateMutation.isPending}
            canDeactivate={modalMode === 'edit' && Boolean(associationForView)}
          />
        )}
      </Modal>

      <ActionDialog
        open={actionMode === 'activate'}
        onClose={() => setActionMode(null)}
        title="Reactivate association"
        description="This will restore the association to active platform access."
        actionLabel="Reactivate association"
        actionVariant="outline"
        onConfirm={() => { if (associationForView) activateMutation.mutate(associationForView.id); }}
        isSubmitting={activateMutation.isPending}
      />

      <ActionDialog
        open={actionMode === 'deactivate'}
        onClose={() => setActionMode(null)}
        title="Deactivate association"
        description="This is a governance action and should include a short reason."
        actionLabel="Deactivate association"
        actionVariant="destructive"
        showReason
        initialReason={form.disable_reason}
        onConfirm={(reason) => { if (associationForView) deactivateMutation.mutate({ association: associationForView, reason }); }}
        isSubmitting={deactivateMutation.isPending}
      />
    </div>
  );
}
