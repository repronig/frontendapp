import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { User } from 'lucide-react';
import {
  validateAssociationAffiliation,
  getAssociationApplication,
  listAssociationApplications,
  rejectAssociationAffiliation,
} from '@/features/association/api';
import { normalizeApiError } from '@/api/error';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { useTablePagination } from '@/hooks/useTablePagination';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { FormTextareaField } from '@/components/shared/FormTextareaField';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { approvalActionButtonClass, viewActionButtonClass } from '@/components/shared/tableActionStyles';
import { SearchFilterBar } from '@/components/shared/SearchFilterBar';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import { ModalFormSection } from '@/components/shared/ModalForm';
import { PaginationBar } from '@/components/shared/PaginationBar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import type { MemberApplicationResource } from '@/types/domain';
import { formatDate } from '@/utils/format';
import { resolveFileUrl } from '@/utils/fileUrl';
import {
  approveAssociationApplicationSchema,
  rejectAssociationApplicationSchema,
  type ApproveAssociationApplicationFormValues,
  type RejectAssociationApplicationFormValues,
} from '@/features/association-review/schemas';
import { AssociationApplicationDetail } from '@/features/association-review/AssociationApplicationDetail';
import { queryKeys } from '@/lib/queryKeys';
import { onMutationApiError } from '@/lib/mutationFeedback';

const reviewableStatuses = new Set(['submitted']);

function ApplicantIdentityCell({ application }: { application: MemberApplicationResource }) {
  const user = application.user;
  const avatarUrl = resolveFileUrl(user?.avatar_medium_url ?? user?.avatar_url ?? user?.avatar_thumb_url ?? null);
  const displayName = user?.name ?? 'Applicant';
  const displayMeta = user?.email ?? application.applicant_type_label ?? application.applicant_type.replace(/_/g, ' ');

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#EAECF0] bg-[#F8FAFC] text-[#64748B] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        {avatarUrl ? <img src={avatarUrl} alt={displayName + ' avatar'} className="h-full w-full object-cover" /> : <User className="h-5 w-5" />}
      </div>
      <div>
        <p className="font-semibold text-slate-900 dark:text-slate-50">{displayName}</p>
        <p className="text-xs text-slate-500 dark:text-slate-300">{displayMeta}</p>
      </div>
    </div>
  );
}

const statusOptions = [
  { label: 'Submitted', value: 'submitted' },
  { label: 'Changes requested', value: 'changes_requested' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Draft', value: 'draft' },
];

export function AssociationApplicationsPage() {
  const queryClient = useQueryClient();
  const { page, setPage, perPage, setPerPage } = useTablePagination();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('submitted');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const listQuery = usePaginatedList({
    queryKey: [...queryKeys.associationApplications, page, perPage, search, status],
    queryFn: listAssociationApplications,
    params: { page, per_page: perPage, search: search || undefined, status: status || undefined },
  });

  const detailQuery = useQuery({
    queryKey: queryKeys.associationApplication(selectedId),
    queryFn: async () => {
      if (!selectedId) throw new Error('Missing application id.');
      return getAssociationApplication(selectedId);
    },
    enabled: Boolean(selectedId),
  });

  const application = detailQuery.data?.data ?? null;
  const canReview = Boolean(application && reviewableStatuses.has(application.application_status));

  const approveForm = useForm<ApproveAssociationApplicationFormValues>({
    resolver: zodResolver(approveAssociationApplicationSchema),
    defaultValues: { comment: '' },
  });
  const rejectForm = useForm<RejectAssociationApplicationFormValues>({
    resolver: zodResolver(rejectAssociationApplicationSchema),
    defaultValues: { reason: '' },
  });

  function handleSuccess(message: string) {
    toast.success(message);
    queryClient.invalidateQueries({ queryKey: queryKeys.associationApplications });
    queryClient.invalidateQueries({ queryKey: queryKeys.associationApplication(selectedId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.currentUser });
    approveForm.reset({ comment: '' });
    rejectForm.reset({ reason: '' });
  }

  const approveMutation = useMutation({
    mutationFn: async (values: ApproveAssociationApplicationFormValues) => {
      if (!application) throw new Error('Select an application first.');
      return validateAssociationAffiliation(application.id, values.comment || undefined);
    },
    onSuccess: (response) => handleSuccess(response.message),
    onError: onMutationApiError(),
  });

  const rejectMutation = useMutation({
    mutationFn: async (values: RejectAssociationApplicationFormValues) => {
      if (!application) throw new Error('Select an application first.');
      return rejectAssociationAffiliation(application.id, values.reason);
    },
    onSuccess: (response) => handleSuccess(response.message),
    onError: onMutationApiError(),
  });

  return (
    <>
      <div className="space-y-6">
        <SectionHeader title="Application review" description="Applications for your association." />

        <SearchFilterBar
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          status={status}
          onStatusChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
          statusOptions={statusOptions}
          searchPlaceholder="Search by applicant name, email, or applicant type"
          onReset={() => {
            setSearch('');
            setStatus('submitted');
            setPage(1);
          }}
        />

        <DataTable
          columns={[
            {
              key: 'applicant',
              header: 'Applicant',
              render: (row: MemberApplicationResource) => <ApplicantIdentityCell application={row} />,
            },
            { key: 'type', header: 'Type', render: (row: MemberApplicationResource) => row.applicant_type.replace(/_/g, ' ') },
            { key: 'status', header: 'Status', render: (row: MemberApplicationResource) => <StatusBadge value={row.application_status} /> },
            { key: 'submitted', header: 'Submitted', render: (row: MemberApplicationResource) => formatDate(row.submitted_at) },
            {
              key: 'actions',
              header: 'Actions',
              render: (row: MemberApplicationResource) => (
                <Button size="sm" variant="outline" className={viewActionButtonClass} onClick={() => setSelectedId(row.id)}>
                  View
                </Button>
              ),
            },
          ]}
          rows={listQuery.data?.data ?? []}
          isLoading={listQuery.isLoading}
          exportTitle="Association membership applications"
          emptyTitle="No applications found"
          emptyDescription="Try a different filter or wait for new applications assigned to your association."
        />

        <PaginationBar meta={listQuery.data?.meta} onPageChange={setPage} perPage={perPage} onPerPageChange={setPerPage} />
      </div>

      <Modal
        open={Boolean(selectedId)}
        onClose={() => setSelectedId(null)}
        title="Application details"
        subtitle="Inspect the application and complete review actions from the same centered modal."
        size="lg"
      >
        {detailQuery.isLoading ? <Alert title="Loading application" description="Please wait…preparing selected resource." /> : null}
        {detailQuery.isError ? (
          <div className="space-y-3">
            <Alert title="Unable to load application" description={normalizeApiError(detailQuery.error).message} />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void detailQuery.refetch()}
              disabled={detailQuery.isFetching && !detailQuery.isLoading}
            >
              {detailQuery.isFetching && !detailQuery.isLoading ? 'Retrying…' : 'Try again'}
            </Button>
          </div>
        ) : null}
        {application ? (
          <AssociationApplicationDetail application={application}>
            <div className="space-y-8">
              <SectionHeader title="Affiliation review actions" description="Association validates or rejects affiliation only." />
              {!canReview ? (
                <Alert title="Review actions unavailable" description="This application is not in a reviewable state right now. You can still inspect the details above." />
              ) : null}

              <ModalFormSection badge="1" title="Validate affiliation" description="Confirm this applicant is affiliated with your association.">
                <form className="space-y-4" onSubmit={approveForm.handleSubmit((values) => approveMutation.mutate(values))}>
                  <FormTextareaField label="Optional comment" error={approveForm.formState.errors.comment?.message} disabled={!canReview} {...approveForm.register('comment')} />
                  <Button type="submit" className={approvalActionButtonClass} disabled={!canReview || approveMutation.isPending}>{approveMutation.isPending ? 'Validating...' : 'Validate affiliation'}</Button>
                </form>
              </ModalFormSection>

              <ModalFormSection badge="2" title="Reject affiliation" description="Mark affiliation as rejected. Admin still takes the final application decision.">
                <form
                  className="space-y-4"
                  onSubmit={rejectForm.handleSubmit((values) => {
                    const confirmed = window.confirm('Are you sure you want to reject this affiliation?');
                    if (!confirmed) return;
                    rejectMutation.mutate(values);
                  })}
                >
                  <Alert
                    title="Affiliation outcome only"
                    description='This only records the association affiliation outcome. Admin will still complete the final member application decision.'
                  />
                  <FormTextareaField label="Reason" error={rejectForm.formState.errors.reason?.message} disabled={!canReview} {...rejectForm.register('reason')} />
                  <Button type="submit" variant="destructive" disabled={!canReview || rejectMutation.isPending}>{rejectMutation.isPending ? 'Rejecting...' : 'Reject affiliation'}</Button>
                </form>
              </ModalFormSection>
            </div>
          </AssociationApplicationDetail>
        ) : null}
      </Modal>
    </>
  );
}
