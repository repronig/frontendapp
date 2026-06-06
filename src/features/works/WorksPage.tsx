import { useMemo, useRef, useState } from 'react';
import { useForm, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth.store';
import { Upload } from 'lucide-react';
import { addWorkContributor, createWork, deleteWork, deleteWorkContributor, deleteWorkFile, getWork, listWorks, requestWorkUpdate, submitWork, updateWork, updateWorkContributor, uploadWorkFile } from '@/features/member/api';
import { getActiveTerms, getPublicLanguages } from '@/features/public/api';
import { onMutationApiError, toastApiError } from '@/lib/mutationFeedback';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { useTablePagination } from '@/hooks/useTablePagination';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { FormField } from '@/components/shared/FormField';
import { FormSelectField } from '@/components/shared/FormSelectField';
import { FormTextareaField } from '@/components/shared/FormTextareaField';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { SearchFilterBar } from '@/components/shared/SearchFilterBar';
import { DataTable } from '@/components/shared/DataTable';
import { DetailPanelState } from '@/components/shared/DetailPanelState';
import { PaginationBar } from '@/components/shared/PaginationBar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { FileCard } from '@/components/shared/FileCard';
import { FilePreviewLightbox } from '@/components/shared/FilePreviewLightbox';
import { WorkListPrimaryCell } from '@/components/shared/WorkListPrimaryCell';
import { Modal } from '@/components/shared/Modal';
import { ModalFormActions, ModalFormRoot, ModalFormScrollBody, ModalFormSection } from '@/components/shared/ModalForm';
import type { WorkContributorResource, WorkFileResource, WorkResource } from '@/types/domain';
import { formatDate, formatFileSize } from '@/utils/format';
import { workSchema, type WorkFormValues } from '@/features/works/schemas';
import { queryKeys } from '@/lib/queryKeys';

const workTypeOptions = [
  { label: 'Educational, non-fiction, scientific text', value: 'educational_non_fiction_scientific_text' },
  { label: 'Fiction to text (Prose, poem, lyrics, drama)', value: 'fiction_text' },
  { label: 'News articles, journalistic text', value: 'news_articles_journalistic_text' },
  { label: 'Photos, illustrations and other visual arts forming part of book content', value: 'book_content_visual_arts' },
  { label: 'Standalone visual works (Illustrations, photos, carvings, sculptures, paintings)', value: 'standalone_visual_works' },
  { label: 'Newspaper, magazines and inserts', value: 'newspaper_magazines_inserts' },
  { label: 'Song text', value: 'song_text' },
  { label: 'Musical score', value: 'musical_score' },
  { label: 'Other work type (Specify)', value: 'other_work_type' },
];

const identifierOptions = [
  { label: 'ISBN', value: 'isbn' },
  { label: 'ISSN', value: 'issn' },
  { label: 'ISNI', value: 'isni' },
  { label: 'ISWC', value: 'iswc' },
  { label: 'URL', value: 'url' },
  { label: 'Other', value: 'other' },
];

const workFormatOptions = [
  { label: 'Digital Copy', value: 'digital_copy' },
  { label: 'Hard Copy', value: 'hard_copy' },
  { label: 'Digital copy + Hardcopy', value: 'hard_digital_copy' },
];

const productionStatusOptions = [{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }];
const targetMarketOptions = [
  { label: 'School market (primary and secondary education)', value: 'school_market' },
  { label: 'Tertiary education market', value: 'tertiary_education_market' },
  { label: 'General Trade Book market', value: 'general_trade_book_market' },
  { label: 'General public', value: 'general_public' },
  { label: 'Other', value: 'other' },
];
const workStatusOptions = [{ label: 'Draft', value: 'draft' }, { label: 'Submitted', value: 'submitted' }, { label: 'Changes requested', value: 'changes_requested' }, { label: 'Disputed', value: 'disputed' }, { label: 'Approved', value: 'approved' }, { label: 'Rejected', value: 'rejected' }];
const contributorRightTypeOptions = [{ label: 'Exclusive', value: 'exclusive' }, { label: 'Non-exclusive', value: 'non_exclusive' }];
const workFileTypeOptions = [
  { label: 'Cover image', value: 'cover_image', required: true, accept: 'image/png,image/jpeg,.png,.jpg,.jpeg' },
  { label: 'Copyright page', value: 'copyright_page', required: false, accept: 'application/pdf,image/png,image/jpeg,.pdf,.png,.jpg,.jpeg' },
  { label: 'Proof of ownership', value: 'proof_of_ownership', required: false, accept: 'application/pdf,image/png,image/jpeg,.pdf,.png,.jpg,.jpeg' },
] as const;

type WorkFileType = typeof workFileTypeOptions[number]['value'];
type ContributorDraft = { key: string; existingId?: number; member_id?: number; contributor_name: string; contributor_role: string; right_type: 'exclusive' | 'non_exclusive'; ownership_percentage: number; territory_scope: string };
type WorkFileDraft = { key: string; existingId?: number; file_type: WorkFileType; file?: File; file_name?: string | null; file_url?: string | null; download_url?: string | null; file_size?: number | null; created_at?: string | null };
type ContributorEditorState = Omit<ContributorDraft, 'key' | 'existingId'>;
type SelectedFileMeta = { name: string; size: number; type: string };
type FileSelectionState = Record<WorkFileType, SelectedFileMeta | null>;

const emptyFileSelections = (): FileSelectionState => workFileTypeOptions.reduce((acc, option) => ({ ...acc, [option.value]: null }), {} as FileSelectionState);
const emptySelectedFiles = (): Record<WorkFileType, File | null> => workFileTypeOptions.reduce((acc, option) => ({ ...acc, [option.value]: null }), {} as Record<WorkFileType, File | null>);
const emptyWorkDefaults = (): WorkFormValues => ({ type_of_work: 'educational_non_fiction_scientific_text', title: '', subtitle: '', publication_year: new Date().getFullYear(), synopsis: '', primary_language: 'English', work_format: 'digital_copy', identifier_type: 'isbn', identifier_value: '', doi: '', publisher_name: '', target_market: 'general_public', target_market_other: '', production_status: 'yes', agreement_accepted: true, date_of_consent: new Date().toISOString().slice(0, 10), other_work_type: '', notes: '' });
const emptyContributorDraft = (): ContributorEditorState => ({ member_id: undefined, contributor_name: '', contributor_role: 'Author', right_type: 'exclusive', ownership_percentage: 0, territory_scope: 'Nigeria' });

function canEditWork(work?: WorkResource | null) {
  if (!work) return false;
  return ['draft', 'changes_requested'].includes(work.work_status)
    || (work.work_status === 'approved' && work.update_request_status === 'approved');
}
function contributorToDraft(contributor: WorkContributorResource): ContributorDraft { return { key: `existing-${contributor.id}`, existingId: contributor.id, member_id: contributor.member_id ?? undefined, contributor_name: contributor.contributor_name, contributor_role: contributor.contributor_role, right_type: (contributor.right_type as ContributorDraft['right_type']) ?? 'exclusive', ownership_percentage: Number(contributor.ownership_percentage), territory_scope: contributor.territory_scope ?? '' }; }
function fileToDraft(file: WorkFileResource): WorkFileDraft { return { key: `existing-${file.id}`, existingId: file.id, file_type: (file.file_type as WorkFileType) ?? 'cover_image', file_name: file.file_name, file_url: file.file_url, download_url: file.download_url, file_size: file.file_size, created_at: file.created_at }; }
function workBadgeTone(value?: string | null, type: 'work' | 'verification' = 'work') { const raw = (value || 'unknown').toLowerCase(); if (type === 'verification') { if (['verified', 'approved'].includes(raw)) return 'bg-emerald-50 text-emerald-700 border-emerald-200'; if (['pending', 'unverified', 'awaiting_review'].includes(raw)) return 'bg-amber-50 text-amber-700 border-amber-200'; if (['changes_requested', 'under_review', 'review'].includes(raw)) return 'bg-sky-50 text-sky-700 border-sky-200'; if (['rejected', 'failed'].includes(raw)) return 'bg-rose-50 text-rose-700 border-rose-200'; return 'bg-slate-100 text-slate-700 dark:text-slate-300 border-slate-200'; } if (['approved'].includes(raw)) return 'bg-emerald-50 text-emerald-700 border-emerald-200'; if (['draft'].includes(raw)) return 'bg-stone-100 text-stone-700 border-stone-200'; if (['submitted'].includes(raw)) return 'bg-amber-50 text-amber-700 border-amber-200'; if (['changes_requested', 'under_review', 'review'].includes(raw)) return 'bg-sky-50 text-sky-700 border-sky-200'; if (['rejected'].includes(raw)) return 'bg-rose-50 text-rose-700 border-rose-200'; return 'bg-slate-100 text-slate-700 dark:text-slate-300 border-slate-200'; }
function StyledWorkBadge({ value, type = 'work' }: { value?: string | null; type?: 'work' | 'verification' }) { return <StatusBadge value={value} className={workBadgeTone(value, type)} />; }
function hasDisputedContributor(work: WorkResource) {
  return Boolean(work.is_disputed || (work.contributors ?? []).some((contributor) => contributor.is_disputed));
}
function detailsToFormValues(work: WorkResource): WorkFormValues { return { type_of_work: work.type_of_work as WorkFormValues['type_of_work'], title: work.title, subtitle: work.subtitle ?? '', publication_year: work.publication_year ?? new Date().getFullYear(), synopsis: work.synopsis ?? '', primary_language: work.primary_language ?? 'English', work_format: (work.work_format as WorkFormValues['work_format']) ?? 'digital_copy', identifier_type: (work.identifier_type as WorkFormValues['identifier_type']) ?? 'isbn', identifier_value: work.identifier_value ?? '', doi: work.doi ?? '', publisher_name: work.publisher_name ?? '', target_market: (work.target_market as WorkFormValues['target_market']) ?? 'general_public', target_market_other: work.target_market_other ?? '', production_status: (work.production_status as WorkFormValues['production_status']) ?? 'yes', agreement_accepted: Boolean(work.agreement_accepted), date_of_consent: work.date_of_consent ?? new Date().toISOString().slice(0, 10), other_work_type: work.other_work_type ?? '', notes: work.notes ?? '' }; }

export function WorksPage() {
  const queryClient = useQueryClient();
  const selectedFilesRef = useRef<Record<WorkFileType, File | null>>(emptySelectedFiles());
  const currentUser = useAuthStore((state) => state.currentUser);
  const memberCanUploadWorks = Boolean(currentUser?.onboarding_status?.member_approved);
  const memberApplicationStatus = (currentUser?.onboarding_status?.member_application_status ?? 'draft').toLowerCase();
  const uploadBlockedCopy = memberApplicationStatus === 'submitted'
    ? {
        title: 'Application is under review',
        subtitle: 'Work upload will be available after approval.',
        message: 'Application is under review and work upload will be available after approval. You will be notified once your application has been approved.',
      }
    : {
        title: 'Complete your onboarding',
        subtitle: 'Work upload will be available after onboarding approval.',
        message: 'You need to complete your onboarding. Work upload will be available after you have completed your onboarding and your application is approved.',
      };
  const { page, setPage, perPage, setPerPage } = useTablePagination();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [highlightedSection, setHighlightedSection] = useState<1 | 2 | 3 | 4 | null>(null);
  const [viewWorkId, setViewWorkId] = useState<number | null>(null); const [workModalMode, setWorkModalMode] = useState<'create' | 'edit' | null>(null); const [modalWorkId, setModalWorkId] = useState<number | null>(null); const [workModalBusy, setWorkModalBusy] = useState(false);
  const [modalContributors, setModalContributors] = useState<ContributorDraft[]>([]); const [modalFiles, setModalFiles] = useState<WorkFileDraft[]>([]); const [contributorDraft, setContributorDraft] = useState<ContributorEditorState>(emptyContributorDraft()); const [editingContributorKey, setEditingContributorKey] = useState<string | null>(null); const [contributorError, setContributorError] = useState<string | null>(null); const [fileSelections, setFileSelections] = useState<FileSelectionState>(emptyFileSelections()); const [fileError, setFileError] = useState<string | null>(null); const [coverPreview, setCoverPreview] = useState<{ url: string; title: string } | null>(null); const [agreementTermsOpen, setAgreementTermsOpen] = useState(false); const [uploadBlockedModalOpen, setUploadBlockedModalOpen] = useState(false);
  const agreementTermsQuery = useQuery({ queryKey: queryKeys.activeTermsMemberWorkAgreement, queryFn: async () => (await getActiveTerms('member')).data, enabled: agreementTermsOpen });
  const languagesQuery = useQuery({ queryKey: queryKeys.publicLanguages, queryFn: getPublicLanguages, staleTime: 1000 * 60 * 10 });
  const workForm = useForm<WorkFormValues>({ resolver: zodResolver(workSchema), defaultValues: emptyWorkDefaults() });
  const primaryLanguage = workForm.watch('primary_language');
  const languageOptions = useMemo(() => {
    const languages = languagesQuery.data?.data ?? [];
    const base =
      languages.length > 0
        ? languages
            .filter((language) => Boolean(language?.name?.trim()))
            .map((language) => ({ label: language.name.trim(), value: language.name.trim() }))
        : [{ label: 'English', value: 'English' }];
    const current = primaryLanguage?.trim();
    if (current && !base.some((option) => option.value === current)) {
      return [...base, { label: current, value: current }];
    }
    return base;
  }, [languagesQuery.data?.data, primaryLanguage]);
  const listQuery = usePaginatedList({ queryKey: [...queryKeys.memberWorks, page, perPage, search, status], queryFn: listWorks, params: { page, per_page: perPage, search: search || undefined, status: status || undefined } });
  const viewWorkQuery = useQuery({ queryKey: queryKeys.memberWork(viewWorkId), queryFn: async () => { if (!viewWorkId) throw new Error('Missing work id.'); return getWork(viewWorkId); }, enabled: Boolean(viewWorkId) });
  const viewedWork = viewWorkQuery.data?.data ?? null;
  const totalOwnership = useMemo(() => modalContributors.reduce((sum, contributor) => sum + Number(contributor.ownership_percentage || 0), 0), [modalContributors]);
  const hasContributors = modalContributors.length > 0;
  const ownershipEqualsHundred = hasContributors && Math.abs(totalOwnership - 100) < 0.001; const ownershipWithinLimit = totalOwnership <= 100.001;
  const selectedWorkType = workForm.watch('type_of_work'); const selectedTargetMarket = workForm.watch('target_market'); const agreementAccepted = workForm.watch('agreement_accepted');

  function resetModalState() { setAgreementTermsOpen(false); setWorkModalMode(null); setModalWorkId(null); setWorkModalBusy(false); setModalContributors([]); setModalFiles([]); setContributorDraft(emptyContributorDraft()); setEditingContributorKey(null); setContributorError(null); selectedFilesRef.current = emptySelectedFiles(); setFileSelections(emptyFileSelections()); setFileError(null); setHighlightedSection(null); workForm.reset(emptyWorkDefaults()); }
  function openCreateModal() { if (!memberCanUploadWorks) { setUploadBlockedModalOpen(true); return; } resetModalState(); setWorkModalMode('create'); }
  async function openEditModal(workId: number) { try { setWorkModalBusy(true); const response = await getWork(workId); const work = response.data; setWorkModalMode('edit'); setModalWorkId(work.id); setModalContributors((work.contributors ?? []).map(contributorToDraft)); setModalFiles((work.files ?? []).map(fileToDraft)); setContributorDraft(emptyContributorDraft()); setEditingContributorKey(null); setContributorError(null); selectedFilesRef.current = emptySelectedFiles(); setFileSelections(emptyFileSelections()); setFileError(null); workForm.reset(detailsToFormValues(work)); } catch (error) { toastApiError(error); } finally { setWorkModalBusy(false); } }
  function validateContributorDraft(nextDraft: ContributorEditorState, excludingKey?: string | null) { if (!nextDraft.contributor_name.trim()) return 'Contributor name is required.'; if (!nextDraft.contributor_role.trim()) return 'Contributor role is required.'; if (nextDraft.ownership_percentage <= 0) return 'Ownership percentage must be greater than 0.'; if (nextDraft.ownership_percentage > 100) return 'Ownership percentage cannot exceed 100%.'; const otherTotal = modalContributors.filter((contributor) => contributor.key !== excludingKey).reduce((sum, contributor) => sum + Number(contributor.ownership_percentage || 0), 0); if ((otherTotal + Number(nextDraft.ownership_percentage || 0)) > 100.001) return 'Contributor ownership percentages cannot exceed 100% in total.'; return null; }
  function upsertContributorDraft() { const error = validateContributorDraft(contributorDraft, editingContributorKey); if (error) { setContributorError(error); return; } if (editingContributorKey) { setModalContributors((current) => current.map((item) => item.key === editingContributorKey ? { ...item, ...contributorDraft, territory_scope: contributorDraft.territory_scope ?? '' } : item)); } else { setModalContributors((current) => [...current, { key: `new-${Date.now()}-${current.length}`, ...contributorDraft, territory_scope: contributorDraft.territory_scope ?? '' }]); } setContributorDraft(emptyContributorDraft()); setEditingContributorKey(null); setContributorError(null); }
  function startContributorEdit(contributor: ContributorDraft) { setEditingContributorKey(contributor.key); setContributorDraft({ member_id: contributor.member_id, contributor_name: contributor.contributor_name, contributor_role: contributor.contributor_role, right_type: contributor.right_type, ownership_percentage: contributor.ownership_percentage, territory_scope: contributor.territory_scope ?? '' }); setContributorError(null); }
  function removeContributorDraft(key: string) { setModalContributors((current) => current.filter((contributor) => contributor.key !== key)); if (editingContributorKey === key) { setEditingContributorKey(null); setContributorDraft(emptyContributorDraft()); setContributorError(null); } }
  function setSelectedFile(fileType: WorkFileType, file: File | null) { selectedFilesRef.current[fileType] = file; setFileSelections((current) => ({ ...current, [fileType]: file ? { name: file.name, size: file.size, type: file.type } : null })); }
  function handleFileInputChange(fileType: WorkFileType, event: React.ChangeEvent<HTMLInputElement>) {
    try {
      const selectedFile = event.currentTarget.files?.[0] ?? null;
      setSelectedFile(fileType, selectedFile);
      setFileError(null);
    } catch {
      setFileError('Unable to select this file. Please try another file.');
      toast.error('Unable to select this file. Please try another file.');
    } finally {
      event.currentTarget.value = '';
    }
  }
  function highlightSection(section: 1 | 2 | 3 | 4) {
    setHighlightedSection(section);
    window.setTimeout(() => setHighlightedSection((current) => (current === section ? null : current)), 2200);
  }
  function addFileDraft(fileType: WorkFileType) { const selectedFile = selectedFilesRef.current[fileType]; if (!selectedFile) { setFileError('Select a file to add.'); highlightSection(3); return; } const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg']; if (!allowedTypes.includes(selectedFile.type)) { setFileError('Only PDF, PNG, and JPG files are allowed.'); highlightSection(3); return; } setModalFiles((current) => [...current.filter((file) => file.file_type !== fileType ), { key: `new-file-${Date.now()}-${current.length}`, file_type: fileType, file: selectedFile, file_name: selectedFile.name, file_size: selectedFile.size, created_at: new Date().toISOString() }]); setSelectedFile(fileType, null); setFileError(null); }
  function removeFileDraft(key: string) { setModalFiles((current) => current.filter((file) => file.key !== key)); }
  function scrollToFirstFormError(errors: FieldErrors<WorkFormValues>) {
    const orderedFields: Array<keyof WorkFormValues> = [
      'type_of_work',
      'title',
      'subtitle',
      'other_work_type',
      'primary_language',
      'identifier_type',
      'identifier_value',
      'work_format',
      'production_status',
      'target_market',
      'target_market_other',
      'publication_year',
      'doi',
      'publisher_name',
      'synopsis',
      'notes',
      'agreement_accepted',
      'date_of_consent',
    ];
    const firstErrorField = orderedFields.find((field) => errors[field]);
    if (!firstErrorField) return;
    const section: 1 | 2 | 3 | 4 = firstErrorField === 'agreement_accepted' || firstErrorField === 'date_of_consent' ? 4 : 1;
    highlightSection(section);
    const selector = `[name="${String(firstErrorField)}"]`;
    setTimeout(() => {
      const element = document.querySelector(selector) as HTMLElement | null;
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element?.focus?.();
    }, 0);
  }

  const saveWorkModalMutation = useMutation({
    mutationFn: async ({ values, submitAfter }: { values: WorkFormValues; submitAfter: boolean }) => {
      if (!hasContributors) throw new Error('Add at least one contributor before saving this work.');
      if (!ownershipWithinLimit) throw new Error('Contributor ownership percentages cannot exceed 100% in total.');
      if (!ownershipEqualsHundred) throw new Error('Contributor ownership percentages must equal 100% before saving this work.');
      if (!modalFiles.some((file) => file.file_type === 'cover_image')) throw new Error('Cover image is required before this work can be saved or submitted.');
      const payload = values;
      const workResponse = workModalMode === 'edit' && modalWorkId ? await updateWork(modalWorkId, payload) : await createWork(payload);
      const workId = workResponse.data.id; const existingWork = workModalMode === 'edit' ? await getWork(workId) : null; const originalContributors = existingWork?.data.contributors ?? []; const originalFiles = existingWork?.data.files ?? [];
      const contributorKeysById = new Set(modalContributors.filter((contributor) => contributor.existingId).map((contributor) => contributor.existingId as number));
      for (const contributor of originalContributors) if (!contributorKeysById.has(contributor.id)) await deleteWorkContributor(workId, contributor.id);
      for (const contributor of modalContributors) { const payload = { member_id: contributor.member_id, contributor_name: contributor.contributor_name, contributor_role: contributor.contributor_role, right_type: contributor.right_type, ownership_percentage: contributor.ownership_percentage, territory_scope: contributor.territory_scope }; if (contributor.existingId) await updateWorkContributor(workId, contributor.existingId, payload); else await addWorkContributor(workId, payload); }
      const fileIdsToKeep = new Set(modalFiles.filter((file) => file.existingId).map((file) => file.existingId as number));
      for (const file of originalFiles) if (!fileIdsToKeep.has(file.id)) await deleteWorkFile(workId, file.id);
      for (const file of modalFiles) if (!file.existingId && file.file) await uploadWorkFile(workId, { file_type: file.file_type, file: file.file });
      if (submitAfter) await submitWork(workId);
      return workResponse;
    },
    onSuccess: async (response) => { toast.success(response.message); await queryClient.invalidateQueries({ queryKey: queryKeys.memberWorks }); await queryClient.invalidateQueries({ queryKey: queryKeys.memberWork(response.data.id) }); await queryClient.invalidateQueries({ queryKey: queryKeys.memberWork(viewWorkId) }); resetModalState(); },
    onError: onMutationApiError(),
  });
  const requestUpdateMutation = useMutation({
    mutationFn: async (workId: number) => requestWorkUpdate(workId),
    onSuccess: async (response) => {
      toast.success(response.message);
      await queryClient.invalidateQueries({ queryKey: queryKeys.memberWorks });
      await queryClient.invalidateQueries({ queryKey: queryKeys.memberWork(response.data.id) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.memberWork(viewWorkId) });
    },
    onError: onMutationApiError(),
  });
  const deleteWorkMutation = useMutation({
    mutationFn: async (workId: number) => deleteWork(workId),
    onSuccess: async (response, workId) => {
      toast.success(response.message);
      await queryClient.invalidateQueries({ queryKey: queryKeys.memberWorks });
      await queryClient.invalidateQueries({ queryKey: queryKeys.memberWork(workId) });
      if (viewWorkId === workId) {
        setViewWorkId(null);
      }
    },
    onError: onMutationApiError(),
  });
  const rows = useMemo(() => listQuery.data?.data ?? [], [listQuery.data]);
  function submitModalWork(submitAfter: boolean) {
    return () => {
      if (!hasContributors) {
        setContributorError('Add at least one contributor before saving this work.');
        highlightSection(2);
        const section = document.querySelector('[data-work-section="contributors"]') as HTMLElement | null;
        section?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      setContributorError(null);
      const handler = workForm.handleSubmit(
        (values) => saveWorkModalMutation.mutate({ values, submitAfter }),
        (errors) => scrollToFirstFormError(errors),
      );
      void handler();
    };
  }
  function closeViewModal() { setViewWorkId(null); }

  return (
    <div className="space-y-6">
      <SectionHeader title="My Works" description="Register works for review." actions={<Button variant="outline" className="border-[#7A1F1A] bg-[#F8F2E8] text-[#7A1F1A] hover:bg-[#F3E9D9]" onClick={openCreateModal}>Upload Work</Button>} />
      <SearchFilterBar search={search} onSearchChange={(value) => { setSearch(value); setPage(1); }} status={status} onStatusChange={(value) => { setStatus(value); setPage(1); }} statusOptions={workStatusOptions} searchPlaceholder="Search works by title" onReset={() => { setSearch(''); setStatus(''); setPage(1); }} />
      <DataTable columns={[{ key: 'title', header: 'Work', className: 'min-w-[320px]', render: (row: WorkResource) => <div className="space-y-2"><WorkListPrimaryCell work={row} onClick={() => setViewWorkId(row.id)} onCoverClick={(url) => setCoverPreview({ url, title: row.title })} />{hasDisputedContributor(row) ? <span className="inline-flex items-center rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-800">Contributor disputed</span> : null}</div> }, { key: 'status', header: 'Status', render: (row: WorkResource) => <StyledWorkBadge value={row.work_status} type="work" /> }, { key: 'verification', header: 'Verification', render: (row: WorkResource) => <StyledWorkBadge value={row.verification_status} type="verification" /> }, { key: 'year', header: 'Year', render: (row: WorkResource) => row.publication_year }, { key: 'updated', header: 'Updated', render: (row: WorkResource) => formatDate(row.updated_at) }, { key: 'actions', header: 'Actions', render: (row: WorkResource) => <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" className="border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 hover:text-sky-800" onClick={() => setViewWorkId(row.id)}>View</Button><Button type="button" variant="outline" size="sm" className="border-[#E7D7B7] bg-[#F8F2E8] text-[#7A1F1A] hover:bg-[#F1E5D2] hover:text-[#671814]" disabled={!canEditWork(row)} onClick={() => void openEditModal(row.id)}>Edit</Button>{row.work_status === 'draft' ? <Button type="button" variant="destructive" size="sm" disabled={deleteWorkMutation.isPending} onClick={() => { const confirmed = window.confirm('Are you sure you want to delete this draft'); if (!confirmed) return; deleteWorkMutation.mutate(row.id); }}>Delete</Button> : null}{row.work_status === 'approved' && row.update_request_status !== 'pending' && row.update_request_status !== 'approved' ? <Button type="button" variant="outline" size="sm" onClick={() => requestUpdateMutation.mutate(row.id)} disabled={requestUpdateMutation.isPending}>{requestUpdateMutation.isPending ? 'Requesting…' : 'Request update'}</Button> : null}{row.work_status === 'approved' && row.update_request_status === 'pending' ? <span className="inline-flex items-center rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">Update request pending</span> : null}</div> }]} rows={rows} isLoading={listQuery.isLoading} exportTitle="Member works" emptyTitle="No works found yet" emptyDescription="Create your first draft work." />
      <PaginationBar meta={listQuery.data?.meta} onPageChange={setPage} perPage={perPage} onPerPageChange={setPerPage} />
      <FilePreviewLightbox open={Boolean(coverPreview)} onClose={() => setCoverPreview(null)} url={coverPreview?.url} title={coverPreview?.title ?? 'Cover image'} />
      <Modal open={uploadBlockedModalOpen} onClose={() => setUploadBlockedModalOpen(false)} title={uploadBlockedCopy.title} subtitle={uploadBlockedCopy.subtitle} size="sm">
        <div className="space-y-5">
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{uploadBlockedCopy.message}</p>
          <div className="flex justify-end">
            <Button type="button" onClick={() => setUploadBlockedModalOpen(false)}>OK</Button>
          </div>
        </div>
      </Modal>
      <Modal open={Boolean(viewWorkId)} onClose={closeViewModal} title="Work details" subtitle="Review the work details, contributors, and related files." size="lg">
        {viewWorkQuery.isLoading ? <DetailPanelState mode="loading" title="Loading work" description="Please wait while the work details are prepared." /> : viewedWork ? <div className="space-y-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{viewedWork.title}</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{viewedWork.type_of_work_label ?? viewedWork.type_of_work} · {viewedWork.reference_number ?? viewedWork.external_id ?? 'Pending reference'}</p></div><div className="flex items-center gap-2"><StyledWorkBadge value={viewedWork.work_status} type="work" /><StyledWorkBadge value={viewedWork.verification_status} type="verification" /></div></div><div className="grid gap-4 md:grid-cols-2"><Card className="space-y-2 text-sm"><p><span className="font-medium">Type:</span> {viewedWork.type_of_work_label ?? viewedWork.type_of_work}</p><p><span className="font-medium">Identifier:</span> {viewedWork.identifier_type ?? '—'} {viewedWork.identifier_value ?? '—'}</p><p><span className="font-medium">Work format:</span> {viewedWork.work_format ?? '—'}</p><p><span className="font-medium">Target market:</span> {viewedWork.target_market ?? '—'}</p><p><span className="font-medium">Submitted:</span> {formatDate(viewedWork.submitted_at)}</p></Card><Card><p className="text-xs uppercase tracking-[0.18em] text-slate-400">Synopsis</p><p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{viewedWork.synopsis || 'No synopsis added yet.'}</p></Card></div><div className="grid gap-6 xl:grid-cols-2"><Card className="space-y-5"><div><h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Right holders contribution</h4><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Contributor ownership must total 100% before submission.</p></div>{(viewedWork.contributors ?? []).length ? (viewedWork.contributors ?? []).map((contributor) => <div key={contributor.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"><p className="font-medium text-slate-900 dark:text-slate-100">{contributor.contributor_name}</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{contributor.contributor_role} · {contributor.right_type_label ?? contributor.right_type} · {contributor.ownership_percentage}%</p></div>) : <Alert title="No contributors yet" description="No contributors have been added to this work yet." />}</Card><Card className="space-y-5"><div><h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Files</h4><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Preview and download the files attached to this work.</p></div><div className="grid gap-4 md:grid-cols-2">{(viewedWork.files ?? []).length ? (viewedWork.files ?? []).map((file) => <FileCard key={file.id} title={file.file_name ?? file.file_type} subtitle={`${file.file_type} · ${formatFileSize(file.file_size)} · ${formatDate(file.created_at)}`} fileUrl={file.file_url} downloadUrl={file.download_url} />) : <Alert title="No files uploaded yet" description="No files have been attached to this work yet." />}</div></Card></div><div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={closeViewModal}>Close</Button></div></div> : null}
      </Modal>
      <Modal
        open={Boolean(workModalMode)}
        onClose={resetModalState}
        title={workModalMode === 'edit' ? 'Edit work' : 'Add work'}
        subtitle={
          workModalMode === 'edit'
            ? 'Update bibliographic details, contributors, files, and agreement in one place. '
            : 'Complete each step: work details, contributors, files, then agreement.'
        }
        size="lg"
      >
        {workModalBusy ? (
          <DetailPanelState mode="loading" title="Loading work" description="Please wait while the work details are prepared." />
        ) : (
          <ModalFormRoot onSubmit={(event) => event.preventDefault()}>
            <ModalFormScrollBody>
            <ModalFormSection badge="1" title="Work details" description="Bibliographic and market fields for this registration. All required fields are marked." className={highlightedSection === 1 ? 'ring-2 ring-red-300 dark:ring-red-500/60' : undefined}>
              <div className="grid gap-5 md:grid-cols-2">
                <FormSelectField label="Type of Work" requiredIndicator options={workTypeOptions} error={workForm.formState.errors.type_of_work?.message} {...workForm.register('type_of_work')} />
                <FormField label="Title" requiredIndicator error={workForm.formState.errors.title?.message} {...workForm.register('title')} />
                <FormField label="Sub title" error={workForm.formState.errors.subtitle?.message} {...workForm.register('subtitle')} />
                {selectedWorkType === 'other_work_type' ? <FormField label="Other work type" requiredIndicator error={workForm.formState.errors.other_work_type?.message} {...workForm.register('other_work_type')} /> : null}
                <FormSelectField label="Primary Language" requiredIndicator options={languageOptions} error={workForm.formState.errors.primary_language?.message} {...workForm.register('primary_language')} />
                <FormSelectField label="Identifier Type" requiredIndicator options={identifierOptions} error={workForm.formState.errors.identifier_type?.message} {...workForm.register('identifier_type')} />
                <FormField label="Identifier value/number" requiredIndicator error={workForm.formState.errors.identifier_value?.message} {...workForm.register('identifier_value')} />
                <FormSelectField label="Work Format" requiredIndicator options={workFormatOptions} error={workForm.formState.errors.work_format?.message} {...workForm.register('work_format')} />
                <FormSelectField label="Production Status" requiredIndicator helperText="Work no longer produced in print or electronic version for sale." options={productionStatusOptions} error={workForm.formState.errors.production_status?.message} {...workForm.register('production_status')} />
                <FormSelectField label="Target Market For the Work" requiredIndicator options={targetMarketOptions} error={workForm.formState.errors.target_market?.message} {...workForm.register('target_market')} />
                {selectedTargetMarket === 'other' ? <FormField label="Other target market" requiredIndicator error={workForm.formState.errors.target_market_other?.message} {...workForm.register('target_market_other')} /> : null}
                <FormField label="Publication year" type="number" error={workForm.formState.errors.publication_year?.message} {...workForm.register('publication_year', { valueAsNumber: true })} />
                <FormField label="DOI" error={workForm.formState.errors.doi?.message} {...workForm.register('doi')} />
                <FormField label="Publisher name" error={workForm.formState.errors.publisher_name?.message} {...workForm.register('publisher_name')} />
                <div className="md:col-span-2">
                  <FormTextareaField label="Synopsis/Description of work" error={workForm.formState.errors.synopsis?.message} {...workForm.register('synopsis')} />
                </div>
                <div className="md:col-span-2">
                  <FormTextareaField label="Notes / Additional Information" error={workForm.formState.errors.notes?.message} {...workForm.register('notes')} />
                </div>
              </div>
            </ModalFormSection>

            <div data-work-section="contributors">
            <ModalFormSection badge="2" title="Right holder's contribution" description="Ownership cannot exceed 100%, and the combined total must equal 100% before you can save or submit." className={highlightedSection === 2 ? 'ring-2 ring-red-300 dark:ring-red-500/60' : undefined}>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-100/80 px-4 py-3 dark:bg-slate-900/60">
                <p className="text-sm text-slate-600 dark:text-slate-400">Track progress against the required total.</p>
                <div className={`rounded-full px-3.5 py-1.5 text-xs font-semibold tabular-nums shadow-sm ring-1 ring-black/5 dark:ring-white/10 ${ownershipWithinLimit && ownershipEqualsHundred ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200'}`}>Total ownership: {totalOwnership.toFixed(2)}%</div>
              </div>
              {!hasContributors ? <Alert title="Contributors required" description="Add at least one contributor before this work can be saved or submitted." /> : null}
              {!ownershipWithinLimit ? <Alert title="Ownership total exceeded" description="Reduce contributor percentages so the combined ownership stays within 100%." /> : null}
              {modalContributors.length > 0 && !ownershipEqualsHundred ? <Alert title="Ownership total incomplete" description="Contributor ownership must equal exactly 100% before this work can be saved." /> : null}
              <div className="grid gap-5 md:grid-cols-2">
                <FormField label="Contributor name" requiredIndicator value={contributorDraft.contributor_name} onChange={(event) => setContributorDraft((current) => ({ ...current, contributor_name: event.target.value }))} />
                <FormField label="Contributor role" requiredIndicator value={contributorDraft.contributor_role} onChange={(event) => setContributorDraft((current) => ({ ...current, contributor_role: event.target.value }))} />
                <FormSelectField label="Right type" requiredIndicator options={contributorRightTypeOptions} value={contributorDraft.right_type} onChange={(event) => setContributorDraft((current) => ({ ...current, right_type: event.target.value as ContributorEditorState['right_type'] }))} />
                <FormField label="Ownership percentage" requiredIndicator type="number" step="0.01" value={contributorDraft.ownership_percentage} onChange={(event) => setContributorDraft((current) => ({ ...current, ownership_percentage: Number(event.target.value) }))} />
                <div className="md:col-span-2">
                  <FormField label="Territory scope" value={contributorDraft.territory_scope} onChange={(event) => setContributorDraft((current) => ({ ...current, territory_scope: event.target.value }))} />
                </div>
              </div>
              {contributorError ? <p className="mt-3 text-sm text-red-600">{contributorError}</p> : null}
              <div className="mt-4 flex flex-wrap gap-3">
                <Button type="button" onClick={upsertContributorDraft}>{editingContributorKey ? 'Update contributor' : 'Add contributor'}</Button>
                {editingContributorKey ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingContributorKey(null);
                      setContributorDraft(emptyContributorDraft());
                      setContributorError(null);
                    }}
                  >
                    Cancel edit
                  </Button>
                ) : null}
              </div>
              <div className="mt-5 space-y-3">
                {modalContributors.length ? (
                  modalContributors.map((contributor) => (
                    <div key={contributor.key} className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm ring-1 ring-slate-900/[0.03] dark:border-slate-700 dark:bg-slate-900/40 dark:ring-white/[0.04]">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 dark:text-slate-100">{contributor.contributor_name}</p>
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{contributor.contributor_role} · {contributor.right_type} · {contributor.ownership_percentage}%</p>
                          {contributor.territory_scope ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{contributor.territory_scope}</p> : null}
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => startContributorEdit(contributor)}>Edit</Button>
                          <Button type="button" variant="destructive" size="sm" onClick={() => removeContributorDraft(contributor.key)}>Delete</Button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <Alert title="No contributors added yet" description="Add all contributors here so the work can be created or updated in one go." />
                )}
              </div>
            </ModalFormSection>
            </div>

            <ModalFormSection badge="3" title="Related files" description="Each document type has its own slot. Cover image is required; choose a file, then upload." className={highlightedSection === 3 ? 'ring-2 ring-red-300 dark:ring-red-500/60' : undefined}>
              <div className="grid gap-5 md:grid-cols-2">
                {workFileTypeOptions.map((option) => {
                  const selectedFile = fileSelections[option.value];
                  const existingFiles = modalFiles.filter((file) => file.file_type === option.value);
                  return (
                    <div key={option.value} className="space-y-3 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-900/35">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {option.label}
                          {option.required ? <span className="ml-1 text-red-600 dark:text-red-400">*</span> : null}
                        </p>
                        <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">Select a file, then use Upload for this type.</p>
                      </div>
                      <div className="space-y-2 rounded-lg border border-dashed border-slate-300/90 bg-white p-3 text-sm text-slate-600 shadow-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-300">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            <Upload className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1 truncate">{selectedFile ? selectedFile.name : `Choose ${option.label.toLowerCase()}`}</span>
                        </div>
                        <input
                          type="file"
                          accept={option.accept}
                          className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:file:bg-slate-800 dark:hover:file:bg-slate-700"
                          onChange={(event) => handleFileInputChange(option.value, event)}
                        />
                      </div>
                      {option.value === 'cover_image' && selectedFile ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400">Cover selected: {selectedFile.name}</p>
                      ) : null}
                      <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => addFileDraft(option.value)} disabled={!selectedFile}>
                        Upload {option.label}
                      </Button>
                      {existingFiles.length
                        ? existingFiles.map((file) => (
                            <div key={file.key} className="rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="font-medium text-slate-900 dark:text-slate-100">{file.file_name ?? file.file?.name ?? option.label}</p>
                                  <p className="mt-1 text-slate-500 dark:text-slate-400">{formatFileSize(file.file_size)} · {formatDate(file.created_at)}</p>
                                </div>
                                <div className="flex shrink-0 gap-2">
                                  {file.file_url || file.download_url ? (
                                    <Button type="button" variant="outline" size="sm" onClick={() => window.open(file.download_url ?? file.file_url ?? '', '_blank', 'noopener,noreferrer')}>View</Button>
                                  ) : null}
                                  <Button type="button" variant="destructive" size="sm" onClick={() => removeFileDraft(file.key)}>Remove</Button>
                                </div>
                              </div>
                            </div>
                          ))
                        : null}
                    </div>
                  );
                })}
              </div>
              {fileError ? <p className="mt-3 text-sm text-red-600">{fileError}</p> : null}
            </ModalFormSection>

            <ModalFormSection badge="4" title="Rightsholder affiliation agreement" description="Between REPRONIG and you (the &quot;Rightsholder&quot;). Read the terms, consent, and confirm the date." className={highlightedSection === 4 ? 'ring-2 ring-red-300 dark:ring-red-500/60' : undefined}>
              <div className="space-y-5 rounded-xl border border-slate-200/80 bg-slate-50/40 p-4 dark:border-slate-700 dark:bg-slate-900/30">
                <label className="flex cursor-pointer items-start gap-3 rounded-lg p-1 text-sm leading-6 text-slate-600 transition hover:bg-white/60 dark:text-slate-300 dark:hover:bg-slate-800/40">
                  <input name="agreement_accepted" type="checkbox" className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-[#7A1F1A] focus:ring-[#7A1F1A]/30 dark:border-slate-600" checked={Boolean(agreementAccepted)} onChange={(event) => workForm.setValue('agreement_accepted', event.target.checked, { shouldValidate: true })} />
                  <span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">Agreement <span className="text-red-600 dark:text-red-400">*</span></span>
                    <br />
                    Read{' '}
                    <button type="button" className="font-semibold text-[#7A1F1A] underline decoration-2 underline-offset-2 hover:text-[#9B2C24] dark:text-[#F5C842] dark:hover:text-amber-200" onClick={() => setAgreementTermsOpen(true)}>
                      the terms and conditions of this agreement
                    </button>{' '}
                    and check the box if you consent.
                  </span>
                </label>
                {workForm.formState.errors.agreement_accepted?.message ? <p className="text-sm text-red-600">{workForm.formState.errors.agreement_accepted.message}</p> : null}
                <div className="space-y-3 border-t border-slate-200/80 pt-4 text-sm leading-relaxed text-slate-600 dark:border-slate-700 dark:text-slate-300">
                  <p>By affiliating with REPRONIG, you appoint REPRONIG as your collective society to license and administer on a collective basis the rights in your Works in accordance with the attached terms and conditions with the annexed royalty distribution guidelines and this form, as completed by you (together, the &quot;Agreement&quot;). Please read the terms and conditions carefully, as they form part of your Agreement with REPRONIG.</p>
                  <p>You represent to REPRONIG that you are the rightful owner of the works submitted via the REPRONIG registration portal, as updated by you from time to time, and that you have authorization to collect royalties in Nigeria for the reproduction and communication to the public by telecommunication of published literary, dramatic, artistic, and sheet music and lyrics owned by you.</p>
                </div>
                <div className="max-w-xs border-t border-slate-200/80 pt-4 dark:border-slate-700">
                  <FormField label="Date" requiredIndicator type="date" error={workForm.formState.errors.date_of_consent?.message} {...workForm.register('date_of_consent')} />
                </div>
              </div>
            </ModalFormSection>
            </ModalFormScrollBody>

            <ModalFormActions>
              <Button type="button" variant="outline" onClick={resetModalState}>Cancel</Button>
              <Button type="button" variant="outline" disabled={saveWorkModalMutation.isPending || workModalBusy || !ownershipWithinLimit || !ownershipEqualsHundred} onClick={submitModalWork(false)}>{saveWorkModalMutation.isPending ? 'Saving...' : 'Save Draft'}</Button>
              <Button type="button" className="bg-[#F5C842] font-semibold text-[#7A1F1A] shadow-sm hover:bg-[#E0B63C]" disabled={saveWorkModalMutation.isPending || workModalBusy || !ownershipWithinLimit || !ownershipEqualsHundred} onClick={submitModalWork(true)}>{saveWorkModalMutation.isPending ? 'Submitting...' : 'Submit Work'}</Button>
            </ModalFormActions>
          </ModalFormRoot>
        )}
      </Modal>
      <Modal open={agreementTermsOpen} onClose={() => setAgreementTermsOpen(false)} title={agreementTermsQuery.data?.title ?? 'REPRONIG Terms and Conditions'} subtitle={agreementTermsQuery.data?.version ? `Version ${agreementTermsQuery.data.version}` : undefined} size="xl">
        <div className="whitespace-pre-wrap text-sm leading-7 text-[#344054] dark:text-slate-200">{agreementTermsQuery.isLoading ? 'Loading terms and conditions...' : agreementTermsQuery.data?.content || 'Terms and conditions have not been published yet. Please contact REPRONIG support.'}</div>
      </Modal>
    </div>
  );
}
