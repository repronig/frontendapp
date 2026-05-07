import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import { ModalFormActions, ModalFormScrollBody, ModalFormSection } from '@/components/shared/ModalForm';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { listSuperPermissions, listSuperRoles, syncSuperRolePermissions } from '@/features/super-admin/api';
import { onMutationApiError } from '@/lib/mutationFeedback';
import type { PermissionResource, RoleResource } from '@/types/domain';
import { queryKeys } from '@/lib/queryKeys';

function formatRoleLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function SuperRolesPage() {
  const queryClient = useQueryClient();
  const [selectedRoleName, setSelectedRoleName] = useState<string | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  const rolesQuery = useQuery({ queryKey: queryKeys.superRoles, queryFn: async () => (await listSuperRoles()).data });
  const permissionsQuery = useQuery({ queryKey: queryKeys.superPermissions, queryFn: async () => (await listSuperPermissions()).data });

  useEffect(() => {
    const first = rolesQuery.data?.[0];
    if (!selectedRoleName && first) {
      setSelectedRoleName(first.name);
      setSelectedPermissions(first.permissions?.map((permission) => permission.name) ?? []);
    }
  }, [rolesQuery.data, selectedRoleName]);

  const selectedRole = rolesQuery.data?.find((role) => role.name === selectedRoleName) ?? null;

  useEffect(() => {
    if (selectedRole) {
      setSelectedPermissions(selectedRole.permissions?.map((permission) => permission.name) ?? []);
    }
  }, [selectedRole]);

  const syncMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRoleName) throw new Error('Select a role first.');
      return syncSuperRolePermissions(selectedRoleName, selectedPermissions);
    },
    onSuccess: (response) => {
      toast.success(response.message);
      queryClient.invalidateQueries({ queryKey: queryKeys.superRoles });
    },
    onError: onMutationApiError(),
  });

  function openRole(role: RoleResource) {
    setSelectedRoleName(role.name);
    setSelectedPermissions(role.permissions?.map((permission) => permission.name) ?? []);
    setModalOpen(true);
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Roles and permissions" description="Roles and their permissions." />
      <DataTable
        columns={[
          { key: 'name', header: 'Role', render: (row: RoleResource) => formatRoleLabel(row.name) },
          { key: 'count', header: 'Permissions', render: (row: RoleResource) => row.permissions?.length ?? 0 },
        ]}
        rows={rolesQuery.data ?? []}
        isLoading={rolesQuery.isLoading}
        exportTitle="Roles and permissions"
        onRowClick={openRole}
        getRowKey={(row) => row.id}
        selectedRowKey={selectedRole?.id}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedRole ? formatRoleLabel(selectedRole.name) : 'Role details'}
        subtitle="Review the selected role and adjust its permission set in a focused modal instead of a side-by-side panel."
        size="lg"
      >
        {selectedRole ? (
          <>
            <ModalFormScrollBody>
              <ModalFormSection badge="1" title={formatRoleLabel(selectedRole.name)} description="Toggle backend permissions for this role, then save to sync with the server.">
                <div className="grid gap-3 md:grid-cols-2">
                  {(permissionsQuery.data ?? []).map((permission: PermissionResource) => {
                    const checked = selectedPermissions.includes(permission.name);
                    return (
                      <label key={permission.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200/90 bg-white p-3 text-sm text-slate-700 shadow-sm transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:border-slate-600">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300"
                          checked={checked}
                          onChange={(event) => {
                            setSelectedPermissions((current) =>
                              event.target.checked ? [...current, permission.name] : current.filter((item) => item !== permission.name),
                            );
                          }}
                        />
                        {permission.name}
                      </label>
                    );
                  })}
                </div>
              </ModalFormSection>
            </ModalFormScrollBody>
            <ModalFormActions>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Close</Button>
              <Button type="button" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>{syncMutation.isPending ? 'Saving…' : 'Save permission sync'}</Button>
            </ModalFormActions>
          </>
        ) : (
          <Alert title="Select a role" description="Choose a role from the table to review and synchronize its permission set." />
        )}
      </Modal>
    </div>
  );
}
