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
import { Modal } from '@/components/shared/Modal';
import { PaginationBar } from '@/components/shared/PaginationBar';
import { SearchFilterBar } from '@/components/shared/SearchFilterBar';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { editActionButtonClass, viewActionButtonClass } from '@/components/shared/tableActionStyles';
import { formatDisplayLabel } from '@/utils/display';
import { activateSuperUser, createSuperUser, deactivateSuperUser, getSuperUser, listSuperTimeline, listSuperUsers, updateSuperUser } from '@/features/super-admin/api';
import { normalizeApiError } from '@/api/error';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { useTablePagination } from '@/hooks/useTablePagination';
import type { UserResource } from '@/types/domain';
import { queryKeys } from '@/lib/queryKeys';
import { onMutationApiError, toastApiError } from '@/lib/mutationFeedback';

const blankForm = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  password: '',
  account_type: 'admin',
  status: 'active',
  roles: '',
};

type ViewMode = 'create' | 'edit' | 'view' | null;

type SuperUserFormFieldErrors = Partial<Record<'first_name' | 'last_name' | 'email' | 'phone' | 'password' | 'roles', string>>;

function UserForm({
  mode,
  form,
  setForm,
  fieldErrors,
  clearFieldError,
  onSave,
  onActivate,
  onDeactivate,
  isSaving,
  isActivating,
  isDeactivating,
  canManageState,
}: {
  mode: 'create' | 'edit';
  form: typeof blankForm;
  setForm: Dispatch<SetStateAction<typeof blankForm>>;
  fieldErrors: SuperUserFormFieldErrors;
  clearFieldError: (field: keyof SuperUserFormFieldErrors) => void;
  onSave: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
  isSaving: boolean;
  isActivating: boolean;
  isDeactivating: boolean;
  canManageState: boolean;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="First name" requiredIndicator value={form.first_name} error={fieldErrors.first_name} onChange={(event) => { clearFieldError('first_name'); setForm((current) => ({ ...current, first_name: event.target.value })); }} />
        <FormField label="Last name" requiredIndicator value={form.last_name} error={fieldErrors.last_name} onChange={(event) => { clearFieldError('last_name'); setForm((current) => ({ ...current, last_name: event.target.value })); }} />
        <FormField label="Email" requiredIndicator type="email" value={form.email} error={fieldErrors.email} onChange={(event) => { clearFieldError('email'); setForm((current) => ({ ...current, email: event.target.value })); }} />
        <FormField label="Phone" value={form.phone} error={fieldErrors.phone} onChange={(event) => { clearFieldError('phone'); setForm((current) => ({ ...current, phone: event.target.value })); }} helperText="Optional. Must be unique across accounts when provided." />
        <FormField label={mode === 'create' ? 'Password' : 'New password (optional)'} requiredIndicator={mode === 'create'} type="password" value={form.password} error={fieldErrors.password} onChange={(event) => { clearFieldError('password'); setForm((current) => ({ ...current, password: event.target.value })); }} />
        <FormField label="Roles (comma separated)" requiredIndicator value={form.roles} error={fieldErrors.roles} onChange={(event) => { clearFieldError('roles'); setForm((current) => ({ ...current, roles: event.target.value })); }} helperText="Example: admin, report_viewer" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-[15px] font-semibold text-[#2B2B2D] dark:text-slate-100">Account type<span className="ml-1 text-red-600 dark:text-red-400">*</span></span>
          <select value={form.account_type} onChange={(event) => setForm((current) => ({ ...current, account_type: event.target.value }))} className="h-11 w-full rounded-xl border border-slate-300 bg-white dark:bg-slate-950 px-3 text-sm">
            {['member', 'association_officer', 'institution_user', 'admin', 'super_admin'].map((value) => <option key={value} value={value}>{formatDisplayLabel(value)}</option>)}
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-[15px] font-semibold text-[#2B2B2D] dark:text-slate-100">Status<span className="ml-1 text-red-600 dark:text-red-400">*</span></span>
          <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} className="h-11 w-full rounded-xl border border-slate-300 bg-white dark:bg-slate-950 px-3 text-sm">
            {['active', 'inactive', 'suspended'].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <Button onClick={onSave} disabled={isSaving}>{mode === 'create' ? 'Create user' : 'Save changes'}</Button>
        {canManageState ? <Button variant="outline" onClick={onActivate} disabled={isActivating}>Activate</Button> : null}
        {canManageState ? <Button variant="destructive" onClick={onDeactivate} disabled={isDeactivating}>Deactivate</Button> : null}
      </div>
    </div>
  );
}

export function SuperUsersPage() {
  const queryClient = useQueryClient();
  const { page, setPage, perPage, setPerPage } = useTablePagination();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [modalMode, setModalMode] = useState<ViewMode>(null);
  const [form, setForm] = useState(blankForm);
  const [userFormErrors, setUserFormErrors] = useState<SuperUserFormFieldErrors>({});
  const [actionMode, setActionMode] = useState<'activate' | 'deactivate' | null>(null);

  const clearUserFormFieldError = (field: keyof SuperUserFormFieldErrors) => {
    setUserFormErrors((current) => ({ ...current, [field]: undefined }));
  };

  const listQuery = usePaginatedList({ queryKey: [...queryKeys.superUsers, page, perPage, search, status], queryFn: listSuperUsers, params: { page, per_page: perPage, search: search || undefined, status: status || undefined } });
  const detailQuery = useQuery({ queryKey: queryKeys.superUser(selectedId), queryFn: async () => getSuperUser(selectedId as number), enabled: Boolean(selectedId) && modalMode !== null });
  const timelineQuery = useQuery({ queryKey: queryKeys.superUserTimeline(selectedId), queryFn: async () => listSuperTimeline('user', selectedId as number, { page: 1, per_page: 8 }), enabled: Boolean(selectedId) && modalMode === 'view' });

  useEffect(() => {
    const user = detailQuery.data?.data;
    if (!user || modalMode !== 'edit') return;
    setForm({
      first_name: user.name.split(' ')[0] ?? '',
      last_name: user.name.split(' ').slice(1).join(' '),
      email: user.email,
      phone: user.phone ?? '',
      password: '',
      account_type: user.account_type ?? 'admin',
      status: user.status ?? 'active',
      roles: user.roles.join(', '),
    });
  }, [detailQuery.data, modalMode]);

  const selectedUser = useMemo(
    () => listQuery.data?.data.find((row) => row.id === selectedId) ?? detailQuery.data?.data ?? null,
    [detailQuery.data, listQuery.data, selectedId],
  );

  function openCreateModal() {
    setSelectedId(null);
    setModalMode('create');
    setForm(blankForm);
    setUserFormErrors({});
  }

  function openViewModal(id: number) {
    setSelectedId(id);
    setModalMode('view');
    setUserFormErrors({});
  }

  function openEditModal(id: number) {
    setSelectedId(id);
    setModalMode('edit');
    setUserFormErrors({});
  }

  function closeModal() {
    setModalMode(null);
    setUserFormErrors({});
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        first_name: form.first_name,
        last_name: form.last_name || undefined,
        email: form.email,
        phone: form.phone || undefined,
        password: form.password || undefined,
        account_type: form.account_type as 'member' | 'association_officer' | 'institution_user' | 'admin' | 'super_admin',
        status: form.status as 'active' | 'inactive' | 'suspended',
        roles: form.roles.split(',').map((value) => value.trim()).filter(Boolean),
      };
      return modalMode === 'create' ? createSuperUser({ ...payload, password: form.password || 'ChangeMe123!' }) : updateSuperUser(selectedId as number, payload);
    },
    onSuccess: (response) => {
      setUserFormErrors({});
      toast.success(response.message);
      queryClient.invalidateQueries({ queryKey: queryKeys.superUsers });
      if ('id' in response.data) setSelectedId(response.data.id);
      closeModal();
    },
    onError: (error) => {
      const api = normalizeApiError(error);
      const next: SuperUserFormFieldErrors = {};
      for (const key of ['first_name', 'last_name', 'email', 'phone', 'password', 'roles'] as const) {
        const raw = api.errors?.[key];
        const msg = Array.isArray(raw) ? raw[0] : typeof raw === 'string' ? raw : undefined;
        if (typeof msg === 'string' && msg.trim()) {
          next[key] = msg.trim();
        }
      }
      setUserFormErrors(next);
      toastApiError(error);
    },
  });

  const activateMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason?: string }) => activateSuperUser(id, reason),
    onSuccess: (response) => {
      toast.success(response.message);
      queryClient.invalidateQueries({ queryKey: queryKeys.superUsers });
      queryClient.invalidateQueries({ queryKey: queryKeys.superUser(selectedId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.superUserTimeline(selectedId) });
      setActionMode(null);
      closeModal();
    },
    onError: onMutationApiError(),
  });

  const deactivateMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason?: string }) => deactivateSuperUser(id, reason),
    onSuccess: (response) => {
      toast.success(response.message);
      queryClient.invalidateQueries({ queryKey: queryKeys.superUsers });
      queryClient.invalidateQueries({ queryKey: queryKeys.superUser(selectedId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.superUserTimeline(selectedId) });
      setActionMode(null);
      closeModal();
    },
    onError: onMutationApiError(),
  });

  const userForView = detailQuery.data?.data ?? selectedUser;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="User management"
        description="Platform user accounts."
        action={<Button onClick={openCreateModal}>New user</Button>}
      />
      <SearchFilterBar search={search} onSearchChange={(value) => { setSearch(value); setPage(1); }} status={status} onStatusChange={(value) => { setStatus(value); setPage(1); }} searchPlaceholder="Search by name, email, or phone" onReset={() => { setSearch(''); setStatus(''); setPage(1); }} />

      <div className="space-y-4">
        <DataTable
          columns={[
            { key: 'name', header: 'Name', render: (row: UserResource) => row.name },
            { key: 'email', header: 'Email', render: (row: UserResource) => row.email },
            { key: 'role', header: 'Primary role', render: (row: UserResource) => row.primary_role ?? '—' },
            { key: 'status', header: 'Status', render: (row: UserResource) => <StatusBadge value={row.status} /> },
            {
              key: 'actions',
              header: '',
              render: (row: UserResource) => (
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
        title={modalMode === 'create' ? 'Create user' : modalMode === 'edit' ? 'Edit user' : 'User details'}
        subtitle={modalMode === 'view' ? 'Review account details and recent state changes in one modal.' : 'User creation and editing happen in a modal instead of beside the list.'}
        size={modalMode === 'view' ? 'lg' : 'md'}
      >
        {modalMode === 'view' ? (
          detailQuery.isLoading ? <Alert title="Loading user" description="Please wait…preparing selected resource." /> : userForView ? (
            <div className="space-y-6">
              <DetailGrid
                items={[
                  { label: 'Name', value: userForView.name },
                  { label: 'Email', value: userForView.email },
                  { label: 'Phone', value: userForView.phone ?? '—' },
                  { label: 'Primary role', value: userForView.primary_role ?? '—' },
                  { label: 'Roles', value: userForView.roles.join(', ') || '—' },
                  { label: 'Account type', value: userForView.account_type ?? '—' },
                  { label: 'Status', value: <StatusBadge value={userForView.status} /> },
                  { label: '2FA required', value: userForView.requires_two_factor ? 'Yes' : 'No' },
                ]}
              />
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => { setUserFormErrors({}); setModalMode('edit'); }}>Edit user</Button>
                {userForView.status === 'active' ? <Button variant="destructive" onClick={() => setActionMode('deactivate')}>Deactivate</Button> : <Button variant="outline" onClick={() => setActionMode('activate')}>Activate</Button>}
              </div>
              <ActivityTimeline items={timelineQuery.data?.data} isLoading={timelineQuery.isLoading} emptyTitle="No user activity yet" />
            </div>
          ) : <Alert title="No user selected" description="Choose a user from the table to continue." />
        ) : (
          <UserForm
            mode={modalMode === 'create' ? 'create' : 'edit'}
            form={form}
            setForm={setForm}
            fieldErrors={userFormErrors}
            clearFieldError={clearUserFormFieldError}
            onSave={() => saveMutation.mutate()}
            onActivate={() => setActionMode('activate')}
            onDeactivate={() => setActionMode('deactivate')}
            isSaving={saveMutation.isPending}
            isActivating={activateMutation.isPending}
            isDeactivating={deactivateMutation.isPending}
            canManageState={modalMode === 'edit' && Boolean(selectedId)}
          />
        )}
      </Modal>

      <ActionDialog
        open={actionMode === 'activate'}
        onClose={() => setActionMode(null)}
        title="Activate user"
        description="Restore access for this user account. You may include an optional reason for the audit trail."
        actionLabel="Activate user"
        actionVariant="outline"
        showReason
        onConfirm={(reason) => { if (selectedId) activateMutation.mutate({ id: selectedId, reason }); }}
        isSubmitting={activateMutation.isPending}
      />

      <ActionDialog
        open={actionMode === 'deactivate'}
        onClose={() => setActionMode(null)}
        title="Deactivate user"
        description="Deactivate this account and record an optional reason in the audit trail."
        actionLabel="Deactivate user"
        actionVariant="destructive"
        showReason
        onConfirm={(reason) => { if (selectedId) deactivateMutation.mutate({ id: selectedId, reason }); }}
        isSubmitting={deactivateMutation.isPending}
      />
    </div>
  );
}
