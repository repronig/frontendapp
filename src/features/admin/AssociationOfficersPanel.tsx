import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/shared/FormField';
import { Modal } from '@/components/shared/Modal';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { editActionButtonClass } from '@/components/shared/tableActionStyles';
import { listAdminAssociationOfficers, updateAdminAssociationOfficer } from '@/features/admin/api';
import { confirmAdminSensitiveAction } from '@/features/admin/security';
import { showAdminActionError, showAdminActionSuccess } from '@/features/admin/action-feedback';
import { queryKeys } from '@/lib/queryKeys';
import type { UserResource } from '@/types/domain';

type AssociationOfficersPanelProps = {
  associationId: number;
};

const blankCredentialsForm = {
  email: '',
  password: '',
};

export function AssociationOfficersPanel({ associationId }: AssociationOfficersPanelProps) {
  const queryClient = useQueryClient();
  const [editingOfficer, setEditingOfficer] = useState<UserResource | null>(null);
  const [form, setForm] = useState(blankCredentialsForm);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const officersQuery = useQuery({
    queryKey: queryKeys.adminAssociationOfficers(associationId),
    queryFn: async () => listAdminAssociationOfficers(associationId),
    enabled: associationId > 0,
  });

  const officers = officersQuery.data?.data ?? [];

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingOfficer) {
        throw new Error('No officer selected.');
      }

      const confirmed = await confirmAdminSensitiveAction({
        title: 'Confirm credential update',
        description: 'Updating login credentials for an association officer requires your admin security confirmation.',
        confirmLabel: 'Update credentials',
      });

      if (!confirmed) {
        throw new Error('Security confirmation cancelled.');
      }

      const payload: { email?: string; password?: string } = {};

      if (form.email.trim() !== '' && form.email.trim() !== editingOfficer.email) {
        payload.email = form.email.trim();
      }

      if (form.password.trim() !== '') {
        payload.password = form.password;
      }

      if (!payload.email && !payload.password) {
        throw new Error('Change the email or enter a new password before saving.');
      }

      return updateAdminAssociationOfficer(associationId, editingOfficer.id, payload);
    },
    onSuccess: async (response) => {
      showAdminActionSuccess(response.message || 'Association officer credentials updated.');
      setEditingOfficer(null);
      setForm(blankCredentialsForm);
      setFieldErrors({});
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminAssociationOfficers(associationId) });
    },
    onError: (error) => showAdminActionError(error, 'Could not update association officer credentials.'),
  });

  function openEditModal(officer: UserResource) {
    setEditingOfficer(officer);
    setForm({ email: officer.email, password: '' });
    setFieldErrors({});
  }

  function closeEditModal() {
    setEditingOfficer(null);
    setForm(blankCredentialsForm);
    setFieldErrors({});
  }

  return (
    <>
      {officersQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading association officers…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border dark:border-slate-800">
          <table className="min-w-full divide-y divide-border text-sm dark:divide-slate-800">
            <thead>
              <tr className="bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground dark:bg-slate-900/80">
                <th className="px-3 py-2">Officer</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Phone</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border dark:divide-slate-800">
              {officers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                    No association officers linked to this association.
                  </td>
                </tr>
              ) : (
                officers.map((officer) => (
                  <tr key={officer.id} className="bg-card dark:bg-slate-950/40">
                    <td className="px-3 py-2 font-medium">{officer.name}</td>
                    <td className="px-3 py-2">{officer.email}</td>
                    <td className="px-3 py-2 text-muted-foreground">{officer.phone ?? '—'}</td>
                    <td className="px-3 py-2">
                      <StatusBadge value={officer.status ?? 'unknown'} />
                    </td>
                    <td className="px-3 py-2">
                      <Button type="button" size="sm" variant="outline" className={editActionButtonClass} onClick={() => openEditModal(officer)}>
                        Update login
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={Boolean(editingOfficer)}
        onClose={closeEditModal}
        title="Update association officer login"
        subtitle="Change the officer email and/or set a new password."
        size="md"
      >
        <div className="space-y-4">
          <FormField
            label="Email"
            requiredIndicator
            type="email"
            value={form.email}
            error={fieldErrors.email}
            onChange={(event) => {
              setFieldErrors((current) => ({ ...current, email: undefined }));
              setForm((current) => ({ ...current, email: event.target.value }));
            }}
          />
          <FormField
            label="New password"
            type="password"
            value={form.password}
            error={fieldErrors.password}
            helperText="Leave blank to keep the current password. Minimum 8 characters when set."
            onChange={(event) => {
              setFieldErrors((current) => ({ ...current, password: undefined }));
              setForm((current) => ({ ...current, password: event.target.value }));
            }}
          />
          <div className="flex flex-wrap gap-3 pt-2">
            <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving…' : 'Save credentials'}
            </Button>
            <Button type="button" variant="outline" onClick={closeEditModal} disabled={updateMutation.isPending}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
