import { useMutation, useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { DEFAULT_PAGE_SIZE, normalizeClientPageSize } from '@/constants/pagination';
import { useListUrlState } from '@/hooks/useListUrlState';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ActionDialog } from '@/components/shared/ActionDialog';
import { ActivityTimeline } from '@/components/shared/ActivityTimeline';
import { DataTable } from '@/components/shared/DataTable';
import { DetailPanelState } from '@/components/shared/DetailPanelState';
import { DetailGrid } from '@/components/shared/DetailGrid';
import { LightboxModal } from '@/components/shared/LightboxModal';
import { ListCountSummary } from '@/components/shared/ListCountSummary';
import { Modal } from '@/components/shared/Modal';
import { PaginationBar } from '@/components/shared/PaginationBar';
import { SearchFilterBar } from '@/components/shared/SearchFilterBar';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { approvalActionButtonClass } from '@/components/shared/tableActionStyles';
import { StatusHelperGrid } from '@/components/shared/StatusHelperGrid';
import {
  approveAdminDeclaration,
  downloadAdminDeclarationsExport,
  getAdminDeclaration,
  listAdminDeclarations,
  listAdminTimeline,
  moveAdminDeclarationToReview,
  rejectAdminDeclaration,
} from '@/features/admin/api';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import type { InstitutionAnnualDeclarationResource } from '@/types/domain';
import { formatCurrency, formatDate } from '@/utils/format';
import { confirmAdminSensitiveAction } from '@/features/admin/security';
import { showAdminActionError, showAdminActionSuccess, showAdminExportError, showAdminExportSuccess } from '@/features/admin/action-feedback';
import { triggerBlobDownload } from '@/utils/download';
import { queryKeys } from '@/lib/queryKeys';

type DetailMode = 'declarations' | null;

const declarationStatuses = [
  { label: 'Draft', value: 'draft' },
  { label: 'Submitted', value: 'submitted' },
  { label: 'Under review', value: 'under_review' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];
const academicInstitutionTypes = ['university', 'polytechnic', 'college_of_education', 'research_institute'];

function InstitutionDeclarationCell({ row }: { row: InstitutionAnnualDeclarationResource }) {
  const institution = row.institution;
  const logoUrl = institution?.logo_url ?? institution?.logo ?? null;
  const initials = (institution?.name ?? 'Institution').split(' ').map((part) => part.charAt(0)).join('').slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#EAECF0] dark:border-slate-800 bg-[#F8FAFC] text-sm font-semibold text-[#475467] dark:text-slate-300">
        {logoUrl ? <img src={logoUrl} alt={`${institution?.name ?? 'Institution'} logo`} className="h-full w-full object-cover" /> : initials}
      </div>
      <div>
        <p className="font-semibold text-slate-900 dark:text-slate-50">{institution?.name ?? 'Institution not linked'}</p>
        <p className="mt-1 text-sm text-slate-500">{[institution?.licence_id ?? null, institution?.institution_type ?? null, institution?.email ?? null].filter(Boolean).join(' • ') || 'No institution info'}</p>
      </div>
    </div>
  );
}

export function AdminDeclarationsPage() {
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
  const [modalMode, setModalMode] = useState<DetailMode>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [declarationAction, setDeclarationAction] = useState<'review' | 'approve' | 'reject' | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [supportDocumentPreview, setSupportDocumentPreview] = useState<{ title: string; url: string; fileName?: string | null } | null>(null);

  const declarationsQuery = usePaginatedList({
    queryKey: [...queryKeys.adminDeclarations, page, perPage, search, effectiveStatus, dateFrom, dateTo],
    queryFn: listAdminDeclarations,
    params: { page, per_page: perPage, search: search || undefined, status: effectiveStatus, date_from: dateFrom || undefined, date_to: dateTo || undefined },
  });

  const declarationDetailQuery = useQuery({
    queryKey: queryKeys.adminDeclaration(selectedId),
    queryFn: async () => getAdminDeclaration(selectedId as number),
    enabled: modalMode === 'declarations' && Boolean(selectedId),
  });

  const declaration = declarationDetailQuery.data?.data ?? null;

  const declarationTimelineQuery = useQuery({
    queryKey: queryKeys.adminTimeline('declaration', selectedId),
    queryFn: async () => listAdminTimeline('declaration', selectedId as number, { page: 1, per_page: 10 }),
    enabled: modalMode === 'declarations' && Boolean(selectedId),
  });

  function openModal(id: number, mode: DetailMode) {
    setSelectedId(id);
    setModalMode(mode);
  }

  function closeModal() {
    setModalMode(null);
    setReviewNote('');
    setRejectReason('');
    setDeclarationAction(null);
    setSupportDocumentPreview(null);
  }

  const declarationActionSuccess = async (message: string) => {
    showAdminActionSuccess(message);
    setDeclarationAction(null);
    await Promise.all([declarationsQuery.refetch(), declarationDetailQuery.refetch(), declarationTimelineQuery.refetch()]);
  };

  const moveToReviewMutation = useMutation({
    mutationFn: async () => {
      if (!declaration) throw new Error('Select a declaration first.');
      const confirmed = await confirmAdminSensitiveAction({ title: 'Confirm declaration review move', description: 'This will move the declaration into review and record the action in admin activity.', confirmLabel: 'Move to review' });
      if (!confirmed) throw new Error('Security confirmation cancelled.');
      return moveAdminDeclarationToReview(declaration.id, { note: reviewNote || undefined });
    },
    onSuccess: async (response) => declarationActionSuccess(response.message),
    onError: (error) => showAdminActionError(error, 'The declaration action could not be completed.'),
  });

  const approveDeclarationMutation = useMutation({
    mutationFn: async () => {
      if (!declaration) throw new Error('Select a declaration first.');
      const confirmed = await confirmAdminSensitiveAction({ title: 'Confirm declaration approval', description: 'Approving this declaration updates a protected licensing workflow.', confirmLabel: 'Approve declaration' });
      if (!confirmed) throw new Error('Security confirmation cancelled.');
      return approveAdminDeclaration(declaration.id);
    },
    onSuccess: async (response) => declarationActionSuccess(response.message),
    onError: (error) => showAdminActionError(error, 'The declaration action could not be completed.'),
  });

  const rejectDeclarationMutation = useMutation({
    mutationFn: async () => {
      if (!declaration) throw new Error('Select a declaration first.');
      const confirmed = await confirmAdminSensitiveAction({ title: 'Confirm declaration rejection', description: 'Rejecting this declaration is a protected action and will be logged for audit visibility.', confirmLabel: 'Reject declaration' });
      if (!confirmed) throw new Error('Security confirmation cancelled.');
      return rejectAdminDeclaration(declaration.id, { reason: rejectReason || undefined });
    },
    onSuccess: async (response) => declarationActionSuccess(response.message),
    onError: (error) => showAdminActionError(error, 'The declaration action could not be completed.'),
  });


  const activeMeta = declarationsQuery.data?.meta;
  const tabHelperText = 'Review submitted declarations, then open a row to inspect finance context and next actions.';
  const searchPlaceholder = 'Search declarations by institution, year, or reference';
  const countSubject = 'declarations';
  const countHelper = `${activeMeta?.total ?? 0} declaration records across the current review view`;
  const isDeclarationApproved = declaration?.declaration_status === 'approved';

  return (
    <div className="space-y-6">
      <SectionHeader title="Declarations" description="Annual institution declarations." actions={<Button variant="outline" disabled={isExporting} onClick={async () => { try { setIsExporting(true); const response = await downloadAdminDeclarationsExport({ search: search || undefined, status: effectiveStatus, date_from: dateFrom || undefined, date_to: dateTo || undefined }); triggerBlobDownload(response.blob, response.filename); showAdminExportSuccess('Declarations'); } catch { showAdminExportError('Declarations'); } finally { setIsExporting(false); } }}>{isExporting ? 'Exporting…' : 'Export CSV'}</Button>} />

      <p className="text-sm text-[#667085] dark:text-slate-300">{tabHelperText}</p>
      <ListCountSummary meta={activeMeta} subject={countSubject} helper={countHelper} />

      <SearchFilterBar
        search={search}
        onSearchChange={setSearch}
        status={effectiveStatus}
        onStatusChange={setStatus}
        statusOptions={declarationStatuses}
        searchPlaceholder={searchPlaceholder}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onReset={resetFilters}
      />

      <div className="space-y-4">
          <DataTable
            columns={[
              { key: 'institution', header: 'Institution', render: (row: InstitutionAnnualDeclarationResource) => <InstitutionDeclarationCell row={row} /> },
              { key: 'year', header: 'Year', render: (row: InstitutionAnnualDeclarationResource) => row.licensing_year ?? '—' },
              { key: 'status', header: 'Status', render: (row: InstitutionAnnualDeclarationResource) => <StatusBadge value={row.declaration_status} /> },
              { key: 'expected', header: 'Expected', render: (row: InstitutionAnnualDeclarationResource) => formatCurrency(row.expected_amount) },
              { key: 'outstanding', header: 'Outstanding', render: (row: InstitutionAnnualDeclarationResource) => formatCurrency(row.outstanding_amount) },
            ]}
            rows={declarationsQuery.data?.data ?? []}
            isLoading={declarationsQuery.isLoading}
            loadingTitle="Loading declarations"
            loadingDescription="The latest declaration records are being fetched from the backend."
            onRowClick={(row) => openModal(row.id, 'declarations')}
            selectedRowKey={modalMode === 'declarations' ? selectedId ?? undefined : undefined}
            getRowKey={(row) => row.id}
          />
          <PaginationBar meta={activeMeta} onPageChange={setPage} subject={countSubject} perPage={perPage} onPerPageChange={setPerPage} />
        </div>


      <Modal
        open={modalMode !== null}
        onClose={closeModal}
        title="Declaration details"
        subtitle="Figures and review actions."
        size="lg"
      >
        {modalMode === 'declarations' ? (
          declarationDetailQuery.isLoading ? <DetailPanelState mode="loading" title="Loading declaration" description="Please wait…preparing selected resource." /> : declaration ? (
            <div className="space-y-6">
              <StatusHelperGrid
                items={[
                  {
                    label: 'Declaration status',
                    value: <StatusBadge value={declaration.declaration_status} />,
                    helper: 'Review state • Current declaration decision',
                  },
                  {
                    label: 'Outstanding amount',
                    value: formatCurrency(declaration.outstanding_amount),
                    helper: 'Finance state • Balance still to be settled',
                  },
                ]}
              />
              <DetailGrid
                items={[
                  { label: 'Licensing year', value: declaration.licensing_year },
                  { label: 'Pricing basis', value: declaration.basis_type ?? '—' },
                  { label: 'Declared units', value: (declaration.faculties ?? []).length ? (declaration.faculties ?? []).reduce((total, faculty) => total + Number(faculty.student_count ?? 0), 0) : declaration.declared_units ?? '—' },
                  { label: 'Expected amount', value: formatCurrency(declaration.expected_amount) },
                  { label: 'Submitted on', value: formatDate(declaration.submitted_at) },
                ]}
              />
              <div className="rounded-2xl border border-[#EAECF0] p-5 dark:border-slate-800">
                <p className="text-sm font-semibold text-[#344054] dark:text-slate-200">Supporting document</p>
                {declaration.supporting_document?.download_url ? (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{declaration.supporting_document.file_name ?? 'Declaration supporting document'}</p>
                      <p className="mt-1 text-xs text-slate-500">Uploaded with the institution declaration.</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSupportDocumentPreview({
                        title: 'Declaration supporting document',
                        url: declaration.supporting_document?.file_url ?? declaration.supporting_document?.download_url ?? '',
                        fileName: declaration.supporting_document?.file_name,
                      })}
                    >
                      View document
                    </Button>
                  </div>
                ) : (
                  <Alert title="No supporting document" description="No supporting document was uploaded for this declaration." />
                )}
              </div>
              {academicInstitutionTypes.includes((declaration.institution?.institution_type ?? '').toLowerCase()) ? (
                <div>
                  <p className="text-sm font-semibold text-[#344054] dark:text-slate-200">Faculties</p>
                  <div className="mt-3 space-y-2">
                    {(declaration.faculties ?? []).length ? declaration.faculties?.map((faculty, index) => (
                      <div key={`${faculty.faculty_name}-${index}`} className="rounded-2xl border border-slate-200 p-3 text-sm text-slate-700 dark:text-slate-300">
                        {faculty.faculty_name} · {faculty.student_count} students
                      </div>
                    )) : <Alert title="No faculty breakdown" description="No faculty rows were returned for this declaration yet." />}
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-semibold text-[#344054] dark:text-slate-200">Branches and member counts</p>
                  <div className="mt-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                    <DetailGrid
                      items={[
                        { label: 'Declared members', value: declaration.declared_members_count ?? '—' },
                        { label: 'Declared branches', value: declaration.declared_branches_count ?? '—' },
                      ]}
                    />
                  </div>
                </div>
              )}
              <div className="rounded-2xl border border-[#EAECF0] dark:border-slate-800 p-5">
                <SectionHeader title="Review actions" description="Approve, review, or reject." />
                <div className="space-y-3">
                  <p className="text-sm text-[#667085] dark:text-slate-300">Use the primary action first when the declaration is ready to move forward. Use rejection only when you need to stop the current flow.</p>
                  <div className="flex flex-wrap gap-3">
                    <Button className={approvalActionButtonClass} onClick={() => setDeclarationAction('approve')} disabled={approveDeclarationMutation.isPending || isDeclarationApproved}>Approve declaration</Button>
                    <Button variant="outline" onClick={() => setDeclarationAction('review')} disabled={moveToReviewMutation.isPending}>Move to review</Button>
                    <Button variant="destructive" onClick={() => setDeclarationAction('reject')} disabled={rejectDeclarationMutation.isPending}>Reject declaration</Button>
                  </div>
                </div>
              </div>
              <ActivityTimeline items={declarationTimelineQuery.data?.data} isLoading={declarationTimelineQuery.isLoading} emptyTitle="No declaration timeline yet" />
            </div>
          ) : <DetailPanelState mode="empty" title="No declaration selected" description="Choose a declaration from the table to continue." />
        ) : null}

      </Modal>

      <LightboxModal
        open={Boolean(supportDocumentPreview)}
        onClose={() => setSupportDocumentPreview(null)}
        title={supportDocumentPreview?.title ?? 'Declaration supporting document'}
        url={supportDocumentPreview?.url ?? null}
        fileName={supportDocumentPreview?.fileName}
      />

      <ActionDialog open={declarationAction === 'review'} onClose={() => setDeclarationAction(null)} title="Move declaration to review" description="Send this declaration into review and record an internal note." actionLabel="Move to review" showReason initialReason={reviewNote} reasonLabel="Review note" onConfirm={(reason) => { setReviewNote(reason); moveToReviewMutation.mutate(); }} isSubmitting={moveToReviewMutation.isPending} />
      <ActionDialog open={declarationAction === 'approve'} onClose={() => setDeclarationAction(null)} title="Approve declaration" description="Approve this declaration and update its current status." actionLabel="Approve declaration" onConfirm={() => approveDeclarationMutation.mutate()} isSubmitting={approveDeclarationMutation.isPending} />
      <ActionDialog open={declarationAction === 'reject'} onClose={() => setDeclarationAction(null)} title="Reject declaration" description="Reject this declaration and capture a short reason for the decision." actionLabel="Reject declaration" actionVariant="destructive" showReason initialReason={rejectReason} onConfirm={(reason) => { setRejectReason(reason); rejectDeclarationMutation.mutate(); }} isSubmitting={rejectDeclarationMutation.isPending} />
    </div>
  );
}
