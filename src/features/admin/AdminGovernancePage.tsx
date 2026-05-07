import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Building2, Landmark } from 'lucide-react';
import { DEFAULT_PAGE_SIZE, normalizeClientPageSize } from '@/constants/pagination';
import { useListUrlState } from '@/hooks/useListUrlState';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ActionDialog } from '@/components/shared/ActionDialog';
import { ActivityTimeline } from '@/components/shared/ActivityTimeline';
import { DataTable } from '@/components/shared/DataTable';
import { DetailPanelState } from '@/components/shared/DetailPanelState';
import { DetailGrid } from '@/components/shared/DetailGrid';
import { Modal } from '@/components/shared/Modal';
import { PaginationBar } from '@/components/shared/PaginationBar';
import { ResourceInspector } from '@/components/shared/ResourceInspector';
import { SearchFilterBar } from '@/components/shared/SearchFilterBar';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { successActionButtonClass, warningActionButtonClass } from '@/components/shared/tableActionStyles';
import { StatCard } from '@/components/shared/StatCard';
import {
  disableAdminAssociation,
  downloadAdminAssociationsExport,
  enableAdminAssociation,
  getAdminAssociation,
  getAdminInstitution,
  listAdminAssociations,
  listAdminDeclarations,
  listAdminInstitutions,
  listAdminInvoices,
  listAdminMemberApplications,
  listAdminTimeline,
  uploadAdminAssociationLogo,
} from '@/features/admin/api';
import { confirmAdminSensitiveAction } from '@/features/admin/security';
import { showAdminActionError, showAdminActionSuccess, showAdminExportError, showAdminExportSuccess } from '@/features/admin/action-feedback';
import { triggerBlobDownload } from '@/utils/download';
import { resolveFileUrl } from '@/utils/fileUrl';
import { formatCurrency, formatDate } from '@/utils/format';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { cn } from '@/utils/cn';
import { queryKeys } from '@/lib/queryKeys';
import type { AssociationResource, InstitutionAnnualDeclarationResource, InstitutionProfileResource, InvoiceResource, MemberApplicationResource } from '@/types/domain';

type GovernanceTab = 'institution' | 'association';

function usePortalBasePath(): '/admin' | '/super-admin' {
  const { pathname } = useLocation();
  return pathname.startsWith('/super-admin') ? '/super-admin' : '/admin';
}

function GovernanceSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#EAECF0]/90 bg-gradient-to-br from-[#FCFCFD] to-white p-5 shadow-sm dark:border-slate-800 dark:from-slate-950 dark:to-slate-900/80">
      <div className="mb-4 flex flex-col gap-1 border-b border-border/80 pb-3 dark:border-slate-800">
        <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-[#6A1025] dark:text-rose-300">{title}</h3>
        {description ? <p className="text-sm leading-relaxed text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function SummaryMetric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border/80 bg-card px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function AssociationLogoBlock({ association, compact = false }: { association: AssociationResource; compact?: boolean }) {
  const logoUrl = resolveFileUrl(association.logo_medium_url ?? association.logo_url ?? association.logo_thumb_url ?? null);
  const initials = (association.name || 'Association').split(' ').map((part) => part.charAt(0)).join('').slice(0, 2).toUpperCase();
  const sizeClass = compact ? 'h-11 w-11 rounded-xl text-sm' : 'h-20 w-20 rounded-2xl text-xl';

  return (
    <div className={compact ? 'flex items-center gap-3' : 'flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-4 dark:border-slate-800 dark:bg-slate-950'}>
      <div className={`flex shrink-0 items-center justify-center overflow-hidden border border-border bg-muted/40 font-semibold text-muted-foreground dark:border-slate-800 ${sizeClass}`}>
        {logoUrl ? <img src={logoUrl} alt={`${association.name} logo`} className="h-full w-full object-cover" /> : initials}
      </div>
      {!compact ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Association</p>
          <p className="mt-1 text-base font-semibold text-foreground">{association.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">{[association.code || 'No code', association.type_label ?? association.type ?? 'Type'].join(' • ')}</p>
        </div>
      ) : null}
    </div>
  );
}

function InstitutionLogoBlock({ institution, compact = false }: { institution: InstitutionProfileResource; compact?: boolean }) {
  const logoUrl = resolveFileUrl(institution.logo_medium_url ?? institution.logo_url ?? institution.logo_thumb_url ?? null);
  const initials = (institution.name || 'Institution').split(' ').map((part) => part.charAt(0)).join('').slice(0, 2).toUpperCase();
  const sizeClass = compact ? 'h-11 w-11 rounded-xl text-sm' : 'h-20 w-20 rounded-2xl text-xl';

  return (
    <div className={compact ? 'flex items-center gap-3' : 'flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-4 dark:border-slate-800 dark:bg-slate-950'}>
      <div className={`flex shrink-0 items-center justify-center overflow-hidden border border-border bg-muted/40 font-semibold text-muted-foreground dark:border-slate-800 ${sizeClass}`}>
        {logoUrl ? <img src={logoUrl} alt={`${institution.name} logo`} className="h-full w-full object-cover" /> : initials}
      </div>
      {!compact ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Institution</p>
          <p className="mt-1 text-base font-semibold text-foreground">{institution.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">{[institution.institution_type_label ?? institution.institution_type, institution.licence_id ? `Licence ${institution.licence_id}` : 'No licence id'].join(' • ')}</p>
        </div>
      ) : null}
    </div>
  );
}

function KycReadinessPanel({
  kycReadiness,
  profileCompleteness,
}: {
  kycReadiness: InstitutionProfileResource['kyc_readiness'];
  profileCompleteness: InstitutionProfileResource['profile_completeness'];
}) {
  const complete = kycReadiness?.is_complete ?? profileCompleteness?.is_complete ?? false;
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <SummaryMetric label="KYC package" value={complete ? 'Complete' : 'Incomplete'} hint={kycReadiness ? `${kycReadiness.submitted_documents?.length ?? 0} of ${kycReadiness.required_documents?.length ?? 0} required types on file` : 'Awaiting document metadata'} />
      <SummaryMetric label="Profile fields" value={profileCompleteness ? `${profileCompleteness.percentage}%` : '—'} hint={profileCompleteness ? `${profileCompleteness.completed_fields}/${profileCompleteness.total_fields} fields` : 'Completeness not reported'} />
      <SummaryMetric label="Outstanding proofs" value={kycReadiness?.missing_documents?.length ? String(kycReadiness.missing_documents.length) : '0'} hint={kycReadiness?.missing_documents?.length ? kycReadiness.missing_documents.slice(0, 3).join(', ') : 'No missing document types'} />
    </div>
  );
}

function DocumentsTable({ documents }: { documents: NonNullable<InstitutionProfileResource['kyc_documents']> }) {
  if (!documents.length) {
    return <p className="text-sm text-muted-foreground">No KYC documents uploaded yet.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-border dark:border-slate-800">
      <table className="min-w-full divide-y divide-border text-sm dark:divide-slate-800">
        <thead>
          <tr className="bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground dark:bg-slate-900/80">
            <th className="px-3 py-2">Type</th>
            <th className="px-3 py-2">File</th>
            <th className="px-3 py-2">Verification</th>
            <th className="px-3 py-2">Uploaded</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border dark:divide-slate-800">
          {documents.map((doc) => (
            <tr key={doc.id} className="bg-card dark:bg-slate-950/40">
              <td className="px-3 py-2 font-medium text-foreground">{doc.document_type ?? '—'}</td>
              <td className="px-3 py-2 text-muted-foreground">{doc.file_name ?? '—'}</td>
              <td className="px-3 py-2"><StatusBadge value={doc.verification_status ?? 'pending'} /></td>
              <td className="px-3 py-2 text-muted-foreground">{formatDate(doc.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdminGovernancePage() {
  const basePath = usePortalBasePath();
  const [governanceTab, setGovernanceTab] = useState<GovernanceTab>('institution');

  const { page, search, status, dateFrom, dateTo, setPage, setSearch, setStatus, setDateFrom, setDateTo, resetFilters } = useListUrlState();
  const [perPage, setPerPageState] = useState(DEFAULT_PAGE_SIZE);
  const setPerPage = useCallback(
    (next: number) => {
      setPerPageState(normalizeClientPageSize(next));
      setPage(1);
    },
    [setPage],
  );

  const [instPage, setInstPage] = useState(1);
  const [instPerPage, setInstPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [instSearch, setInstSearch] = useState('');
  const [instStatus, setInstStatus] = useState('');

  const [selectedAssociationId, setSelectedAssociationId] = useState<number | null>(null);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<number | null>(null);
  const [actionMode, setActionMode] = useState<'enable' | 'disable' | null>(null);
  const [disableReason, setDisableReason] = useState('');
  const [logo, setLogo] = useState<File | null>(null);
  const [result, setResult] = useState<unknown>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    setSelectedAssociationId(null);
    setSelectedInstitutionId(null);
    setDisableReason('');
    setLogo(null);
  }, [governanceTab]);

  const institutionsQuery = usePaginatedList({
    queryKey: [...queryKeys.adminGovernanceInstitutions, instPage, instPerPage, instSearch, instStatus],
    queryFn: listAdminInstitutions,
    params: {
      page: instPage,
      per_page: instPerPage,
      search: instSearch || undefined,
      status: instStatus || undefined,
    },
    enabled: governanceTab === 'institution',
  });

  const associationsQuery = usePaginatedList({
    queryKey: [...queryKeys.adminAssociations, page, perPage, search, status, dateFrom, dateTo],
    queryFn: listAdminAssociations,
    params: { page, per_page: perPage, search: search || undefined, status: status || undefined, date_from: dateFrom || undefined, date_to: dateTo || undefined },
    enabled: governanceTab === 'association',
  });

  const institutionDetailQuery = useQuery({
    queryKey: queryKeys.adminInstitution(selectedInstitutionId),
    queryFn: async () => getAdminInstitution(selectedInstitutionId as number),
    enabled: Boolean(selectedInstitutionId),
  });

  const institutionDeclarationsQuery = useQuery({
    queryKey: queryKeys.adminInstitutionDeclarations(selectedInstitutionId),
    queryFn: async () => listAdminDeclarations({ institution_id: selectedInstitutionId as number, page: 1, per_page: 25 }),
    enabled: Boolean(selectedInstitutionId),
  });

  const institutionInvoicesQuery = useQuery({
    queryKey: queryKeys.adminInstitutionInvoices(selectedInstitutionId),
    queryFn: async () => listAdminInvoices({ institution_id: selectedInstitutionId as number, page: 1, per_page: 50 }),
    enabled: Boolean(selectedInstitutionId),
  });

  const institutionTimelineQuery = useQuery({
    queryKey: queryKeys.adminTimeline('institution', selectedInstitutionId),
    queryFn: async () => listAdminTimeline('institution', selectedInstitutionId as number, { page: 1, per_page: 10 }),
    enabled: Boolean(selectedInstitutionId),
  });

  const associationDetailQuery = useQuery({
    queryKey: queryKeys.adminAssociation(selectedAssociationId),
    queryFn: async () => getAdminAssociation(selectedAssociationId as number),
    enabled: Boolean(selectedAssociationId),
  });

  const associationAppsQuery = useQuery({
    queryKey: queryKeys.adminGovernanceAssociationApps(selectedAssociationId),
    queryFn: async () => listAdminMemberApplications({ association_id: selectedAssociationId as number, page: 1, per_page: 12 }),
    enabled: Boolean(selectedAssociationId),
  });

  const associationTimelineQuery = useQuery({
    queryKey: queryKeys.adminTimeline('association', selectedAssociationId),
    queryFn: async () => listAdminTimeline('association', selectedAssociationId as number, { page: 1, per_page: 10 }),
    enabled: Boolean(selectedAssociationId),
  });

  const institution = institutionDetailQuery.data?.data ?? null;
  const association = associationDetailQuery.data?.data ?? null;

  const disableMutation = useMutation({
    mutationFn: async ({ associationId, reason }: { associationId: number; reason?: string }) => {
      const confirmed = await confirmAdminSensitiveAction({ title: 'Confirm association disable', description: 'Disabling this association affects access and linked governance operations.', confirmLabel: 'Disable association' });
      if (!confirmed) throw new Error('Security confirmation cancelled.');
      return disableAdminAssociation(associationId, { reason: reason || undefined });
    },
    onSuccess: async (response) => {
      showAdminActionSuccess('Association disabled successfully.', response.message);
      setResult(response.data);
      setActionMode(null);
      await Promise.all([associationsQuery.refetch(), associationDetailQuery.refetch(), associationTimelineQuery.refetch()]);
    },
    onError: (error) => showAdminActionError(error, 'The association could not be disabled.'),
  });

  const enableMutation = useMutation({
    mutationFn: async (associationId: number) => {
      const confirmed = await confirmAdminSensitiveAction({ title: 'Confirm association enable', description: 'Re-enabling this association restores operational access and should be confirmed before continuing.', confirmLabel: 'Enable association' });
      if (!confirmed) throw new Error('Security confirmation cancelled.');
      return enableAdminAssociation(associationId);
    },
    onSuccess: async (response) => {
      showAdminActionSuccess('Association enabled successfully.', response.message);
      setResult(response.data);
      setActionMode(null);
      await Promise.all([associationsQuery.refetch(), associationDetailQuery.refetch(), associationTimelineQuery.refetch()]);
    },
    onError: (error) => showAdminActionError(error, 'The association could not be enabled.'),
  });

  const logoMutation = useMutation({
    mutationFn: async () => {
      if (!logo || !selectedAssociationId) throw new Error('Select an association and logo file first.');
      return uploadAdminAssociationLogo(selectedAssociationId, { logo });
    },
    onSuccess: async (response) => {
      showAdminActionSuccess('Association logo uploaded successfully.', response.message);
      setResult(response.data);
      await Promise.all([associationsQuery.refetch(), associationDetailQuery.refetch()]);
    },
    onError: (error) => showAdminActionError(error, 'The association logo could not be uploaded.'),
  });

  const invoicesOutstanding = (institutionInvoicesQuery.data?.data ?? []).reduce((sum, inv) => sum + Number(inv.outstanding_amount ?? 0), 0);

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Governance"
        description="Oversight for institutional compliance, declarations, and payment health."
        actions={
          governanceTab === 'association' ? (
            <Button
              variant="outline"
              disabled={isExporting}
              onClick={async () => {
                try {
                  setIsExporting(true);
                  const response = await downloadAdminAssociationsExport({ search: search || undefined, status: status || undefined, date_from: dateFrom || undefined, date_to: dateTo || undefined });
                  triggerBlobDownload(response.blob, response.filename);
                  showAdminExportSuccess('Associations');
                } catch {
                  showAdminExportError('Associations');
                } finally {
                  setIsExporting(false);
                }
              }}
            >
              {isExporting ? 'Exporting…' : 'Export associations CSV'}
            </Button>
          ) : null
        }
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-xl border border-border bg-muted/30 p-1 dark:border-slate-800 dark:bg-slate-900/60">
          <button
            type="button"
            onClick={() => setGovernanceTab('institution')}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition',
              governanceTab === 'institution'
                ? 'bg-card text-[#6A1025] shadow-sm dark:bg-slate-950 dark:text-rose-200'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Landmark className="h-4 w-4" aria-hidden />
            Institution governance
          </button>
          <button
            type="button"
            onClick={() => setGovernanceTab('association')}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition',
              governanceTab === 'association'
                ? 'bg-card text-[#6A1025] shadow-sm dark:bg-slate-950 dark:text-rose-200'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Building2 className="h-4 w-4" aria-hidden />
            Association governance
          </button>
        </div>
       
      </div>

      {governanceTab === 'institution' ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard label="Institutions in view" value={institutionsQuery.data?.meta?.total ?? 0} hint={instStatus ? `Account filter • ${instStatus}` : 'All institutions in current search'} />
            <StatCard label="Rows on this page" value={institutionsQuery.data?.data?.length ?? 0} hint="Select a row for full governance detail" />
            <StatCard label="Selected" value={selectedInstitutionId ?? '—'} hint={selectedInstitutionId ? 'Detail drawer uses live API data' : 'Pick an institution to inspect'} />
          </div>
          <div className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <SearchFilterBar
              search={instSearch}
              onSearchChange={(value) => { setInstSearch(value); setInstPage(1); }}
              status={instStatus}
              onStatusChange={(value) => { setInstStatus(value); setInstPage(1); }}
              statusOptions={[
                { label: 'All accounts', value: '' },
                { label: 'Pending review', value: 'pending_review' },
                { label: 'Active', value: 'active' },
                { label: 'Suspended', value: 'suspended' },
                { label: 'Blocked', value: 'blocked' },
                { label: 'Inactive', value: 'inactive' },
              ]}
              searchPlaceholder="Search by name, email, registration, or licence id"
              onReset={() => { setInstSearch(''); setInstStatus(''); setInstPage(1); }}
            />
            <DataTable
              columns={[
                {
                  key: 'name',
                  header: 'Institution',
                  render: (row: InstitutionProfileResource) => (
                    <div className="flex items-center gap-3">
                      <InstitutionLogoBlock institution={row} compact />
                      <div>
                        <p className="font-semibold text-foreground">{row.name}</p>
                        <p className="mt-0.5 text-sm text-muted-foreground">{[row.institution_type_label ?? row.institution_type, row.email ?? 'No email'].join(' • ')}</p>
                      </div>
                    </div>
                  ),
                },
                { key: 'licence', header: 'Licence', render: (row: InstitutionProfileResource) => row.licence_id ?? '—' },
                { key: 'onboarding', header: 'Onboarding', render: (row: InstitutionProfileResource) => <StatusBadge value={row.onboarding_status ?? '—'} label={row.onboarding_status_label ?? undefined} /> },
                { key: 'account', header: 'Account', render: (row: InstitutionProfileResource) => <StatusBadge value={row.account_status ?? '—'} label={row.account_status_label ?? undefined} /> },
                { key: 'governance', header: 'Governance', render: (row: InstitutionProfileResource) => <StatusBadge value={row.governance_status ?? '—'} label={row.governance_status_label ?? undefined} /> },
              ]}
              rows={institutionsQuery.data?.data ?? []}
              isLoading={institutionsQuery.isLoading}
              loadingTitle="Loading institutions"
              loadingDescription="Fetching institutions for governance review."
              onRowClick={(row) => setSelectedInstitutionId(row.id)}
              selectedRowKey={selectedInstitutionId ?? undefined}
              getRowKey={(row) => row.id}
              emptyTitle="No institutions match"
              emptyDescription="Adjust search or account filters, or onboard new institutions from Memberships."
            />
            <PaginationBar meta={institutionsQuery.data?.meta} onPageChange={setInstPage} perPage={instPerPage} onPerPageChange={(n) => { setInstPerPage(n as 10 | 20 | 50 | 100); setInstPage(1); }} />
          </div>
        </>
      ) : (
        <>
         
          <div className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <SearchFilterBar
              search={search}
              onSearchChange={(value) => { setSearch(value); setPage(1); }}
              status={status}
              onStatusChange={(value) => { setStatus(value); setPage(1); }}
              statusOptions={[{ label: 'Enabled', value: 'enabled' }, { label: 'Disabled', value: 'disabled' }]}
              searchPlaceholder="Search associations by name, code, or email"
              dateFrom={dateFrom}
              dateTo={dateTo}
              onDateFromChange={(value) => { setDateFrom(value); setPage(1); }}
              onDateToChange={(value) => { setDateTo(value); setPage(1); }}
              onReset={resetFilters}
            />
            <DataTable
              columns={[
                {
                  key: 'name',
                  header: 'Association',
                  render: (row: AssociationResource) => (
                    <div className="flex items-center gap-3">
                      <AssociationLogoBlock association={row} compact />
                      <div>
                        <p className="font-semibold text-foreground">{row.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{[row.code || 'No code', row.type_label ?? row.type ?? 'Unknown type', row.contact_email || row.contact_phone || 'No contact'].join(' • ')}</p>
                      </div>
                    </div>
                  ),
                },
                { key: 'code', header: 'Code', render: (row: AssociationResource) => row.code },
                { key: 'status', header: 'Status', render: (row: AssociationResource) => <StatusBadge value={row.status} label={row.status_label} /> },
                { key: 'enabled', header: 'Access', render: (row: AssociationResource) => <StatusBadge value={row.enabled_status ?? (row.is_enabled ? 'enabled' : 'disabled')} label={row.enabled_label} /> },
                {
                  key: 'actions',
                  header: '',
                  className: 'w-[1%] whitespace-nowrap',
                  render: (row: AssociationResource) =>
                    row.is_enabled ? (
                      <Button size="sm" variant="outline" className={warningActionButtonClass} onClick={(event) => { event.stopPropagation(); setSelectedAssociationId(row.id); setActionMode('disable'); }}>
                        Disable
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className={successActionButtonClass} onClick={(event) => { event.stopPropagation(); setSelectedAssociationId(row.id); setActionMode('enable'); }}>
                        Enable
                      </Button>
                    ),
                },
              ]}
              rows={associationsQuery.data?.data ?? []}
              isLoading={associationsQuery.isLoading}
              loadingTitle="Loading associations"
              loadingDescription="Fetching associations for governance review."
              onRowClick={(row) => setSelectedAssociationId(row.id)}
              selectedRowKey={selectedAssociationId ?? undefined}
              getRowKey={(row) => row.id}
              emptyTitle="No associations match these filters"
              emptyDescription="Clear filters or wait for new associations to be onboarded."
            />
            <PaginationBar meta={associationsQuery.data?.meta} onPageChange={setPage} perPage={perPage} onPerPageChange={setPerPage} />
          </div>
        </>
      )}

      {result ? <ResourceInspector title="Latest response" data={result} /> : null}

      <Modal
        open={Boolean(selectedInstitutionId)}
        onClose={() => setSelectedInstitutionId(null)}
        title="Institution governance"
        subtitle="Compliance, declarations, and financial exposure for the selected institution."
        size="2xl"
      >
        {institutionDetailQuery.isLoading ? (
          <DetailPanelState mode="loading" title="Loading institution" description="Preparing governance profile…" />
        ) : institution ? (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <InstitutionLogoBlock institution={institution} />
              <Button asChild variant="outline" className="shrink-0 self-start">
                <Link to={`${basePath}/institutions/${institution.id}`}>Open institution record</Link>
              </Button>
            </div>

            <GovernanceSection title="General" description="Identity, contacts, and programme posture.">
              <DetailGrid
                items={[
                  { label: 'Legal name', value: institution.name },
                  { label: 'Type', value: institution.institution_type_label ?? institution.institution_type },
                  { label: 'Registration', value: institution.registration_number ?? '—' },
                  { label: 'Licence id', value: institution.licence_id ?? '—' },
                  { label: 'Email', value: institution.email ?? '—' },
                  { label: 'Phone', value: institution.phone ?? '—' },
                  { label: 'Contact person', value: institution.contact_person_name ?? '—' },
                  { label: 'Onboarding', value: <StatusBadge value={institution.onboarding_status ?? '—'} label={institution.onboarding_status_label ?? undefined} /> },
                  { label: 'Account', value: <StatusBadge value={institution.account_status ?? '—'} label={institution.account_status_label ?? undefined} /> },
                  { label: 'Governance', value: <StatusBadge value={institution.governance_status ?? '—'} label={institution.governance_status_label ?? undefined} /> },
                  { label: 'State / City', value: `${institution.location?.state_name ?? '—'} • ${institution.location?.city_name ?? '—'}` },
                  { label: 'Licensing terms', value: institution.licensing_terms_accepted_at ? `Accepted ${formatDate(institution.licensing_terms_accepted_at)}` : 'Not recorded' },
                ]}
              />
              {institution.governance_reason ? (
                <Alert className="mt-4" title="Governance note" description={institution.governance_reason} />
              ) : null}
            </GovernanceSection>

            <GovernanceSection title="Compliance — KYC" description="Document coverage and profile readiness gate institutional approval.">
              <KycReadinessPanel kycReadiness={institution.kyc_readiness} profileCompleteness={institution.profile_completeness} />
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Submitted documents</p>
                <DocumentsTable documents={institution.kyc_documents ?? []} />
              </div>
            </GovernanceSection>

            <GovernanceSection title="Compliance — Annual declarations" description="Declared usage, expected fees, and settlement posture by licensing year.">
              {institutionDeclarationsQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading declarations…</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border dark:border-slate-800">
                  <table className="min-w-full divide-y divide-border text-sm dark:divide-slate-800">
                    <thead>
                      <tr className="bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground dark:bg-slate-900/80">
                        <th className="px-3 py-2">Year</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Expected</th>
                        <th className="px-3 py-2">Paid</th>
                        <th className="px-3 py-2">Outstanding</th>
                        <th className="px-3 py-2">Submitted</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border dark:divide-slate-800">
                      {(institutionDeclarationsQuery.data?.data ?? []).length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                            No annual declarations on file yet.
                          </td>
                        </tr>
                      ) : (
                        (institutionDeclarationsQuery.data?.data ?? []).map((row: InstitutionAnnualDeclarationResource) => (
                          <tr key={row.id} className="bg-card dark:bg-slate-950/40">
                            <td className="px-3 py-2 font-medium">{row.licensing_year}</td>
                            <td className="px-3 py-2"><StatusBadge value={row.declaration_status ?? '—'} /></td>
                            <td className="px-3 py-2">{formatCurrency(row.expected_amount)}</td>
                            <td className="px-3 py-2">{formatCurrency(row.paid_amount)}</td>
                            <td className="px-3 py-2 font-semibold text-amber-800 dark:text-amber-200">{formatCurrency(row.outstanding_amount)}</td>
                            <td className="px-3 py-2 text-muted-foreground">{formatDate(row.submitted_at)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </GovernanceSection>

            <GovernanceSection title="Payment obligations" description="Invoices tied to this institution — aggregate outstanding reflects collection risk.">
              {institutionInvoicesQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading invoices…</p>
              ) : (
                <>
                  <div className="mb-4 grid gap-3 sm:grid-cols-3">
                    <SummaryMetric label="Invoices loaded" value={String((institutionInvoicesQuery.data?.data ?? []).length)} hint="Most recent 50 invoice rows" />
                    <SummaryMetric label="Total outstanding" value={formatCurrency(invoicesOutstanding)} hint="Sum of outstanding_amount across listed invoices" />
                    <SummaryMetric label="Licence snapshot" value={institution.licence_id ?? '—'} hint="Cross-check with Declarations workspace" />
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-border dark:border-slate-800">
                    <table className="min-w-full divide-y divide-border text-sm dark:divide-slate-800">
                      <thead>
                        <tr className="bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground dark:bg-slate-900/80">
                          <th className="px-3 py-2">Invoice</th>
                          <th className="px-3 py-2">Year</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2">Total</th>
                          <th className="px-3 py-2">Paid</th>
                          <th className="px-3 py-2">Outstanding</th>
                          <th className="px-3 py-2">Due</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border dark:divide-slate-800">
                        {(institutionInvoicesQuery.data?.data ?? []).length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                              No invoices returned for this institution.
                            </td>
                          </tr>
                        ) : (
                          (institutionInvoicesQuery.data?.data ?? []).map((inv: InvoiceResource) => (
                            <tr key={inv.id} className="bg-card dark:bg-slate-950/40">
                              <td className="px-3 py-2 font-medium">{inv.invoice_number ?? `#${inv.id}`}</td>
                              <td className="px-3 py-2">{inv.billing_year ?? '—'}</td>
                              <td className="px-3 py-2"><StatusBadge value={inv.status ?? '—'} /></td>
                              <td className="px-3 py-2">{formatCurrency(inv.total_amount, inv.currency)}</td>
                              <td className="px-3 py-2">{formatCurrency(inv.amount_paid, inv.currency)}</td>
                              <td className="px-3 py-2 font-semibold text-amber-800 dark:text-amber-200">{formatCurrency(inv.outstanding_amount, inv.currency)}</td>
                              <td className="px-3 py-2 text-muted-foreground">{formatDate(inv.due_date)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </GovernanceSection>

            <GovernanceSection title="Activity" description="Recent governance and profile events for this institution.">
              <ActivityTimeline items={institutionTimelineQuery.data?.data} isLoading={institutionTimelineQuery.isLoading} emptyTitle="No timeline yet" />
            </GovernanceSection>
          </div>
        ) : (
          <DetailPanelState mode="empty" title="No institution selected" description="Choose an institution from the list." />
        )}
      </Modal>

      <Modal
        open={Boolean(selectedAssociationId)}
        onClose={() => { setSelectedAssociationId(null); setDisableReason(''); setLogo(null); }}
        title="Association governance"
        subtitle="Identity, compliance, membership pipeline, and operational controls."
        size="2xl"
      >
        {associationDetailQuery.isLoading ? (
          <DetailPanelState mode="loading" title="Loading association" description="Please wait…" />
        ) : association ? (
          <div className="space-y-6">
            <AssociationLogoBlock association={association} />

            <GovernanceSection title="General" description="Registered association profile and contact channels.">
              <DetailGrid
                items={[
                  { label: 'Name', value: association.name },
                  { label: 'Code', value: association.code },
                  { label: 'Contact email', value: association.contact_email ?? '—' },
                  { label: 'Contact phone', value: association.contact_phone ?? '—' },
                  { label: 'Status', value: <StatusBadge value={association.status} label={association.status_label} /> },
                  { label: 'Access', value: <StatusBadge value={association.enabled_status ?? (association.is_enabled ? 'enabled' : 'disabled')} label={association.enabled_label} /> },
                  { label: 'State', value: association.location?.state_name ?? '—' },
                  { label: 'City', value: association.location?.city_name ?? '—' },
                ]}
              />
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <SummaryMetric label="Association type" value={association.type_label ?? association.type ?? '—'} hint={association.code ? `Code • ${association.code}` : undefined} />
                <SummaryMetric label="Governance status" value={association.status_label ?? association.status ?? '—'} hint={association.enabled_label ? `Access • ${association.enabled_label}` : undefined} />
                <SummaryMetric label="Location" value={association.location?.state_name ?? '—'} hint={association.location?.city_name ? `City • ${association.location.city_name}` : undefined} />
              </div>
              <Alert className="mt-4" title="Narrative" description={association.description ?? 'No description provided.'} />
            </GovernanceSection>

            <GovernanceSection title="Compliance — KYC" description="Association-level proofs and readiness mirror institution onboarding standards.">
              <KycReadinessPanel kycReadiness={association.kyc_readiness} profileCompleteness={association.profile_completeness} />
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Submitted documents</p>
                <DocumentsTable documents={association.kyc_documents ?? []} />
              </div>
            </GovernanceSection>

            <GovernanceSection title="Compliance — Membership pipeline" description="Latest member applications attributed to this association.">
              {associationAppsQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading applications…</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border dark:border-slate-800">
                  <table className="min-w-full divide-y divide-border text-sm dark:divide-slate-800">
                    <thead>
                      <tr className="bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground dark:bg-slate-900/80">
                        <th className="px-3 py-2">Reference</th>
                        <th className="px-3 py-2">Applicant</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Stage</th>
                        <th className="px-3 py-2">Submitted</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border dark:divide-slate-800">
                      {(associationAppsQuery.data?.data ?? []).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                            No recent applications for this association.
                          </td>
                        </tr>
                      ) : (
                        (associationAppsQuery.data?.data ?? []).map((app: MemberApplicationResource) => (
                          <tr key={app.id} className="bg-card dark:bg-slate-950/40">
                            <td className="px-3 py-2 font-mono text-xs">{app.application_reference ?? `#${app.id}`}</td>
                            <td className="px-3 py-2">{app.user?.name ?? app.user?.email ?? '—'}</td>
                            <td className="px-3 py-2"><StatusBadge value={app.application_status} label={app.application_status_label} /></td>
                            <td className="px-3 py-2 text-muted-foreground">{app.submission_stage_label ?? app.submission_stage ?? '—'}</td>
                            <td className="px-3 py-2 text-muted-foreground">{formatDate(app.submitted_at)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </GovernanceSection>

            <GovernanceSection title="Actions" description="Operational updates and access control.">
              <p className="mb-3 text-xs text-muted-foreground">Upload a refreshed logo, then adjust access if governance requires a hard stop.</p>
              <input type="file" accept="image/*" className="mb-3 block w-full text-sm" onChange={(event) => setLogo(event.target.files?.[0] ?? null)} />
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => logoMutation.mutate()} disabled={logoMutation.isPending || !logo}>
                  Upload logo
                </Button>
                {!association.is_enabled ? <Button onClick={() => setActionMode('enable')}>Enable association</Button> : null}
                {association.is_enabled ? (
                  <Button variant="destructive" onClick={() => setActionMode('disable')}>
                    Disable association
                  </Button>
                ) : null}
              </div>
            </GovernanceSection>

            <GovernanceSection title="Activity" description="Recent association-scoped events.">
              <ActivityTimeline items={associationTimelineQuery.data?.data} isLoading={associationTimelineQuery.isLoading} emptyTitle="No association timeline yet" />
            </GovernanceSection>
          </div>
        ) : (
          <DetailPanelState mode="empty" title="No association selected" description="Choose an association from the table." />
        )}
      </Modal>

      <ActionDialog open={actionMode === 'enable'} onClose={() => setActionMode(null)} title="Enable association" description="Restore the association to active governance status." actionLabel="Enable association" onConfirm={() => { if (selectedAssociationId) enableMutation.mutate(selectedAssociationId); }} isSubmitting={enableMutation.isPending} />
      <ActionDialog open={actionMode === 'disable'} onClose={() => setActionMode(null)} title="Disable association" description="Disable this association and capture a short governance reason." actionLabel="Disable association" actionVariant="destructive" showReason initialReason={disableReason} onConfirm={(reason) => { setDisableReason(reason); if (selectedAssociationId) disableMutation.mutate({ associationId: selectedAssociationId, reason }); }} isSubmitting={disableMutation.isPending} />
    </div>
  );
}
