import { useCallback, useState } from 'react';
import { DEFAULT_PAGE_SIZE, normalizeClientPageSize } from '@/constants/pagination';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/shared/DataTable';
import { DetailPanelState } from '@/components/shared/DetailPanelState';
import { DetailGrid } from '@/components/shared/DetailGrid';
import { FileCard } from '@/components/shared/FileCard';
import { WorkListPrimaryCell } from '@/components/shared/WorkListPrimaryCell';
import { FilePreviewLightbox } from '@/components/shared/FilePreviewLightbox';
import { Modal } from '@/components/shared/Modal';
import { PaginationBar } from '@/components/shared/PaginationBar';
import { SearchFilterBar } from '@/components/shared/SearchFilterBar';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { neutralActionButtonClass, warningActionButtonClass } from '@/components/shared/tableActionStyles';
import { StatCard } from '@/components/shared/StatCard';
import { StatusHelperGrid } from '@/components/shared/StatusHelperGrid';
import { FormField } from '@/components/shared/FormField';
import { FormTextareaField } from '@/components/shared/FormTextareaField';
import { disputeAdminContributor, downloadAdminWorksExport, getAdminWork, listAdminWorks, reviewAdminWork, reviewAdminWorkUpdateRequest } from '@/features/admin/api';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { useListUrlState } from '@/hooks/useListUrlState';
import type { WorkContributorResource, WorkFileResource, WorkResource } from '@/types/domain';
import { formatDate, formatFileSize } from '@/utils/format';
import { triggerBlobDownload } from '@/utils/download';
import { confirmAdminSensitiveAction } from '@/features/admin/security';
import { getAdminFieldError, showAdminActionError, showAdminActionSuccess, showAdminExportError, showAdminExportSuccess } from '@/features/admin/action-feedback';
import { queryKeys } from '@/lib/queryKeys';
const statusOptions = [
  { label: 'Draft', value: 'draft' },
  { label: 'Submitted', value: 'submitted' },
  { label: 'Verified', value: 'verified' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Changes requested', value: 'changes_requested' },
  { label: 'Restricted', value: 'restricted' },
  { label: 'Disputed', value: 'disputed' },
];

type ModalView = 'details' | 'review' | 'dispute' | null;

export function AdminWorksPage() {
  const queryClient = useQueryClient();
  const { page, search, status, dateFrom, dateTo, setPage, setSearch, setStatus, setDateFrom, setDateTo, resetFilters } = useListUrlState();
  const [perPage, setPerPageState] = useState(DEFAULT_PAGE_SIZE);
  const setPerPage = useCallback(
    (next: number) => {
      setPerPageState(normalizeClientPageSize(next));
      setPage(1);
    },
    [setPage],
  );
  const effectiveStatus = status || 'submitted';
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [modalView, setModalView] = useState<ModalView>(null);
  const [previewFile, setPreviewFile] = useState<WorkFileResource | null>(null);
  const [coverPreview, setCoverPreview] = useState<{ url: string; title: string } | null>(null);
  const [reviewForm, setReviewForm] = useState({ decision: '', reason_code: '', review_note: '', evidence_requested: false });
  const [disputeForm, setDisputeForm] = useState({ contributor_id: '', reason_code: '', reason: '' });
  const [reviewErrors, setReviewErrors] = useState<{ decision?: string; reason_code?: string; review_note?: string }>({});
  const [disputeErrors, setDisputeErrors] = useState<{ contributor_id?: string; reason_code?: string; reason?: string }>({});
  const [isExporting, setIsExporting] = useState(false);

  const listQuery = usePaginatedList({
    queryKey: [...queryKeys.adminWorks, page, perPage, search, effectiveStatus, dateFrom, dateTo],
    queryFn: listAdminWorks,
    params: { page, per_page: perPage, search: search || undefined, status: effectiveStatus, date_from: dateFrom || undefined, date_to: dateTo || undefined },
  });

  const detailQuery = useQuery({
    queryKey: queryKeys.adminWork(selectedId),
    queryFn: async () => getAdminWork(selectedId as number),
    enabled: Boolean(selectedId),
  });

  const work = detailQuery.data?.data ?? null;

  const reviewMutation = useMutation({
    mutationFn: async () => {
      if (!work) throw new Error('Select a work first.');
      const confirmed = await confirmAdminSensitiveAction({ title: 'Confirm work review decision', description: 'This review decision affects repertoire verification and should be confirmed before submission.', confirmLabel: 'Submit review' });
      if (!confirmed) throw new Error('Security confirmation cancelled.');
      if (!reviewForm.decision) {
        setReviewErrors({ decision: 'Choose a review decision to continue.' });
        throw new Error('Please correct the highlighted fields and try again.');
      }
      return reviewAdminWork(work.id, {
        decision: reviewForm.decision as 'verified' | 'approved' | 'rejected' | 'changes_requested' | 'restricted' | 'disputed',
        reason_code: reviewForm.reason_code || undefined,
        review_note: reviewForm.review_note || undefined,
        evidence_requested: reviewForm.evidence_requested,
      });
    },
    onSuccess: async (response) => {
      showAdminActionSuccess('Work review submitted successfully.', response.message);
      setReviewErrors({});
      await Promise.all([listQuery.refetch(), detailQuery.refetch()]);
      setModalView(null);
    },
    onError: (error) => {
      setReviewErrors((current) => ({
        decision: getAdminFieldError(error, ['decision']) ?? current.decision,
        reason_code: getAdminFieldError(error, ['reason_code']) ?? current.reason_code,
        review_note: getAdminFieldError(error, ['review_note']) ?? current.review_note,
      }));
      showAdminActionError(error, 'The work review could not be saved. Check the decision and review note, then try again.');
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (targetWorkId: number) => {
      const confirmed = await confirmAdminSensitiveAction({
        title: 'Confirm work approval',
        description: 'This will approve a verified work and move it forward in the repertoire workflow.',
        confirmLabel: 'Approve work',
      });
      if (!confirmed) throw new Error('Security confirmation cancelled.');
      return reviewAdminWork(targetWorkId, { decision: 'approved' });
    },
    onSuccess: async (response) => {
      showAdminActionSuccess('Work approved successfully.', response.message);
      await Promise.all([
        listQuery.refetch(),
        detailQuery.refetch(),
        queryClient.invalidateQueries({ queryKey: queryKeys.adminWorkRoot }),
      ]);
    },
    onError: (error) => showAdminActionError(error, 'The verified work could not be approved. Please try again.'),
  });

  const reviewUpdateRequestMutation = useMutation({
    mutationFn: async ({ workId, decision }: { workId: number; decision: 'approved' | 'rejected' }) => {
      const confirmed = await confirmAdminSensitiveAction({
        title: decision === 'approved' ? 'Approve work update request' : 'Reject work update request',
        description: decision === 'approved'
          ? 'Approving this request unlocks the approved work for member edits.'
          : 'Rejecting keeps the work locked and not editable by the member.',
        confirmLabel: decision === 'approved' ? 'Approve request' : 'Reject request',
      });
      if (!confirmed) throw new Error('Security confirmation cancelled.');
      return reviewAdminWorkUpdateRequest(workId, { decision });
    },
    onSuccess: async (response) => {
      showAdminActionSuccess('Work update request reviewed successfully.', response.message);
      await Promise.all([
        listQuery.refetch(),
        detailQuery.refetch(),
        queryClient.invalidateQueries({ queryKey: queryKeys.adminWorkRoot }),
      ]);
    },
    onError: (error) => showAdminActionError(error, 'The work update request could not be reviewed.'),
  });

  function canApproveWork(target?: Pick<WorkResource, 'verification_status' | 'work_status'> | null) {
    return target?.verification_status === 'verified' && target?.work_status !== 'approved';
  }

  const disputeMutation = useMutation({
    mutationFn: async () => {
      if (!work) throw new Error('Select a work first.');
      if (!disputeForm.contributor_id) {
        setDisputeErrors({ contributor_id: 'Choose a contributor to continue.' });
        throw new Error('Please correct the highlighted fields and try again.');
      }
      const confirmed = await confirmAdminSensitiveAction({ title: 'Confirm contributor dispute', description: 'This dispute action changes contributor handling and will be logged in protected admin activity.', confirmLabel: 'Create dispute' });
      if (!confirmed) throw new Error('Security confirmation cancelled.');
      return disputeAdminContributor(work.id, Number(disputeForm.contributor_id), {
        reason_code: disputeForm.reason_code || undefined,
        reason: disputeForm.reason || undefined,
      });
    },
    onSuccess: async (response) => {
      showAdminActionSuccess('Contributor dispute created successfully.', response.message);
      setDisputeErrors({});
      await Promise.all([listQuery.refetch(), detailQuery.refetch()]);
      setModalView(null);
    },
    onError: (error) => {
      setDisputeErrors((current) => ({
        contributor_id: getAdminFieldError(error, ['contributor_id', 'contributor']) ?? current.contributor_id,
        reason_code: getAdminFieldError(error, ['reason_code']) ?? current.reason_code,
        reason: getAdminFieldError(error, ['reason']) ?? current.reason,
      }));
      showAdminActionError(error, 'The contributor dispute could not be saved. Check the contributor and reason, then try again.');
    },
  });

  function openModal(id: number, view: ModalView) {
    setSelectedId(id);
    setModalView(view);
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Repertoire" description="Search, review, export." actions={<Button variant="outline" disabled={isExporting} onClick={async () => { try { setIsExporting(true); const response = await downloadAdminWorksExport({ search: search || undefined, status: effectiveStatus, date_from: dateFrom || undefined, date_to: dateTo || undefined }); triggerBlobDownload(response.blob, response.filename); showAdminExportSuccess('Repertoire'); } catch { showAdminExportError('Repertoire'); } finally { setIsExporting(false); } }}>{isExporting ? 'Exporting…' : 'Export CSV'}</Button>} />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Filtered works" value={listQuery.data?.meta?.total ?? 0} hint={`Status • ${effectiveStatus.replace(/_/g, " ")}`} />
        <StatCard label="Rows on this page" value={listQuery.data?.data?.length ?? 0} hint={search ? "Search narrowed the current page" : "Latest submissions in view"} />
        <StatCard label="Selected detail" value={selectedId ?? "—"} hint={selectedId ? "Detail modal stays aligned with row selection" : "Choose a row to review files and actions"} />
      </div>

      <SearchFilterBar
        search={search}
        onSearchChange={setSearch}
        status={effectiveStatus}
        onStatusChange={setStatus}
        statusOptions={statusOptions}
        searchPlaceholder="Search by title, DOI, publisher, or identifier"
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onReset={resetFilters}
      />

      <DataTable
        columns={[
          {
            key: 'title',
            header: 'Work',
            className: 'min-w-[340px]',
            render: (row: WorkResource) => <WorkListPrimaryCell work={row} onClick={() => openModal(row.id, 'details')} onCoverClick={(url) => setCoverPreview({ url, title: row.title })} />,
          },
          { key: 'type', header: 'Type', render: (row: WorkResource) => row.type_of_work_label ?? row.type_of_work },
          { key: 'work_status', header: 'Work status', render: (row: WorkResource) => <StatusBadge value={row.work_status} label={row.work_status_label} /> },
          { key: 'verification_status', header: 'Verification', render: (row: WorkResource) => <StatusBadge value={row.verification_status} label={row.verification_status_label} /> },
          { key: 'update_request_status', header: 'Update request', render: (row: WorkResource) => row.update_request_status ? <StatusBadge value={row.update_request_status} label={row.update_request_status_label ?? undefined} /> : '—' },
          { key: 'submitted_at', header: 'Submitted', render: (row: WorkResource) => formatDate(row.submitted_at) },
          {
            key: 'actions',
            header: 'Next step',
            className: 'w-[1%] whitespace-nowrap',
            render: (row: WorkResource) => (
              row.update_request_status === 'pending'
                ? <Button size="sm" variant="outline" className={warningActionButtonClass} onClick={(event) => { event.stopPropagation(); openModal(row.id, 'details'); }}>Review update request</Button>
                : canApproveWork(row)
                ? <Button size="sm" className={neutralActionButtonClass} onClick={(event) => { event.stopPropagation(); approveMutation.mutate(row.id); }} disabled={approveMutation.isPending}>Approve</Button>
                : row.verification_status === 'verified'
                  ? <Button size="sm" variant="outline" className={warningActionButtonClass} onClick={(event) => { event.stopPropagation(); openModal(row.id, 'dispute'); }}>Dispute</Button>
                  : <Button size="sm" variant="outline" className={neutralActionButtonClass} onClick={(event) => { event.stopPropagation(); openModal(row.id, 'review'); }}>Review</Button>
            ),
          },
        ]}
        rows={listQuery.data?.data ?? []}
        isLoading={listQuery.isLoading}
        loadingTitle="Loading works"
        loadingDescription="The latest submitted works are being fetched from the backend."
        exportTitle="Admin works"
        emptyTitle="No works match these filters"
        emptyDescription="Clear or widen the current filters, or import and review new submissions to repopulate this list."
        onRowClick={(row) => openModal(row.id, 'details')}
        selectedRowKey={selectedId ?? undefined}
        getRowKey={(row) => row.id}
      />

      <PaginationBar meta={listQuery.data?.meta} onPageChange={setPage} perPage={perPage} onPerPageChange={setPerPage} />

      <Modal
        open={modalView !== null}
        onClose={() => setModalView(null)}
        title={modalView === 'review' ? 'Review work' : modalView === 'dispute' ? 'Dispute contributor' : 'Work details'}
        subtitle={modalView === 'details' ? 'Review the selected work, its contributors, and submitted files.' : modalView === 'review' ? 'Confirm the review outcome and capture only the note that matters.' : 'Flag the affected contributor and record a short reason.'}
        size="lg"
      >
        {detailQuery.isLoading ? <DetailPanelState mode="loading" title="Loading work" description="Please wait…preparing selected resource." /> : null}
        {!detailQuery.isLoading && !work ? <DetailPanelState mode="empty" title="No work selected" description="Choose a work from the table to review its details, files, and next action." /> : null}
        {work && modalView === 'details' ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-[#EAECF0] dark:border-slate-800 bg-[#FCFCFD] p-5">
              <div>
                <h3 className="text-xl font-semibold text-[#101828]">{work.title}</h3>
                <p className="mt-1 text-sm text-[#667085] dark:text-slate-300">{work.reference_number ?? work.identifier_value ?? 'No reference number'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {canApproveWork(work) ? <Button size="sm" onClick={() => approveMutation.mutate(work.id)} disabled={approveMutation.isPending}>{approveMutation.isPending ? 'Approving…' : 'Approve work'}</Button> : null}
                {work.update_request_status === 'pending' ? (
                  <>
                    <Button size="sm" variant="outline" onClick={() => reviewUpdateRequestMutation.mutate({ workId: work.id, decision: 'approved' })} disabled={reviewUpdateRequestMutation.isPending}>
                      {reviewUpdateRequestMutation.isPending ? 'Working…' : 'Approve update request'}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => reviewUpdateRequestMutation.mutate({ workId: work.id, decision: 'rejected' })} disabled={reviewUpdateRequestMutation.isPending}>
                      {reviewUpdateRequestMutation.isPending ? 'Working…' : 'Reject update request'}
                    </Button>
                  </>
                ) : null}
                <StatusBadge value={work.work_status} label={work.work_status_label} />
                <StatusBadge value={work.verification_status} label={work.verification_status_label} />
                {work.update_request_status ? <StatusBadge value={work.update_request_status} label={work.update_request_status_label ?? undefined} /> : null}
              </div>
            </div>
            <StatusHelperGrid
              items={[
                {
                  label: 'Work status',
                  value: <StatusBadge value={work.work_status} label={work.work_status_label} />,
                  helper: 'Operational state • Current rights workflow',
                },
                {
                  label: 'Verification',
                  value: <StatusBadge value={work.verification_status} label={work.verification_status_label} />,
                  helper: 'Review state • Latest admin verification outcome',
                },
              ]}
            />
            <DetailGrid items={[
              { label: 'Work type', value: work.type_of_work_label ?? work.type_of_work },
              { label: 'Publication year', value: work.publication_year },
              { label: 'Publisher', value: work.publisher_name ?? '—' },
              { label: 'Language', value: work.primary_language ?? '—' },
              { label: 'Submitted on', value: formatDate(work.submitted_at) },
              { label: 'Identifier', value: work.identifier_value ?? '—' },
            ]} />
            <Card className="space-y-3 p-5">
              <h4 className="text-base font-semibold text-[#101828]">Synopsis</h4>
              <p className="text-sm leading-7 text-[#475467] dark:text-slate-300">{work.synopsis || 'No synopsis provided.'}</p>
            </Card>
            <Card className="space-y-4 p-5">
              <h4 className="text-base font-semibold text-[#101828]">Contributors</h4>
              <DataTable
                columns={[
                  { key: 'name', header: 'Name', render: (row: WorkContributorResource) => row.contributor_name },
                  { key: 'role', header: 'Role', render: (row: WorkContributorResource) => row.contributor_role_label ?? row.contributor_role },
                  { key: 'right_type', header: 'Right type', render: (row: WorkContributorResource) => row.right_type_label ?? row.right_type },
                  { key: 'ownership', header: 'Ownership', render: (row: WorkContributorResource) => `${row.ownership_percentage}%` },
                ]}
                rows={work.contributors ?? []}
                emptyTitle="No contributors recorded yet"
              />
            </Card>
            <Card className="space-y-4 p-5">
              <h4 className="text-base font-semibold text-[#101828]">Files</h4>
              <div className="grid gap-4 md:grid-cols-2">
                {(work.files ?? []).map((file) => (
                  <FileCard
                    key={file.id}
                    title={file.file_name ?? file.file_type}
                    subtitle={`${file.file_type} · ${formatFileSize(file.file_size)} · ${formatDate(file.created_at)}`}
                    fileUrl={file.file_url}
                    downloadUrl={file.download_url}
                    onPreview={() => setPreviewFile(file)}
                  />
                ))}
              </div>
            </Card>
          </div>
        ) : null}
        {work && modalView === 'review' ? (
          <div className="grid gap-3">
            <DetailGrid items={[{ label: 'Work', value: work.title }, { label: 'Verification status', value: work.verification_status_label ?? work.verification_status }, { label: 'Work status', value: work.work_status_label ?? work.work_status }]} />
            <div className="space-y-2"><label className="text-sm font-medium text-slate-700 dark:text-slate-300">Review decision<span className="ml-1 text-red-600 dark:text-red-400">*</span></label><select value={reviewForm.decision} onChange={(event) => { setReviewForm((current) => ({ ...current, decision: event.target.value })); setReviewErrors((current) => ({ ...current, decision: undefined })); }} className="h-10 w-full rounded-xl border border-slate-300 bg-white dark:bg-slate-950 px-3 text-sm"><option value="" disabled>Select review decision</option>
              {['verified', 'approved', 'rejected', 'changes_requested', 'restricted', 'disputed'].map((option) => <option key={option} value={option}>{option.replace(/_/g, ' ')}</option>)}
            </select>{reviewErrors.decision ? <p className="text-sm text-[#B42318]">{reviewErrors.decision}</p> : null}</div>
            <FormField label="Reason code" placeholder="Enter reason code" error={reviewErrors.reason_code} value={reviewForm.reason_code} onChange={(event) => { setReviewForm((current) => ({ ...current, reason_code: event.target.value })); setReviewErrors((current) => ({ ...current, reason_code: undefined })); }} />
            <FormTextareaField label="Review note" placeholder="Add a short review note" error={reviewErrors.review_note} value={reviewForm.review_note} onChange={(event) => { setReviewForm((current) => ({ ...current, review_note: event.target.value })); setReviewErrors((current) => ({ ...current, review_note: undefined })); }} />
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"><input type="checkbox" checked={reviewForm.evidence_requested} onChange={(event) => setReviewForm((current) => ({ ...current, evidence_requested: event.target.checked }))} />Request more evidence from the submitter</label>
            <div className="pt-2"><Button onClick={() => reviewMutation.mutate()} disabled={reviewMutation.isPending}>{reviewMutation.isPending ? 'Saving…' : 'Save review'}</Button></div>
          </div>
        ) : null}
        {work && modalView === 'dispute' ? (
          <div className="grid gap-3">
            <DetailGrid items={[{ label: 'Work', value: work.title }, { label: 'Contributor count', value: work.contributors?.length ?? 0 }, { label: 'Current status', value: work.work_status_label ?? work.work_status }]} />
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Contributor<span className="ml-1 text-red-600 dark:text-red-400">*</span></label>
            <select value={disputeForm.contributor_id} onChange={(event) => { setDisputeForm((current) => ({ ...current, contributor_id: event.target.value })); setDisputeErrors((current) => ({ ...current, contributor_id: undefined })); }} className="h-10 rounded-xl border border-slate-300 bg-white dark:bg-slate-950 px-3 text-sm">
              <option value="">Select contributor</option>
              {(work.contributors ?? []).map((contributor) => <option key={contributor.id} value={contributor.id}>{contributor.contributor_name} · {contributor.contributor_role}</option>)}
            </select>{disputeErrors.contributor_id ? <p className="text-sm text-[#B42318]">{disputeErrors.contributor_id}</p> : null}
            <FormField label="Reason code" placeholder="Enter reason code" error={disputeErrors.reason_code} value={disputeForm.reason_code} onChange={(event) => { setDisputeForm((current) => ({ ...current, reason_code: event.target.value })); setDisputeErrors((current) => ({ ...current, reason_code: undefined })); }} />
            <FormTextareaField label="Reason" placeholder="Add a short dispute note" error={disputeErrors.reason} value={disputeForm.reason} onChange={(event) => { setDisputeForm((current) => ({ ...current, reason: event.target.value })); setDisputeErrors((current) => ({ ...current, reason: undefined })); }} />
            <div className="pt-2"><Button variant="outline" onClick={() => disputeMutation.mutate()} disabled={disputeMutation.isPending}>{disputeMutation.isPending ? 'Saving…' : 'Save dispute'}</Button></div>
          </div>
        ) : null}
      </Modal>

      <FilePreviewLightbox open={Boolean(previewFile)} onClose={() => setPreviewFile(null)} url={previewFile?.file_url} downloadUrl={previewFile?.download_url} title={previewFile?.file_name ?? previewFile?.file_type ?? 'File preview'} />
      <FilePreviewLightbox open={Boolean(coverPreview)} onClose={() => setCoverPreview(null)} url={coverPreview?.url} title={coverPreview?.title ?? 'Cover image'} />
    </div>
  );
}
