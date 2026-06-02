import { useCallback, useMemo, useState } from 'react';
import { DEFAULT_PAGE_SIZE, normalizeClientPageSize } from '@/constants/pagination';
import { useLocation } from 'react-router-dom';
import { Building2, FileText, User } from 'lucide-react';
import { useListUrlState } from '@/hooks/useListUrlState';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ActionDialog } from '@/components/shared/ActionDialog';
import { ActivityTimeline } from '@/components/shared/ActivityTimeline';
import { DataTable } from '@/components/shared/DataTable';
import { DetailPanelState } from '@/components/shared/DetailPanelState';
import { DetailGrid } from '@/components/shared/DetailGrid';
import { FileCard } from '@/components/shared/FileCard';
import { ListCountSummary } from '@/components/shared/ListCountSummary';
import { Modal } from '@/components/shared/Modal';
import { LightboxModal } from '@/components/shared/LightboxModal';
import { PaginationBar } from '@/components/shared/PaginationBar';
import { SearchFilterBar } from '@/components/shared/SearchFilterBar';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { approvalActionButtonClass } from '@/components/shared/tableActionStyles';
import { StatusHelperGrid } from '@/components/shared/StatusHelperGrid';
import { approveAdminInstitution, approveAdminMemberApplication, deactivateAdminInstitution, downloadAdminInstitutionsExport, downloadAdminMembersExport, getAdminInstitution, getAdminMember, getAdminMemberApplication, listAdminAssociations, listAdminInstitutions, listAdminMemberApplications, listAdminMembers, listAdminTimeline, reactivateAdminInstitution, rejectAdminInstitution, rejectAdminMemberApplication, requestChangesAdminMemberApplication } from '@/features/admin/api';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import type { AssociationResource, InstitutionProfileResource, MemberApplicationResource, MemberProfileResource, UserResource } from '@/types/domain';
import { confirmAdminSensitiveAction } from '@/features/admin/security';
import { showAdminActionError, showAdminActionSuccess, showAdminExportError, showAdminExportSuccess } from '@/features/admin/action-feedback';
import { triggerBlobDownload } from '@/utils/download';
import { formatDate, formatFileSize } from '@/utils/format';
import { resolveFileUrl } from '@/utils/fileUrl';
import { formatDisplayLabel } from '@/utils/display';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';

type Tab = 'members' | 'applications' | 'institutions';
type InstitutionAction = 'approve' | 'reject' | 'deactivate' | 'reactivate' | null;
type ApplicationAction = 'approve' | 'reject' | 'request_changes' | null;


function missingKycDocumentLabels(institution?: InstitutionProfileResource | null) {
  return institution?.kyc_readiness?.missing_documents?.map((item) => formatDisplayLabel(item)) ?? [];
}

function institutionApprovalBlockedMessage(institution?: InstitutionProfileResource | null) {
  const missingLabels = missingKycDocumentLabels(institution);
  if (!missingLabels.length) return null;

  return `Institution cannot be approved until the required KYC document(s) have been uploaded: ${missingLabels.join(' and ')}.`;
}

function InstitutionIdentityCell({ institution }: { institution: InstitutionProfileResource }) {
  const logoUrl = institution.logo_url ?? institution.logo_medium_url ?? institution.logo_thumb_url ?? null;
  const initials = (institution.name || 'Institution').split(' ').map((part) => part.charAt(0)).join('').slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#EAECF0] dark:border-slate-800 bg-[#F8FAFC] text-sm font-semibold text-[#475467] dark:text-slate-300">
        {logoUrl ? <img src={logoUrl} alt={institution.name + ' logo'} className="h-full w-full object-cover" /> : initials}
      </div>
      <div>
        <p className="font-semibold">{institution.name}</p>
        <p className="mt-1 text-sm text-[#6B788E] dark:text-slate-300">{[institution.institution_type_label ?? institution.institution_type ?? null, institution.email ?? null, institution.licence_id ? 'Licence ' + institution.licence_id : null].filter(Boolean).join(' • ') || 'No institution summary'}</p>
      </div>
    </div>
  );
}

function MemberIdentityCell({ member }: { member: MemberProfileResource }) {
  const avatarUrl = resolveFileUrl(member.user?.avatar_medium_url ?? member.user?.avatar_url ?? member.user?.avatar_thumb_url ?? null);
  const primary = member.user?.name ?? member.user?.email ?? member.member_code ?? `#${member.member_id}`;
  const secondary = [
    member.member_code ? `Code ${member.member_code}` : `ID ${member.member_id}`,
    member.member_type ? formatDisplayLabel(member.member_type) : null,
    member.user?.status ? formatDisplayLabel(member.user.status) : null,
  ].filter(Boolean).join(' • ');

  return (
    <div className="flex items-center gap-4">
      <div className="flex h-[60px] w-[60px] shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#EAECF0] dark:border-slate-800 bg-[#F8FAFC] text-[#64748B]">
        {avatarUrl ? <img src={avatarUrl} alt={member.user?.name ?? 'Member avatar'} className="h-full w-full object-cover" /> : <User className="h-6 w-6" />}
      </div>
      <div>
        <p className="font-semibold text-[#101828]">{primary}</p>
        <p className="mt-1 text-sm text-[#6B788E] dark:text-slate-300">{secondary}</p>
      </div>
    </div>
  );
}

function InstitutionLogoPanel({ institution }: { institution: InstitutionProfileResource }) {
  const logoUrl = resolveFileUrl(institution.logo_medium_url ?? institution.logo_url ?? institution.logo_thumb_url ?? null);
  const initials = (institution.name || 'Institution').split(' ').map((part) => part.charAt(0)).join('').slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-[#EAECF0] dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#EAECF0] dark:border-slate-800 bg-[#F8FAFC] text-xl font-semibold text-[#475467] dark:text-slate-300">
        {logoUrl ? <img src={logoUrl} alt={`${institution.name} logo`} className="h-full w-full object-cover" /> : initials || <Building2 className="h-8 w-8" />}
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#667085] dark:text-slate-300">Institution logo</p>
        <p className="mt-1 text-base font-semibold text-[#101828] dark:text-slate-100">{institution.name}</p>
        <p className="mt-1 text-sm text-[#667085] dark:text-slate-300">{institution.licence_id ? `Licence ID ${institution.licence_id}` : 'Official Institution Logo'}</p>
      </div>
    </div>
  );
}

function InstitutionKycDocumentsPanel({ institution, onViewDocument }: { institution: InstitutionProfileResource; onViewDocument: (document: { title: string; url: string; fileName?: string | null }) => void }) {
  const documents = institution.kyc_documents ?? [];
  const missingDocuments = institution.kyc_readiness?.missing_documents ?? [];

  return (
    <div className="space-y-4 rounded-2xl border border-[#EAECF0] dark:border-slate-800 bg-white dark:bg-slate-950 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#101828] dark:text-slate-100">KYC documents</p>
          <p className="mt-1 text-sm text-[#667085] dark:text-slate-300">Required institution verification files.</p>
        </div>
        <StatusBadge value={institution.kyc_readiness?.is_complete ? 'complete' : 'incomplete'} label={institution.kyc_readiness?.is_complete ? 'Complete' : 'Incomplete'} />
      </div>

      {documents.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {documents.map((document) => {
            const fileUrl = resolveFileUrl(document.download_url ?? document.file_url ?? null);
            return (
              <div key={document.id} className="rounded-2xl border border-[#EAECF0] dark:border-slate-800 bg-[#FCFCFD] dark:bg-slate-900 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF8E1] text-[#7A1C1C]">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[#101828] dark:text-slate-100">{formatDisplayLabel(document.document_type ?? 'document')}</p>
                    <p className="mt-1 truncate text-sm text-[#667085] dark:text-slate-300">{document.file_name ?? 'Uploaded document'}</p>
                    <p className="mt-1 text-xs text-[#667085] dark:text-slate-400">Uploaded {formatDate(document.created_at)}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {fileUrl ? <Button type="button" variant="outline" size="sm" onClick={() => onViewDocument({ title: formatDisplayLabel(document.document_type ?? 'document'), url: fileUrl, fileName: document.file_name })}>View document</Button> : null}
                      {document.verification_status ? <StatusBadge value={document.verification_status} /> : null}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#EAECF0] dark:border-slate-800 bg-[#FCFCFD] dark:bg-slate-900 p-4 text-sm text-[#667085] dark:text-slate-300">No KYC documents uploaded yet.</div>
      )}

      {missingDocuments.length ? (
        <p className="text-sm text-[#B42318]">Missing: {missingDocuments.map((item) => formatDisplayLabel(item)).join(', ')}</p>
      ) : null}
    </div>
  );
}


function formatUserSummary(user?: UserResource | null) {
  if (!user) return '—';
  return (
    <div className="space-y-1">
      <p className="font-semibold text-[#101828]">{user.name || 'Unnamed user'}</p>
      <p className="text-sm text-[#667085] dark:text-slate-300">{user.email || 'No email provided'}</p>
      <p className="text-sm text-[#667085] dark:text-slate-300">{user.phone || 'No phone'} • {user.status || 'No status'}</p>
    </div>
  );
}

function formatAssociationSummary(association?: AssociationResource | null) {
  if (!association) return '—';
  return (
    <div className="space-y-1">
      <p className="font-semibold text-[#101828]">{association.name}</p>
      <p className="text-sm text-[#667085] dark:text-slate-300">{association.code || 'No code'} • {association.contact_email || 'No email'}</p>
      <p className="text-sm text-[#667085] dark:text-slate-300">{association.contact_phone || 'No phone'}</p>
    </div>
  );
}

function renderApplicationDetail(application: MemberApplicationResource) {
  return (
    <div className="space-y-5">
      <StatusHelperGrid
        items={[
          {
            label: 'Application status',
            value: <StatusBadge value={application.application_status} label={application.application_status_label} />,
            helper: 'Review state • Current application decision',
          },
          {
            label: 'Submission stage',
            value: application.submission_stage_label ?? application.submission_stage ?? '—',
            helper: 'Progress state • Current applicant completion stage',
          },
          {
            label: 'Diaspora applicant',
            value: application.diaspora_label ?? (application.is_diaspora ? 'Yes' : 'No'),
            helper: 'Residency context • Cross-border application flag',
          },
        ]}
        columns={3}
      />
      <DetailGrid
        items={[
          { label: 'Application ID', value: application.external_id ?? `#${application.id}` },
          { label: 'Applicant type', value: application.applicant_type_label ?? application.applicant_type ?? '—' },
          { label: 'Nationality', value: application.nationality ?? '—' },
          { label: 'Country of residence', value: application.country_of_residence ?? '—' },
          { label: 'Submitted on', value: formatDate(application.submitted_at) },
          { label: 'Reviewed on', value: formatDate(application.reviewed_at) },
          { label: 'Created on', value: formatDate(application.created_at) },
          { label: 'User', value: formatUserSummary(application.user) },
          { label: 'Association', value: formatAssociationSummary(application.association) },
        ]}
      />
      <div className="space-y-3">
        <h3 className="text-[16px] font-semibold text-[#101828] dark:text-slate-100">Supporting documents</h3>
        <p className="text-sm text-[#667085] dark:text-slate-300">
          Identity, address, and other files supplied with this application. Use preview or download to review.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {(application.documents ?? []).length ? (
            (application.documents ?? []).map((document) => (
              <FileCard
                key={document.id}
                title={document.file_name ?? document.document_type ?? 'Application document'}
                subtitle={`${document.document_type ?? 'Document'} · ${formatFileSize(document.file_size)} · ${formatDate(document.created_at)}`}
                fileUrl={document.file_url}
                downloadUrl={document.download_url}
              />
            ))
          ) : (
            <div className="rounded-md border border-dashed border-[#D0D5DD] bg-[#FCFCF7] px-4 py-6 text-sm text-[#6B788E] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              No supporting documents on file.
            </div>
          )}
        </div>
      </div>
      {application.notes ? (
        <div className="rounded-2xl border border-[#EAECF0] dark:border-slate-800 bg-white dark:bg-slate-950 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#667085] dark:text-slate-300">Notes</p>
          <p className="mt-2 text-sm leading-7 text-[#344054] dark:text-slate-200">{application.notes}</p>
        </div>
      ) : null}
    </div>
  );
}

function renderMemberDetail(member: MemberProfileResource) {
  return (
    <div className="space-y-5">
      <StatusHelperGrid
        items={[
          {
            label: 'Approval',
            value: <StatusBadge value={member.approval_status} />,
            helper: 'Membership state • Current approval outcome',
          },
          {
            label: 'Account',
            value: <StatusBadge value={member.user?.status ?? member.approval_status} />,
            helper: 'Access state • Current member account availability',
          },
        ]}
      />
      <DetailGrid
        items={[
          { label: 'Member code', value: member.member_code ?? `#${member.member_id}` },
          { label: 'Member type', value: member.member_type ?? '—' },
          { label: 'Joined on', value: formatDate(member.joined_at) },
          { label: 'Activated on', value: formatDate(member.activated_at) },
          { label: 'Created on', value: formatDate(member.created_at) },
          { label: 'User', value: formatUserSummary(member.user) },
          { label: 'Association', value: formatAssociationSummary(member.association) },
          { label: 'Occupation', value: member.profile?.occupation ?? '—' },
          { label: 'Publisher name', value: member.profile?.publisher_name ?? '—' },
          { label: 'Corporate name', value: member.profile?.corporate_name ?? '—' },
          {
            label: 'Residential address',
            value: [
              member.profile?.residential_address_line_1,
              member.profile?.residential_address_line_2,
              member.profile?.city,
              member.profile?.state,
              member.profile?.country,
              member.profile?.postal_code,
            ].filter(Boolean).join(', ') || '—',
          },
        ]}
      />
    </div>
  );
}

function renderInstitutionDetail(institution: InstitutionProfileResource) {
  return (
    <div className="space-y-5">
      <StatusHelperGrid
        items={[
          {
            label: 'Onboarding',
            value: <StatusBadge value={institution.onboarding_status} label={institution.onboarding_status_label} />,
            helper: 'Registration state • Current onboarding progress',
          },
          {
            label: 'Account',
            value: <StatusBadge value={institution.account_status} label={institution.account_status_label} />,
            helper: 'Access state • Current institution availability',
          },
          {
            label: 'Governance',
            value: <StatusBadge value={institution.governance_status} label={institution.governance_status_label} />,
            helper: 'Compliance state • Latest governance visibility',
          },
        ]}
        columns={3}
      />
      <DetailGrid
        items={[
          { label: 'Institution name', value: institution.name },
          { label: 'Institution type', value: institution.institution_type_label ?? institution.institution_type ?? '—' },
          { label: 'Registration number', value: institution.registration_number ?? '—' },
          { label: 'Licence ID', value: institution.licence_id ?? '—' },
          { label: 'Contact person', value: institution.contact_person_name ?? '—' },
          { label: 'Contact title', value: institution.contact_person_title ?? '—' },
          { label: 'Email address', value: institution.email ?? '—' },
          { label: 'Phone number', value: institution.phone ?? '—' },
          {
            label: 'Address',
            value: [
              institution.address?.address_line_1,
              institution.address?.address_line_2,
              institution.address?.city_name ?? institution.address?.city,
              institution.address?.state_name ?? institution.address?.state,
              institution.address?.country,
              institution.address?.postal_code,
            ].filter(Boolean).join(', ') || '—',
          },
        ]}
      />
    </div>
  );
}

export function AdminMembershipPage({ initialTab = 'members', institutionOnly = false }: { initialTab?: Tab; institutionOnly?: boolean }) {
  const location = useLocation();
  const isSuperAdminPortal = location.pathname.startsWith('/super-admin');
  const defaultTab = institutionOnly ? 'institutions' : isSuperAdminPortal ? 'members' : initialTab;
  const { tab: urlTab, page, search, status, dateFrom, dateTo, setTab: setUrlTab, setPage, setSearch, setStatus, setDateFrom, setDateTo, resetFilters } = useListUrlState({ defaultTab });
  const normalizedUrlTab = isSuperAdminPortal && !institutionOnly && urlTab === 'institutions' ? 'members' : urlTab;
  const tab = (normalizedUrlTab || defaultTab) as Tab;
  const [perPage, setPerPageState] = useState(DEFAULT_PAGE_SIZE);
  const setPerPage = useCallback(
    (next: number) => {
      setPerPageState(normalizeClientPageSize(next));
      setPage(1);
    },
    [setPage],
  );
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [institutionAction, setInstitutionAction] = useState<InstitutionAction>(null);
  const [documentLightbox, setDocumentLightbox] = useState<{ title: string; url: string; fileName?: string | null } | null>(null);
  const [applicationAction, setApplicationAction] = useState<ApplicationAction>(null);
  const [associationId, setAssociationId] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const parsedAssociationId = associationId ? Number(associationId) : undefined;
  const associationFilterId = parsedAssociationId && parsedAssociationId > 0 ? parsedAssociationId : undefined;

  const associationsForFilterQuery = useQuery({
    queryKey: [...queryKeys.adminAssociations, 'membership-filter'],
    queryFn: async () => listAdminAssociations({ page: 1, per_page: 100 }),
    enabled: !institutionOnly && (tab === 'members' || tab === 'applications'),
  });

  const associationFilterOptions = useMemo(() => {
    const rows = associationsForFilterQuery.data?.data ?? [];
    return [
      { label: 'All associations', value: '' },
      ...rows.map((a) => ({ label: a.name, value: String(a.id) })),
    ];
  }, [associationsForFilterQuery.data?.data]);

  const tabs = useMemo(() => (
    institutionOnly
      ? [{ key: 'institutions' as const, label: 'Institutions' }]
      : isSuperAdminPortal
        ? [
            { key: 'members' as const, label: 'Members' },
            { key: 'applications' as const, label: 'Member applications' },
          ]
        : [
            { key: 'members' as const, label: 'Members' },
            { key: 'applications' as const, label: 'Member applications' },
          ]
  ), [institutionOnly, isSuperAdminPortal]);

  const appsQuery = usePaginatedList({
    queryKey: [...queryKeys.adminMemberApps, page, perPage, search, status, dateFrom, dateTo, associationId],
    queryFn: listAdminMemberApplications,
    params: {
      page,
      per_page: perPage,
      search: search || undefined,
      status: status || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      association_id: associationFilterId,
    },
    enabled: !institutionOnly && tab === 'applications',
  });
  const membersQuery = usePaginatedList({
    queryKey: [...queryKeys.adminMembers, page, perPage, search, status, dateFrom, dateTo, associationId],
    queryFn: listAdminMembers,
    params: {
      page,
      per_page: perPage,
      search: search || undefined,
      approval_status: status || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      association_id: associationFilterId,
    },
    enabled: !institutionOnly && tab === 'members',
  });
  const institutionsQuery = usePaginatedList({ queryKey: [...queryKeys.adminInstitutions, page, perPage, search, status, dateFrom, dateTo], queryFn: listAdminInstitutions, params: { page, per_page: perPage, search: search || undefined, status: status || undefined, date_from: dateFrom || undefined, date_to: dateTo || undefined }, enabled: tab === 'institutions' });

  const appDetailQuery = useQuery({ queryKey: queryKeys.adminMemberApp(selectedId), queryFn: async () => getAdminMemberApplication(selectedId as number), enabled: !institutionOnly && tab === 'applications' && Boolean(selectedId) && modalOpen });
  const memberDetailQuery = useQuery({ queryKey: queryKeys.adminMember(selectedId), queryFn: async () => getAdminMember(selectedId as number), enabled: !institutionOnly && tab === 'members' && Boolean(selectedId) && modalOpen });
  const institutionDetailQuery = useQuery({ queryKey: queryKeys.adminInstitution(selectedId), queryFn: async () => getAdminInstitution(selectedId as number), enabled: tab === 'institutions' && Boolean(selectedId) && modalOpen });
  const memberTimelineQuery = useQuery({ queryKey: queryKeys.adminMemberTimeline(selectedId), queryFn: async () => listAdminTimeline('member', selectedId as number, { page: 1, per_page: 8 }), enabled: tab === 'members' && Boolean(selectedId) && modalOpen });
  const institutionTimelineQuery = useQuery({ queryKey: queryKeys.adminInstitutionTimeline(selectedId), queryFn: async () => listAdminTimeline('institution', selectedId as number, { page: 1, per_page: 8 }), enabled: tab === 'institutions' && Boolean(selectedId) && modalOpen });

  const currentRows = tab === 'applications' ? appsQuery.data?.data ?? [] : tab === 'members' ? membersQuery.data?.data ?? [] : institutionsQuery.data?.data ?? [];
  const meta = tab === 'applications' ? appsQuery.data?.meta : tab === 'members' ? membersQuery.data?.meta : institutionsQuery.data?.meta;
  const detailData = tab === 'applications' ? appDetailQuery.data?.data : tab === 'members' ? memberDetailQuery.data?.data : institutionDetailQuery.data?.data;
  const institutionDetail = tab === 'institutions' ? (detailData as InstitutionProfileResource | undefined) : undefined;
  const approvalBlockedMessage = institutionApprovalBlockedMessage(institutionDetail);

  const handleApproveInstitutionClick = () => {
    if (approvalBlockedMessage) {
      toast.error(approvalBlockedMessage);
      return;
    }

    setInstitutionAction('approve');
  };

  const actionSuccess = async (message: string) => {
    showAdminActionSuccess(message);
    await Promise.all([institutionsQuery.refetch(), institutionDetailQuery.refetch(), institutionTimelineQuery.refetch()]);
    setInstitutionAction(null);
  };

  const approveMutation = useMutation({
    mutationFn: async (institution: InstitutionProfileResource) => {
      const confirmed = await confirmAdminSensitiveAction({ title: 'Confirm institution approval', description: 'Approving this institution updates a protected admin workflow.', confirmLabel: 'Approve institution' });
      if (!confirmed) throw new Error('Security confirmation cancelled.');
      return approveAdminInstitution(institution.id);
    },
    onSuccess: async (response) => actionSuccess(response.message),
    onError: (error) => showAdminActionError(error, 'The institution action could not be completed.'),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ institution, reason }: { institution: InstitutionProfileResource; reason?: string }) => {
      const confirmed = await confirmAdminSensitiveAction({ title: 'Confirm institution rejection', description: 'Rejecting this institution will record the action and any supplied reason in security and audit activity.', confirmLabel: 'Reject institution' });
      if (!confirmed) throw new Error('Security confirmation cancelled.');
      return rejectAdminInstitution(institution.id, { reason });
    },
    onSuccess: async (response) => actionSuccess(response.message),
    onError: (error) => showAdminActionError(error, 'The institution action could not be completed.'),
  });

  const deactivateMutation = useMutation({
    mutationFn: async ({ institution, reason }: { institution: InstitutionProfileResource; reason?: string }) => {
      const confirmed = await confirmAdminSensitiveAction({ title: 'Confirm institution deactivation', description: 'Deactivating this institution is protected because it affects active access and operational state.', confirmLabel: 'Deactivate institution' });
      if (!confirmed) throw new Error('Security confirmation cancelled.');
      return deactivateAdminInstitution(institution.id, { reason });
    },
    onSuccess: async (response) => actionSuccess(response.message),
    onError: (error) => showAdminActionError(error, 'The institution action could not be completed.'),
  });

  const reactivateMutation = useMutation({
    mutationFn: async ({ institution, reason }: { institution: InstitutionProfileResource; reason?: string }) => {
      const confirmed = await confirmAdminSensitiveAction({ title: 'Confirm institution reactivation', description: 'Reactivating this institution restores access and should be confirmed before continuing.', confirmLabel: 'Reactivate institution' });
      if (!confirmed) throw new Error('Security confirmation cancelled.');
      return reactivateAdminInstitution(institution.id, { reason });
    },
    onSuccess: async (response) => actionSuccess(response.message),
    onError: (error) => showAdminActionError(error, 'The institution action could not be completed.'),
  });

  const closeRecordModal = useCallback(() => {
    setModalOpen(false);
    setSelectedId(null);
  }, []);

  const approveApplicationMutation = useMutation({
    mutationFn: async (application: MemberApplicationResource) => {
      return approveAdminMemberApplication(application.id);
    },
    onSuccess: async (response) => {
      showAdminActionSuccess(response.message);
      setApplicationAction(null);
      await appsQuery.refetch();
      closeRecordModal();
    },
    onError: (error) => showAdminActionError(error, 'The application action could not be completed.'),
  });

  const rejectApplicationMutation = useMutation({
    mutationFn: async ({ application, reason }: { application: MemberApplicationResource; reason?: string }) => {
      return rejectAdminMemberApplication(application.id, { reason: reason ?? '' });
    },
    onSuccess: async (response) => {
      showAdminActionSuccess(response.message);
      setApplicationAction(null);
      await appsQuery.refetch();
      closeRecordModal();
    },
    onError: (error) => showAdminActionError(error, 'The application action could not be completed.'),
  });

  const requestChangesApplicationMutation = useMutation({
    mutationFn: async ({ application, comment }: { application: MemberApplicationResource; comment?: string }) => {
      return requestChangesAdminMemberApplication(application.id, { comment: comment ?? '' });
    },
    onSuccess: async (response) => {
      showAdminActionSuccess(response.message);
      setApplicationAction(null);
      await appsQuery.refetch();
      closeRecordModal();
    },
    onError: (error) => showAdminActionError(error, 'The application action could not be completed.'),
  });

  function openModal(id: number) {
    setSelectedId(id);
    setModalOpen(true);
  }

  const institutionIsActive = institutionDetail?.account_status === 'active';
  const institutionIsApproved = institutionDetail?.onboarding_status === 'approved';
  const tabHelperText = tab === 'applications'
    ? 'Review incoming applications, open a row for decision details, and keep applicant progression visible while you act.'
    : tab === 'members'
      ? 'Inspect approved member records, open a row for account context, and export the current directory when needed.'
      : 'Review institutions with standardized status actions and recent activity history.';
  const searchPlaceholder = tab === 'applications'
    ? 'Search applications by applicant, email, or reference'
    : tab === 'members'
      ? 'Search members by name, code, or email'
      : 'Search institutions by name, email, or licence ID';
  const countSubject = tab === 'applications' ? 'applications' : tab === 'members' ? 'members' : 'institutions';
  const countHelper = tab === 'applications'
    ? `${meta?.total ?? 0} application records in the current review queue`
    : tab === 'members'
      ? `${meta?.total ?? 0} approved member records in the current directory`
      : `${meta?.total ?? 0} institution records in the current operations view`;

  return (
    <div className="space-y-6">
      <SectionHeader
        title={tab === 'institutions' ? 'Institutions' : 'Members'}
        description={tab === 'institutions' ? 'Institution directory and status.' : 'Applications and approved members.'}
        action={tab !== 'applications' ? (
          <Button
            variant="outline"
            disabled={isExporting}
            onClick={async () => {
              try {
                setIsExporting(true);
                const response = tab === 'members'
                  ? await downloadAdminMembersExport({
                      search: search || undefined,
                      approval_status: status || undefined,
                      association_id: associationFilterId,
                      date_from: dateFrom || undefined,
                      date_to: dateTo || undefined,
                    })
                  : await downloadAdminInstitutionsExport({ search: search || undefined, account_status: status || undefined, date_from: dateFrom || undefined, date_to: dateTo || undefined });
                triggerBlobDownload(response.blob, response.filename);
                showAdminExportSuccess(tab === 'members' ? 'Members' : 'Institutions');
              } catch {
                showAdminExportError(tab === 'members' ? 'Members' : 'Institutions');
              } finally {
                setIsExporting(false);
              }
            }}
          >
            {isExporting ? 'Exporting…' : 'Export CSV'}
          </Button>
        ) : undefined}
      />

      {!institutionOnly ? (
        <div className="flex flex-wrap gap-2 border-b border-[#EAECF0] dark:border-slate-800">
          {tabs.map((item) => (
            <button
              key={item.key}
              onClick={() => {
                setSelectedId(null);
                setModalOpen(false);
                setPage(1);
                setSearch('');
                setStatus('');
                setAssociationId('');
                setDateFrom('');
                setDateTo('');
                setUrlTab(item.key);
              }}
              className={tab === item.key ? 'border-b-2 border-[#6A1025] px-3 py-3 text-base font-semibold text-[#6A1025]' : 'px-3 py-3 text-base font-medium text-[#667085] dark:text-slate-300'}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
      {tab !== 'institutions' ? <p className="text-sm text-[#667085] dark:text-slate-300">{tabHelperText}</p> : null}
      <ListCountSummary meta={meta} subject={countSubject} helper={countHelper} />

      <div className="flex flex-col gap-3">
        <SearchFilterBar
          search={search}
          onSearchChange={setSearch}
          status={status}
          onStatusChange={setStatus}
          searchPlaceholder={searchPlaceholder}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          onReset={() => {
            resetFilters();
            setAssociationId('');
          }}
        />
        {tab === 'members' || tab === 'applications' ? (
          <div className="flex flex-wrap items-center gap-3 rounded-md border border-[#EAECF0] bg-white p-3 panel-shadow dark:border-slate-800 dark:bg-slate-950">
            <label className="flex min-w-[240px] flex-1 flex-col gap-2 text-sm font-medium text-[#344054] dark:text-slate-200 sm:max-w-sm">
              Association
              <select
                value={associationId}
                onChange={(event) => {
                  setAssociationId(event.target.value);
                  setPage(1);
                }}
                disabled={associationsForFilterQuery.isLoading}
                className="h-12 w-full rounded-md border border-[#222222] bg-white px-4 text-base dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 disabled:opacity-60"
              >
                {associationFilterOptions.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}
      </div>

      {tab === 'applications' ? <DataTable columns={[
        { key: 'applicant', header: 'Applicant', render: (row: MemberApplicationResource) => <div><p className="font-semibold">{row.user?.name ?? row.user?.email ?? '—'}</p><p className="mt-1 text-sm text-[#6B788E] dark:text-slate-300">{row.user?.email ?? 'No email'}{row.user?.phone ? ` • ${row.user.phone}` : ''}</p></div> },
        { key: 'id', header: 'Application ID', render: (row: MemberApplicationResource) => <div><p className="font-semibold">{row.external_id ?? `#${row.id}`}</p><p className="mt-1 text-sm text-[#6B788E] dark:text-slate-300">{[row.applicant_type_label ?? row.applicant_type ?? null, row.submission_stage_label ?? row.submission_stage ?? null, row.diaspora_label].filter(Boolean).join(' • ') || 'No stage available'}</p></div> },
        { key: 'type', header: 'Type', render: (row: MemberApplicationResource) => row.applicant_type_label ?? row.applicant_type ?? '—' },
        { key: 'association', header: 'Association', render: (row: MemberApplicationResource) => row.association?.name ?? '—' },
        { key: 'status', header: 'Status', render: (row: MemberApplicationResource) => <StatusBadge value={row.application_status} label={row.application_status_label} /> },
      ]} rows={currentRows as MemberApplicationResource[]} isLoading={appsQuery.isLoading} loadingTitle="Loading member applications" loadingDescription="The latest applications are being fetched from the backend." onRowClick={(row) => openModal((row as MemberApplicationResource).id)} selectedRowKey={tab === 'applications' ? selectedId ?? undefined : undefined} getRowKey={(row) => (row as MemberApplicationResource).id} /> : null}

      {tab === 'members' ? <DataTable columns={[
        { key: 'code', header: 'Member', render: (row: MemberProfileResource) => <MemberIdentityCell member={row} /> },
        { key: 'type', header: 'Type', render: (row: MemberProfileResource) => row.member_type === 'author' ? 'Author' : 'Publisher' },
        { key: 'approval', header: 'Approval', render: (row: MemberProfileResource) => <StatusBadge value={row.approval_status} /> },
        { key: 'status', header: 'Account', render: (row: MemberProfileResource) => <StatusBadge value={row.user?.status ?? row.approval_status} /> },
      ]} rows={currentRows as MemberProfileResource[]} isLoading={membersQuery.isLoading} loadingTitle="Loading members" loadingDescription="The latest member records are being fetched from the backend." onRowClick={(row) => openModal((row as MemberProfileResource).member_id)} selectedRowKey={tab === 'members' ? selectedId ?? undefined : undefined} getRowKey={(row) => (row as MemberProfileResource).member_id} /> : null}

      {tab === 'institutions' ? <DataTable columns={[
        { key: 'name', header: 'Institution', render: (row: InstitutionProfileResource) => <InstitutionIdentityCell institution={row} /> },
        { key: 'onboarding', header: 'Onboarding', render: (row: InstitutionProfileResource) => <StatusBadge value={row.onboarding_status} /> },
        { key: 'account', header: 'Account', render: (row: InstitutionProfileResource) => <StatusBadge value={row.account_status} /> },
        { key: 'governance', header: 'Governance', render: (row: InstitutionProfileResource) => <StatusBadge value={row.governance_status} /> },
      ]} rows={currentRows as InstitutionProfileResource[]} isLoading={institutionsQuery.isLoading} loadingTitle="Loading institutions" loadingDescription="The latest institution records are being fetched from the backend." onRowClick={(row) => openModal((row as InstitutionProfileResource).id)} selectedRowKey={tab === 'institutions' ? selectedId ?? undefined : undefined} getRowKey={(row) => (row as InstitutionProfileResource).id} /> : null}

      <PaginationBar meta={meta} onPageChange={setPage} subject={countSubject} perPage={perPage} onPerPageChange={setPerPage} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={tab === 'applications' ? 'Member application details' : tab === 'members' ? 'Member details' : 'Institution details'} subtitle="">
        {detailData ? (
          <div className="space-y-5">
            {tab === 'applications' ? (
              <div className="space-y-4">
                {renderApplicationDetail(detailData as MemberApplicationResource)}
                {(detailData as MemberApplicationResource).application_status === 'submitted' ? (
                  <div className="rounded-2xl border border-[#EAECF0] p-4">
                    <p className="text-sm font-semibold text-[#101828]">Admin final decision</p>
                    <p className="mt-1 text-sm text-[#667085]">Association affiliation has been reviewed. Complete the final member application decision.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button className={approvalActionButtonClass} onClick={() => setApplicationAction('approve')}>Approve application</Button>
                      <Button variant="outline" onClick={() => setApplicationAction('request_changes')}>Request changes</Button>
                      <Button variant="destructive" onClick={() => setApplicationAction('reject')}>Reject application</Button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
            {tab === 'members' ? (
              <div className="space-y-5">
                {renderMemberDetail(detailData as MemberProfileResource)}
                <ActivityTimeline items={memberTimelineQuery.data?.data} isLoading={memberTimelineQuery.isLoading} emptyTitle="No member timeline yet" />
              </div>
            ) : null}
            {tab === 'institutions' ? (
              <div className="space-y-5">
                <div className="space-y-3 rounded-2xl border border-[#EAECF0] dark:border-slate-800 bg-[#FCFCFD] p-4">
                  {institutionDetail ? <InstitutionLogoPanel institution={institutionDetail} /> : null}
                  <div>
                    <p className="text-sm font-semibold text-[#101828]">Institution actions</p>
                     
                    {approvalBlockedMessage ? <p className="mt-2 rounded-xl border border-[#FEE4E2] bg-[#FFFBFA] px-3 py-2 text-sm font-medium text-[#B42318] dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">{approvalBlockedMessage}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {!institutionIsActive ? <Button onClick={() => setInstitutionAction('reactivate')} disabled={reactivateMutation.isPending}>Reactivate institution</Button> : null}
                    {institutionDetail?.onboarding_status !== 'approved' ? <Button className={approvalActionButtonClass} onClick={handleApproveInstitutionClick} disabled={approveMutation.isPending}>Approve institution</Button> : null}
                    {institutionDetail?.onboarding_status !== 'rejected' ? <Button variant="outline" onClick={() => setInstitutionAction('reject')} disabled={rejectMutation.isPending || institutionIsApproved}>Reject institution</Button> : null}
                    {institutionIsActive ? <Button variant="destructive" onClick={() => setInstitutionAction('deactivate')} disabled={deactivateMutation.isPending}>Deactivate institution</Button> : null}
                  </div>
                </div>
                {renderInstitutionDetail(detailData as InstitutionProfileResource)}
                <ActivityTimeline items={institutionTimelineQuery.data?.data} isLoading={institutionTimelineQuery.isLoading} emptyTitle="No institution timeline yet" />
                <InstitutionKycDocumentsPanel institution={detailData as InstitutionProfileResource} onViewDocument={setDocumentLightbox} />
              </div>
            ) : null}
          </div>
        ) : <DetailPanelState mode="loading" title="Loading record" description="Please wait…preparing selected resource." />}
      </Modal>

      <LightboxModal
        open={Boolean(documentLightbox)}
        onClose={() => setDocumentLightbox(null)}
        title={documentLightbox?.title ?? 'Document preview'}
        url={documentLightbox?.url ?? null}
        fileName={documentLightbox?.fileName}
      />

      <ActionDialog open={institutionAction === 'approve'} onClose={() => setInstitutionAction(null)} title="Approve institution" description="Approve this institution and activate its onboarding status." actionLabel="Approve institution" onConfirm={() => { if (institutionDetail) approveMutation.mutate(institutionDetail); }} isSubmitting={approveMutation.isPending} />
      <ActionDialog open={institutionAction === 'reject'} onClose={() => setInstitutionAction(null)} title="Reject institution" description="Reject this institution and record a reason for the decision." actionLabel="Reject institution" actionVariant="destructive" showReason onConfirm={(reason) => { if (institutionDetail) rejectMutation.mutate({ institution: institutionDetail, reason }); }} isSubmitting={rejectMutation.isPending} />
      <ActionDialog open={institutionAction === 'deactivate'} onClose={() => setInstitutionAction(null)} title="Deactivate institution" description="Deactivate this institution account and capture a governance reason." actionLabel="Deactivate institution" actionVariant="destructive" showReason onConfirm={(reason) => { if (institutionDetail) deactivateMutation.mutate({ institution: institutionDetail, reason }); }} isSubmitting={deactivateMutation.isPending} />
      <ActionDialog open={institutionAction === 'reactivate'} onClose={() => setInstitutionAction(null)} title="Reactivate institution" description="Restore institution access and clear the current deactivation state." actionLabel="Reactivate institution" showReason onConfirm={(reason) => { if (institutionDetail) reactivateMutation.mutate({ institution: institutionDetail, reason }); }} isSubmitting={reactivateMutation.isPending} />
      <ActionDialog open={applicationAction === 'approve'} onClose={() => setApplicationAction(null)} title="Approve member application" description="Approve this member application and activate the member account." actionLabel="Approve application" onConfirm={() => { if (appDetailQuery.data?.data) approveApplicationMutation.mutate(appDetailQuery.data.data); }} isSubmitting={approveApplicationMutation.isPending} />
      <ActionDialog open={applicationAction === 'request_changes'} onClose={() => setApplicationAction(null)} title="Request changes" description="Request updates from the member before final approval." actionLabel="Request changes" showReason onConfirm={(comment) => { if (appDetailQuery.data?.data) requestChangesApplicationMutation.mutate({ application: appDetailQuery.data.data, comment }); }} isSubmitting={requestChangesApplicationMutation.isPending} />
      <ActionDialog open={applicationAction === 'reject'} onClose={() => setApplicationAction(null)} title="Reject member application" description="Reject this member application with a reason." actionLabel="Reject application" actionVariant="destructive" showReason requireReason onConfirm={(reason) => { if (appDetailQuery.data?.data) rejectApplicationMutation.mutate({ application: appDetailQuery.data.data, reason }); }} isSubmitting={rejectApplicationMutation.isPending} />
    </div>
  );
}
