import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { User } from 'lucide-react';
import {
  approveAssociationApplication,
  getAssociationApplication,
  listAssociationApplications,
  rejectAssociationApplication,
  requestChangesAssociationApplication,
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
  requestChangesAssociationApplicationSchema,
  type ApproveAssociationApplicationFormValues,
  type RejectAssociationApplicationFormValues,
  type RequestChangesAssociationApplicationFormValues,
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
  const requestChangesForm = useForm<RequestChangesAssociationApplicationFormValues>({
    resolver: zodResolver(requestChangesAssociationApplicationSchema),
    defaultValues: { comment: '' },
  });

  function handleSuccess(message: string) {
    toast.success(message);
    queryClient.invalidateQueries({ queryKey: queryKeys.associationApplications });
    queryClient.invalidateQueries({ queryKey: queryKeys.associationApplication(selectedId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.currentUser });
    approveForm.reset({ comment: '' });
    rejectForm.reset({ reason: '' });
    requestChangesForm.reset({ comment: '' });
  }

  const approveMutation = useMutation({
    mutationFn: async (values: ApproveAssociationApplicationFormValues) => {
      if (!application) throw new Error('Select an application first.');
      return approveAssociationApplication(application.id, values.comment || undefined);
    },
    onSuccess: (response) => handleSuccess(response.message),
    onError: onMutationApiError(),
  });

  const rejectMutation = useMutation({
    mutationFn: async (values: RejectAssociationApplicationFormValues) => {
      if (!application) throw new Error('Select an application first.');
      return rejectAssociationApplication(application.id, values.reason);
    },
    onSuccess: (response) => handleSuccess(response.message),
    onError: onMutationApiError(),
  });

  const requestChangesMutation = useMutation({
    mutationFn: async (values: RequestChangesAssociationApplicationFormValues) => {
      if (!application) throw new Error('Select an application first.');
      return requestChangesAssociationApplication(application.id, values.comment);
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
              <SectionHeader title="Review actions" description="Decision and notes." />
              {!canReview ? (
                <Alert title="Review actions unavailable" description="This application is not in a reviewable state right now. You can still inspect the details above." />
              ) : null}

              <ModalFormSection badge="1" title="Approve application" description="Accept the application. You may add an optional comment for the applicant.">
                <form className="space-y-4" onSubmit={approveForm.handleSubmit((values) => approveMutation.mutate(values))}>
                  <FormTextareaField label="Optional comment" error={approveForm.formState.errors.comment?.message} disabled={!canReview} {...approveForm.register('comment')} />
                  <Button type="submit" className={approvalActionButtonClass} disabled={!canReview || approveMutation.isPending}>{approveMutation.isPending ? 'Approving...' : 'Approve application'}</Button>
                </form>
              </ModalFormSection>

              <ModalFormSection badge="2" title="Request changes" description="Send the application back for edits with guidance in the comment.">
                <form className="space-y-4" onSubmit={requestChangesForm.handleSubmit((values) => requestChangesMutation.mutate(values))}>
                  <FormTextareaField label="Comment" error={requestChangesForm.formState.errors.comment?.message} disabled={!canReview} {...requestChangesForm.register('comment')} />
                  <Button type="submit" variant="outline" disabled={!canReview || requestChangesMutation.isPending}>{requestChangesMutation.isPending ? 'Sending...' : 'Request changes'}</Button>
                </form>
              </ModalFormSection>

              <ModalFormSection badge="3" title="Reject application" description="Stop the application with a clear reason the applicant can see.">
                <form
                  className="space-y-4"
                  onSubmit={rejectForm.handleSubmit((values) => {
                    const confirmed = window.confirm('Are you sure you want to reject this application? This action cannot be undone.');
                    if (!confirmed) return;
                    rejectMutation.mutate(values);
                  })}
                >
                  <Alert
                    title="Warning: this action is irreversible"
                    description='Rejecting this application cannot be undone. If the member only needs to correct details or upload missing information, use "Request changes" instead.'
                  />
                  <FormTextareaField label="Reason" error={rejectForm.formState.errors.reason?.message} disabled={!canReview} {...rejectForm.register('reason')} />
                  <Button type="submit" variant="destructive" disabled={!canReview || rejectMutation.isPending}>{rejectMutation.isPending ? 'Rejecting...' : 'Reject application'}</Button>
                </form>
              </ModalFormSection>
            </div>
          </AssociationApplicationDetail>
        ) : null}
      </Modal>
    </>
  );
}
