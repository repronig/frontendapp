import type { ReactNode } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BadgeCheck, CheckCircle2 } from 'lucide-react';
import { DEFAULT_PAGE_SIZE, normalizeClientPageSize } from '@/constants/pagination';
import { useListUrlState } from '@/hooks/useListUrlState';
import { Button } from '@/components/ui/button';
import { ActivityTimeline } from '@/components/shared/ActivityTimeline';
import { DataTable } from '@/components/shared/DataTable';
import { DetailPanelState } from '@/components/shared/DetailPanelState';
import { DetailGrid } from '@/components/shared/DetailGrid';
import { ListCountSummary } from '@/components/shared/ListCountSummary';
import { Modal } from '@/components/shared/Modal';
import { PaginationBar } from '@/components/shared/PaginationBar';
import { SearchFilterBar } from '@/components/shared/SearchFilterBar';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import {
  confirmAdminOfflinePayment,
  downloadAdminOfflinePaymentProof,
  downloadAdminLicencesExport,
  downloadAdminPaymentsExport,
  getAdminLicence,
  getAdminPayment,
  listAdminLicences,
  listAdminPayments,
  listAdminTimeline,
  rejectAdminOfflinePayment,
} from '@/features/admin/api';
import { getApiErrorMessageAsync } from '@/api/error';
import { onMutationApiError } from '@/lib/mutationFeedback';
import { confirmAdminSensitiveAction } from '@/features/admin/security';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import type {
  LicencePaymentResource,
  LicenceResource,
  SettlementSummaryResource,
  TimelineEventResource,
} from '@/types/domain';
import { formatCurrency, formatDate } from '@/utils/format';
import { triggerBlobDownload } from '@/utils/download';
import { exportDetailToPdfWhenReady } from '@/utils/pdfExport';
import { buildAdminLicencePdfFields, buildAdminPaymentPdfFields } from '@/features/admin/adminFinancePdfExport';
import { queryKeys } from '@/lib/queryKeys';

const tabs = [
  { key: 'licences', label: 'Licences' },
  { key: 'payments', label: 'Payments' },
] as const;

const paymentStatusFilterOptions = [
  { label: 'All statuses', value: '' },
  { label: 'Paid', value: 'paid' },
  { label: 'Pending (incl. offline)', value: 'pending' },
  { label: 'Pending offline only', value: 'pending_offline' },
  { label: 'Failed', value: 'failed' },
  { label: 'Cancelled', value: 'rejected' },
];

type Tab = (typeof tabs)[number]['key'];

type LinkedRecord = {
  title: string;
  value: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
};

function SummaryCard({ title, value, hint }: { title: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="mt-2 break-words text-lg font-semibold leading-tight text-foreground sm:text-xl">{value}</div>
      {hint ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function settlementTone(summary?: SettlementSummaryResource | null) {
  switch (summary?.state) {
    case 'fully_paid':
      return 'border-[#ABEFC6] bg-[#ECFDF3] text-[#067647]';
    case 'partially_paid':
      return 'border-[#B2DDFF] bg-[#EFF8FF] text-[#175CD3]';
    case 'overdue':
      return 'border-[#FECDCA] bg-[#FEF3F2] text-[#B42318]';
    default:
      return 'border-[#EAECF0] dark:border-slate-800 bg-[#F9FAFB] text-[#344054] dark:text-slate-200';
  }
}

function SettlementBanner({ summary }: { summary?: SettlementSummaryResource | null }) {
  if (!summary) return null;

  return (
    <div className={`rounded-2xl border px-4 py-3 ${settlementTone(summary)}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{summary.label}</p>
          <p className="mt-1 text-sm opacity-90">
            Paid {formatCurrency(summary.amount_paid ?? summary.paid_amount ?? summary.amount_allocated)}
            {' · '}
            Outstanding {formatCurrency(summary.outstanding_amount ?? summary.balance_after)}
          </p>
        </div>
        {summary.due_date ? <p className="text-xs font-medium">Due {formatDate(summary.due_date)}</p> : null}
      </div>
    </div>
  );
}

function LinkedRecords({ records }: { records: LinkedRecord[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-base font-semibold text-foreground">Linked records</p>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        {records.map((record) => (
          <div key={record.title} className="rounded-xl border border-border bg-muted/30 px-3 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{record.title}</p>
            <div className="mt-1 text-[15px] font-semibold leading-6 text-foreground">{record.value}</div>
            {record.subtitle ? <div className="mt-1 text-sm leading-6 text-muted-foreground">{record.subtitle}</div> : null}
            {record.badge ? <div className="mt-2">{record.badge}</div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function PaymentMiniList({ payments }: { payments?: LicencePaymentResource[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-base font-semibold text-foreground">Recent linked payments</p>
      <div className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
        {(payments ?? []).length ? payments?.slice(0, 5).map((payment) => (
          <div key={payment.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-3 py-3">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-medium text-foreground">{payment.payment_reference ?? payment.gateway_reference ?? `Payment #${payment.id}`}</p>
              <p className="text-sm text-muted-foreground">{formatDate(payment.paid_at ?? payment.created_at)}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-foreground">{formatCurrency(payment.amount, payment.currency ?? 'NGN')}</p>
              <div className="mt-1 flex justify-end">
                <StatusBadge value={payment.payment_status} />
              </div>
            </div>
          </div>
        )) : <p>No linked payments yet.</p>}
      </div>
    </div>
  );
}

function useTimeline(entity: 'declaration' | 'licence' | 'payment', selectedId: number | null, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.adminTimeline(entity, selectedId),
    queryFn: async () => listAdminTimeline(entity, selectedId as number, { page: 1, per_page: 6 }),
    enabled: enabled && Boolean(selectedId),
  });
}

export function AdminLicensingOpsPage() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const isSuperAdminPortal = location.pathname.startsWith('/super-admin');
  const defaultTab: Tab = 'licences';
  const { tab: urlTab, page, search, status, dateFrom, dateTo, setTab: setUrlTab, setPage, setSearch, setStatus, setDateFrom, setDateTo, resetFilters } = useListUrlState({ defaultTab });
  const tab = (urlTab || defaultTab) as Tab;
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
  const [rejectReason, setRejectReason] = useState('');
  const [licensingPdfExporting, setLicensingPdfExporting] = useState(false);

  const confirmOfflineMutation = useMutation({
    mutationFn: async (paymentId: number) => confirmAdminOfflinePayment(paymentId, {}),
    onSuccess: (response) => {
      toast.success(response.message);
      queryClient.invalidateQueries({ queryKey: queryKeys.adminPaymentsPage });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminPaymentPage(selectedId) });
    },
    onError: onMutationApiError(),
  });

  const rejectOfflineMutation = useMutation({
    mutationFn: async ({ paymentId, reason }: { paymentId: number; reason: string }) => rejectAdminOfflinePayment(paymentId, { reason }),
    onSuccess: (response) => {
      toast.success(response.message);
      setRejectReason('');
      queryClient.invalidateQueries({ queryKey: queryKeys.adminPaymentsPage });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminPaymentPage(selectedId) });
    },
    onError: onMutationApiError(),
  });

  const licencesQuery = usePaginatedList({ queryKey: [...queryKeys.adminLicencesPage, page, perPage, search, status, dateFrom, dateTo], queryFn: listAdminLicences, params: { page, per_page: perPage, search: search || undefined, status: status || undefined, date_from: dateFrom || undefined, date_to: dateTo || undefined }, enabled: tab === 'licences' });
  const paymentsQuery = usePaginatedList({ queryKey: [...queryKeys.adminPaymentsPage, page, perPage, search, status, dateFrom, dateTo], queryFn: listAdminPayments, params: { page, per_page: perPage, search: search || undefined, status: status || undefined, date_from: dateFrom || undefined, date_to: dateTo || undefined }, enabled: tab === 'payments' });

  const licenceDetailQuery = useQuery({ queryKey: queryKeys.adminLicencePage(selectedId), queryFn: async () => getAdminLicence(selectedId as number), enabled: tab === 'licences' && Boolean(selectedId) && modalOpen });
  const paymentDetailQuery = useQuery({ queryKey: queryKeys.adminPaymentPage(selectedId), queryFn: async () => getAdminPayment(selectedId as number), enabled: tab === 'payments' && Boolean(selectedId) && modalOpen });

  const licenceTimelineQuery = useTimeline('licence', selectedId, modalOpen && tab === 'licences');
  const paymentTimelineQuery = useTimeline('payment', selectedId, modalOpen && tab === 'payments');

  const meta = tab === 'licences' ? licencesQuery.data?.meta : paymentsQuery.data?.meta;
  const modalTitle = tab === 'licences' ? 'Licence details' : 'Payment details';
  const tabHelperText = tab === 'licences'
      ? 'Inspect issued licences, open a row for linked declaration and invoice context, and export the current licence list when needed.'
      : 'Inspect recorded payments, open a row for allocation and linkage details, and export the current payment list when needed.';
  const searchPlaceholder = tab === 'licences'
      ? 'Search licences by number, institution, or linked declaration'
      : 'Search payments by reference, institution, or linked invoice';
  const countSubject = tab === 'licences' ? 'licences' : 'payments';
  const countHelper = tab === 'licences'
      ? `${meta?.total ?? 0} licence records in the current licensing workflow`
      : `${meta?.total ?? 0} payment records in the current licensing workflow`;

  const timelineItems = useMemo<TimelineEventResource[]>(() => {
    if (tab === 'licences') return licenceTimelineQuery.data?.data ?? [];
    return paymentTimelineQuery.data?.data ?? [];
  }, [licenceTimelineQuery.data?.data, paymentTimelineQuery.data?.data, tab]);

  function openDetails(id: number) {
    setRejectReason('');
    setSelectedId(id);
    setModalOpen(true);
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Licensing operations" description={isSuperAdminPortal ? 'Licences and payments (super scope).' : 'Licences, payments, and settlements.'} actions={tab === 'licences' || tab === 'payments' ? <Button variant="outline" onClick={async () => { const response = tab === 'licences' ? await downloadAdminLicencesExport({ search: search || undefined, licence_status: status || undefined, date_from: dateFrom || undefined, date_to: dateTo || undefined }) : await downloadAdminPaymentsExport({ search: search || undefined, payment_status: status || undefined, date_from: dateFrom || undefined, date_to: dateTo || undefined }); triggerBlobDownload(response.blob, response.filename); }}>Export CSV</Button> : undefined} />

      <div className="flex flex-wrap gap-2">
        {tabs.map((option) => (
          <Button key={option.key} variant={tab === option.key ? 'default' : 'outline'} onClick={() => { setSelectedId(null); setModalOpen(false); setPage(1); setSearch(''); setStatus(''); setDateFrom(''); setDateTo(''); setUrlTab(option.key); }}>
            {option.label}
          </Button>
        ))}
      </div>
      <p className="text-sm text-[#667085] dark:text-slate-300">{tabHelperText}</p>
      <ListCountSummary meta={meta} subject={countSubject} helper={countHelper} />

      <SearchFilterBar search={search} onSearchChange={setSearch} status={status} onStatusChange={setStatus} statusOptions={tab === 'payments' ? paymentStatusFilterOptions : undefined} searchPlaceholder={searchPlaceholder} dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} onReset={resetFilters} />

      {tab === 'licences' ? <><DataTable columns={[
        { key: 'licence', header: 'Licence', render: (row: LicenceResource) => <div className="flex min-w-[210px] items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EFF8FF] text-[#175CD3]"><BadgeCheck className="h-5 w-5" /></span><div><p className="font-medium text-foreground">{row.licence_number ?? `Licence #${row.id}`}</p><p className="text-xs text-muted-foreground">{row.institution?.name ?? '—'}</p></div></div> },
        { key: 'year', header: 'Year', render: (row: LicenceResource) => row.licence_year ?? '—' },
        { key: 'workflow', header: 'Workflow', render: (row: LicenceResource) => <StatusBadge value={row.licence_status} /> },
        { key: 'payment', header: 'Payment', render: (row: LicenceResource) => <StatusBadge value={row.payment_status} /> },
        { key: 'settlement', header: 'Settlement', render: (row: LicenceResource) => <StatusBadge value={row.settlement_summary?.state ?? 'outstanding'} /> },
        { key: 'amount_due', header: 'Amount due', render: (row: LicenceResource) => formatCurrency(row.financial_summary?.amount_due ?? row.amount_due) },
        { key: 'outstanding', header: 'Outstanding', render: (row: LicenceResource) => formatCurrency(row.financial_summary?.outstanding_amount ?? row.outstanding_amount) },
        { key: 'issued', header: 'Issued', render: (row: LicenceResource) => formatDate(row.issued_at) },
      ]} rows={licencesQuery.data?.data ?? []} isLoading={licencesQuery.isLoading} loadingTitle="Loading licences" loadingDescription="The latest licence records are being fetched from the backend." onRowClick={(row) => openDetails(row.id)} getRowKey={(row) => row.id} selectedRowKey={selectedId ?? undefined} exportTitle="Admin licences"
        emptyTitle="No licences found" /><PaginationBar meta={meta} onPageChange={setPage} subject={countSubject} perPage={perPage} onPerPageChange={setPerPage} /></> : null}

      {tab === 'payments' ? <><DataTable columns={[
        { key: 'payment', header: 'Payment', render: (row: LicencePaymentResource) => <div><p className="font-medium text-foreground">{row.payment_reference ?? row.gateway_reference ?? `Payment #${row.id}`}</p><p className="text-xs text-muted-foreground">{row.institution?.name ?? '—'}</p></div> },
        { key: 'licence', header: 'Linked licence', render: (row: LicencePaymentResource) => row.licence?.licence_number ?? 'Not linked' },
        { key: 'invoice', header: 'Invoice', render: (row: LicencePaymentResource) => row.invoice?.invoice_number ?? 'Not linked' },
        { key: 'status', header: 'Status', render: (row: LicencePaymentResource) => <StatusBadge value={row.payment_status} /> },
        { key: 'settlement', header: 'Settlement', render: (row: LicencePaymentResource) => <StatusBadge value={row.settlement_summary?.state ?? 'outstanding'} /> },
        { key: 'amount', header: 'Amount', render: (row: LicencePaymentResource) => formatCurrency(row.amount, row.currency ?? 'NGN') },
        { key: 'balance', header: 'Balance after', render: (row: LicencePaymentResource) => formatCurrency(row.balance_after, row.currency ?? 'NGN') },
        { key: 'paid', header: 'Paid at', render: (row: LicencePaymentResource) => formatDate(row.paid_at ?? row.created_at) },
      ]} rows={paymentsQuery.data?.data ?? []} isLoading={paymentsQuery.isLoading} loadingTitle="Loading payments" loadingDescription="The latest payment records are being fetched from the backend." onRowClick={(row) => openDetails(row.id)} getRowKey={(row) => row.id} selectedRowKey={selectedId ?? undefined} exportTitle="Admin licence payments"
        emptyTitle="No payments found" /><PaginationBar meta={meta} onPageChange={setPage} subject={countSubject} perPage={perPage} onPerPageChange={setPerPage} /></> : null}

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setRejectReason(''); }} title={modalTitle} subtitle="Review the selected backend record with linked entities, settlement visibility, and recent actions." size="lg">
        {tab === 'licences' && licenceDetailQuery.isLoading ? <DetailPanelState mode="loading" title="Loading licence" description="Please wait…preparing selected resource." /> : null}
        {tab === 'payments' && paymentDetailQuery.isLoading ? <DetailPanelState mode="loading" title="Loading payment" description="Please wait…preparing selected resource." /> : null}

        {tab === 'licences' && licenceDetailQuery.data?.data ? (() => { const item = licenceDetailQuery.data.data; return (
          <div className="space-y-5">
            <SettlementBanner summary={item.settlement_summary} />
            <div className="grid gap-4 md:grid-cols-3">
              <SummaryCard title="Amount due" value={formatCurrency(item.financial_summary?.amount_due ?? item.amount_due)} hint={`Payments: ${item.financial_summary?.payment_count ?? item.payments?.length ?? 0}`} />
              <SummaryCard title="Amount paid" value={formatCurrency(item.financial_summary?.amount_paid ?? item.amount_paid)} hint={item.invoice?.invoice_number ? `Invoice ${item.invoice.invoice_number}` : 'Invoice not linked'} />
              <SummaryCard title="Outstanding" value={formatCurrency(item.financial_summary?.outstanding_amount ?? item.outstanding_amount)} hint={item.settlement_summary?.due_date ? `Due ${formatDate(item.settlement_summary.due_date)}` : 'No due date recorded'} />
            </div>
            {(item.payment_status === 'paid' || item.payment_status === 'fully_paid' || item.settlement_summary?.state === 'fully_paid' || Number(item.financial_summary?.outstanding_amount ?? item.outstanding_amount ?? 0) <= 0) ? (
              <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">Licence payment is complete.</p>
                  <p className="mt-1 text-sm leading-6">This licence has no outstanding balance.</p>
                </div>
              </div>
            ) : null}
            <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-border bg-card p-5">
              <div>
                <h3 className="break-words text-xl font-semibold leading-snug text-foreground">{item.licence_number ?? `Licence #${item.id}`}</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.institution?.name ?? item.related_entities?.institution?.name ?? 'Institution not loaded'} · Year {item.licence_year ?? '—'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={licenceDetailQuery.isFetching || licensingPdfExporting || !selectedId}
                  onClick={() => {
                    void (async () => {
                      if (!selectedId) return;
                      setLicensingPdfExporting(true);
                      try {
                        await exportDetailToPdfWhenReady(item.licence_number ?? `Licence-${selectedId}`, {
                          prepare: () =>
                            queryClient.fetchQuery({
                              queryKey: queryKeys.adminLicencePage(selectedId),
                              queryFn: () => getAdminLicence(selectedId),
                            }),
                          buildFields: () => {
                            const fresh = queryClient.getQueryData<Awaited<ReturnType<typeof getAdminLicence>>>(queryKeys.adminLicencePage(selectedId));
                            const row = fresh?.data ?? item;
                            return buildAdminLicencePdfFields(row);
                          },
                          header: { eyebrow: 'Official document — Licensing operations', organizationName: 'REPRONIG' },
                        });
                      } finally {
                        setLicensingPdfExporting(false);
                      }
                    })();
                  }}
                >
                  {licensingPdfExporting ? 'Preparing PDF…' : 'Export PDF'}
                </Button>
                <StatusBadge value={item.licence_status} />
                <StatusBadge value={item.payment_status} />
                <StatusBadge value={item.settlement_summary?.state ?? 'outstanding'} />
              </div>
            </div>
            <DetailGrid items={[
              { label: 'Institution licence ID', value: item.institution?.licence_id ?? item.licence_id_snapshot ?? '—' },
              { label: 'Issued at', value: formatDate(item.issued_at) },
              { label: 'Starts at', value: formatDate(item.start_date) },
              { label: 'Ends at', value: formatDate(item.end_date) },
              { label: 'Declaration year', value: item.related_entities?.declaration?.licensing_year ?? item.declaration?.licensing_year ?? '—' },
              { label: 'Invoice', value: item.invoice?.invoice_number ?? '—' },
            ]} />
            <LinkedRecords records={[
              { title: 'Institution', value: item.related_entities?.institution?.name ?? item.institution?.name ?? 'Not linked', subtitle: item.related_entities?.institution?.licence_id ?? item.institution?.licence_id ?? 'No licence ID' },
              { title: 'Declaration', value: item.related_entities?.declaration?.id ? `Declaration #${item.related_entities.declaration.id}` : 'Not linked', subtitle: item.related_entities?.declaration?.licensing_year ? `Year ${item.related_entities.declaration.licensing_year}` : undefined, badge: item.related_entities?.declaration?.declaration_status ? <StatusBadge value={item.related_entities.declaration.declaration_status} /> : undefined },
              { title: 'Invoice', value: item.related_entities?.invoice?.invoice_number ?? item.invoice?.invoice_number ?? 'Not linked', subtitle: item.related_entities?.invoice?.due_date ? `Due ${formatDate(item.related_entities.invoice.due_date)}` : undefined, badge: item.related_entities?.invoice?.status ? <StatusBadge value={item.related_entities.invoice.status} /> : undefined },
            ]} />
            <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <PaymentMiniList payments={item.payments} />
              <ActivityTimeline items={timelineItems} isLoading={licenceTimelineQuery.isLoading} emptyTitle="No licence activity yet" />
            </div>
          </div>
        ); })() : null}

        {tab === 'payments' && paymentDetailQuery.data?.data ? (() => { const item = paymentDetailQuery.data.data; return (
          <div className="space-y-5">
            <SettlementBanner summary={item.settlement_summary} />
            <div className="grid gap-4 md:grid-cols-3">
              <SummaryCard title="Amount" value={formatCurrency(item.amount, item.currency ?? 'NGN')} hint={item.gateway_name ?? 'Gateway not set'} />
              <SummaryCard title="Allocated" value={formatCurrency(item.amount_allocated, item.currency ?? 'NGN')} hint={`Before balance: ${formatCurrency(item.balance_before, item.currency ?? 'NGN')}`} />
              <SummaryCard title="Balance after" value={formatCurrency(item.balance_after, item.currency ?? 'NGN')} hint={item.settlement_summary?.due_date ? `Due ${formatDate(item.settlement_summary.due_date)}` : 'No due date recorded'} />
            </div>
            <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-border bg-card p-5">
              <div>
                <h3 className="break-words text-xl font-semibold leading-snug text-foreground">{item.payment_reference ?? `Payment #${item.id}`}</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.institution?.name ?? item.licence?.licence_number ?? 'Institution not loaded'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={paymentDetailQuery.isFetching || licensingPdfExporting || !selectedId}
                  onClick={() => {
                    void (async () => {
                      if (!selectedId) return;
                      setLicensingPdfExporting(true);
                      try {
                        await exportDetailToPdfWhenReady(item.payment_reference ?? `Payment-${selectedId}`, {
                          prepare: () =>
                            queryClient.fetchQuery({
                              queryKey: queryKeys.adminPaymentPage(selectedId),
                              queryFn: () => getAdminPayment(selectedId),
                            }),
                          buildFields: () => {
                            const fresh = queryClient.getQueryData<Awaited<ReturnType<typeof getAdminPayment>>>(queryKeys.adminPaymentPage(selectedId));
                            const row = fresh?.data ?? item;
                            return buildAdminPaymentPdfFields(row);
                          },
                          header: { eyebrow: 'Official document — Licensing operations', organizationName: 'REPRONIG' },
                        });
                      } finally {
                        setLicensingPdfExporting(false);
                      }
                    })();
                  }}
                >
                  {licensingPdfExporting ? 'Preparing PDF…' : 'Export PDF'}
                </Button>
                <StatusBadge value={item.payment_status} />
                <StatusBadge value={item.settlement_summary?.state ?? 'outstanding'} />
              </div>
            </div>
            <DetailGrid items={[
              { label: 'Gateway reference', value: item.gateway_reference ?? '—' },
              { label: 'Paid at', value: formatDate(item.paid_at) },
              { label: 'Created at', value: formatDate(item.created_at) },
              { label: 'Institution', value: item.institution?.name ?? '—' },
              { label: 'Licence', value: item.licence?.licence_number ?? '—' },
              { label: 'Declaration year', value: item.declaration?.licensing_year ?? '—' },
              { label: 'Invoice', value: item.invoice?.invoice_number ?? '—' },
              { label: 'Outstanding on declaration', value: formatCurrency(item.declaration?.outstanding_amount) },
            ]} />
            {item.gateway_name === 'offline' && item.offline ? (
              <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-2 text-sm">
                <p className="font-semibold text-foreground">Offline submission</p>
                <p className="text-muted-foreground">Declared full balance: {item.offline.paid_in_full ? 'Yes' : 'No'}</p>
                {item.offline.institution_note ? <p className="text-muted-foreground">Institution note: {item.offline.institution_note}</p> : null}
                {item.offline.submitted_at ? <p className="text-muted-foreground">Submitted: {formatDate(item.offline.submitted_at)}</p> : null}
                {item.offline.rejection_reason ? <p className="text-rose-700 dark:text-rose-300">Rejection reason: {item.offline.rejection_reason}</p> : null}
              </div>
            ) : null}
            {item.gateway_name === 'offline' && item.payment_status === 'pending_offline' ? (
              <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/50 dark:bg-amber-950/25">
                <p className="text-sm font-semibold text-foreground">Review offline payment</p>
                <p className="text-sm text-muted-foreground">Confirm after verifying funds in the REPRONIG bank account. This applies the submitted amount to the linked invoice and licence.</p>
                <div className="flex flex-wrap gap-2">
                  {item.offline?.has_proof ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          const res = await downloadAdminOfflinePaymentProof(item.id);
                          const blob = res.data instanceof Blob ? res.data : new Blob([res.data]);
                          triggerBlobDownload(blob, 'offline-receipt');
                        } catch (error) {
                          toast.error(await getApiErrorMessageAsync(error, 'Could not download offline proof.'));
                        }
                      }}
                    >
                      Download receipt
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    onClick={async () => {
                      const ok = await confirmAdminSensitiveAction({
                        title: 'Confirm offline payment',
                        description: "This marks the institution's offline transfer as received and updates the invoice balance.",
                        confirmLabel: 'Confirm payment',
                      });
                      if (!ok) return;
                      confirmOfflineMutation.mutate(item.id);
                    }}
                    disabled={confirmOfflineMutation.isPending}
                  >
                    {confirmOfflineMutation.isPending ? 'Confirming…' : 'Confirm offline payment'}
                  </Button>
                </div>
                <label className="block space-y-1 text-sm">
                  <span className="text-muted-foreground">Rejection reason (required to reject)</span>
                  <textarea className="min-h-[72px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm" value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} placeholder="Explain why this submission is rejected" />
                </label>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={rejectOfflineMutation.isPending || !rejectReason.trim()}
                  onClick={async () => {
                    const ok = await confirmAdminSensitiveAction({
                      title: 'Reject offline payment',
                      description: 'The institution can submit again after rejection. The uploaded receipt will be removed.',
                      confirmLabel: 'Reject payment',
                    });
                    if (!ok) return;
                    rejectOfflineMutation.mutate({ paymentId: item.id, reason: rejectReason.trim() });
                  }}
                >
                  {rejectOfflineMutation.isPending ? 'Rejecting…' : 'Reject submission'}
                </Button>
              </div>
            ) : null}
            <LinkedRecords records={[
              { title: 'Licence', value: item.related_entities?.licence?.licence_number ?? item.licence?.licence_number ?? 'Not linked', subtitle: item.licence?.licence_year ? `Year ${item.licence.licence_year}` : undefined, badge: item.related_entities?.licence?.licence_status ? <StatusBadge value={item.related_entities.licence.licence_status} /> : undefined },
              { title: 'Declaration', value: item.related_entities?.declaration?.id ? `Declaration #${item.related_entities.declaration.id}` : 'Not linked', subtitle: item.declaration?.licensing_year ? `Year ${item.declaration.licensing_year}` : undefined, badge: item.related_entities?.declaration?.declaration_status ? <StatusBadge value={item.related_entities.declaration.declaration_status} /> : undefined },
              { title: 'Invoice', value: item.related_entities?.invoice?.invoice_number ?? item.invoice?.invoice_number ?? 'Not linked', subtitle: item.related_entities?.invoice?.due_date ? `Due ${formatDate(item.related_entities.invoice.due_date)}` : undefined, badge: item.related_entities?.invoice?.status ? <StatusBadge value={item.related_entities.invoice.status} /> : undefined },
            ]} />
            <ActivityTimeline items={timelineItems} isLoading={paymentTimelineQuery.isLoading} emptyTitle="No payment activity yet" />
          </div>
        ); })() : null}
      </Modal>
    </div>
  );
}
