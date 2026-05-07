/**
 * WIPO Connect outbox panel for admin entity modals (Pass F: not mounted from admin pages by default).
 * Re-import from licensing / works / membership pages if outbox UI is product-ready again.
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/shared/DataTable';
import { DetailPanelState } from '@/components/shared/DetailPanelState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { neutralActionButtonClass } from '@/components/shared/tableActionStyles';
import {
  enqueueAdminInstitutionWipoOutbox,
  enqueueAdminLicenceWipoOutbox,
  enqueueAdminMemberWipoOutbox,
  enqueueAdminWorkWipoOutbox,
  listAdminInstitutionWipoOutbox,
  listAdminLicenceWipoOutbox,
  listAdminMemberWipoOutbox,
  listAdminWorkWipoOutbox,
} from '@/features/admin/api';
import { confirmAdminSensitiveAction } from '@/features/admin/security';
import { showAdminActionError, showAdminActionSuccess } from '@/features/admin/action-feedback';
import type { IntegrationOutboxEntryResource } from '@/types/domain';
import { formatDate } from '@/utils/format';
import { queryKeys } from '@/lib/queryKeys';

export type AdminWipoOutboxSubject = 'work' | 'institution' | 'member' | 'licence';

const copy: Record<AdminWipoOutboxSubject, { queueDescription: string; hint: string }> = {
  work: {
    queueDescription: 'This enqueues an outbound WIPO Connect job for this work. Confirm only if the integration is configured and you intend to sync.',
    hint: 'Recent queue rows for this work. Super admins can open the full integrations outbox from the governance menu.',
  },
  institution: {
    queueDescription: 'This enqueues an outbound WIPO Connect job for this institution. Confirm only if the integration is configured and you intend to sync.',
    hint: 'Recent WIPO Connect rows for this institution.',
  },
  member: {
    queueDescription: 'This enqueues an outbound WIPO Connect job for this member. Confirm only if the integration is configured and you intend to sync.',
    hint: 'Recent WIPO Connect rows for this member.',
  },
  licence: {
    queueDescription: 'This enqueues an outbound WIPO Connect job for this licence. Confirm only if the integration is configured and you intend to sync.',
    hint: 'Recent WIPO Connect rows for this licence.',
  },
};

function listOutbox(subject: AdminWipoOutboxSubject, subjectId: number, params: { per_page?: number }) {
  switch (subject) {
    case 'work':
      return listAdminWorkWipoOutbox(subjectId, params);
    case 'institution':
      return listAdminInstitutionWipoOutbox(subjectId, params);
    case 'member':
      return listAdminMemberWipoOutbox(subjectId, params);
    case 'licence':
      return listAdminLicenceWipoOutbox(subjectId, params);
    default:
      throw new Error('Unknown WIPO outbox subject');
  }
}

function enqueueOutbox(subject: AdminWipoOutboxSubject, subjectId: number) {
  switch (subject) {
    case 'work':
      return enqueueAdminWorkWipoOutbox(subjectId, {});
    case 'institution':
      return enqueueAdminInstitutionWipoOutbox(subjectId, {});
    case 'member':
      return enqueueAdminMemberWipoOutbox(subjectId, {});
    case 'licence':
      return enqueueAdminLicenceWipoOutbox(subjectId, {});
    default:
      throw new Error('Unknown WIPO outbox subject');
  }
}

type Props = {
  subject: AdminWipoOutboxSubject;
  subjectId: number;
  enabled: boolean;
};

export function AdminWipoConnectOutboxSection({ subject, subjectId, enabled }: Props) {
  const text = copy[subject];

  const wipoOutboxQuery = useQuery({
    queryKey: queryKeys.adminWipoOutbox(subject, subjectId),
    queryFn: async () => listOutbox(subject, subjectId, { per_page: 8 }),
    enabled: enabled && subjectId > 0,
  });

  const enqueueWipoMutation = useMutation({
    mutationFn: async () => {
      const confirmed = await confirmAdminSensitiveAction({
        title: 'Queue WIPO Connect sync',
        description: text.queueDescription,
        confirmLabel: 'Queue sync',
      });
      if (!confirmed) throw new Error('Security confirmation cancelled.');
      return enqueueOutbox(subject, subjectId);
    },
    onSuccess: async (response) => {
      showAdminActionSuccess('WIPO Connect job queued.', response.message);
      await wipoOutboxQuery.refetch();
    },
    onError: (error) => showAdminActionError(error, 'The WIPO Connect job could not be queued. Check integration settings and try again.'),
  });

  return (
    <Card className="space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-base font-semibold text-[#101828] dark:text-slate-100">WIPO Connect outbox</h4>
          <p className="mt-1 text-sm text-[#667085] dark:text-slate-400">{text.hint}</p>
        </div>
        <Button size="sm" variant="outline" className={neutralActionButtonClass} onClick={() => enqueueWipoMutation.mutate()} disabled={enqueueWipoMutation.isPending}>
          {enqueueWipoMutation.isPending ? 'Queueing…' : 'Queue WIPO sync'}
        </Button>
      </div>
      {wipoOutboxQuery.isLoading ? <DetailPanelState mode="loading" title="Loading outbox" description="Fetching WIPO Connect rows." /> : null}
      {!wipoOutboxQuery.isLoading && (wipoOutboxQuery.data?.data?.length ?? 0) === 0 ? (
        <p className="text-sm text-[#667085] dark:text-slate-400">No WIPO Connect outbox entries yet for this record.</p>
      ) : null}
      {!wipoOutboxQuery.isLoading && (wipoOutboxQuery.data?.data?.length ?? 0) > 0 ? (
        <DataTable
          columns={[
            { key: 'status', header: 'Status', render: (row: IntegrationOutboxEntryResource) => <StatusBadge value={row.status} label={row.status} /> },
            { key: 'operation', header: 'Operation', render: (row: IntegrationOutboxEntryResource) => row.operation },
            { key: 'attempts', header: 'Attempts', render: (row: IntegrationOutboxEntryResource) => row.attempts },
            { key: 'created_at', header: 'Queued', render: (row: IntegrationOutboxEntryResource) => formatDate(row.created_at) },
            { key: 'last_error', header: 'Last error', className: 'max-w-[200px] truncate', render: (row: IntegrationOutboxEntryResource) => row.last_error ?? '—' },
          ]}
          rows={wipoOutboxQuery.data?.data ?? []}
          emptyTitle="No rows"
        />
      ) : null}
    </Card>
  );
}
