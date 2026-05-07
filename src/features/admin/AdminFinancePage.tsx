import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, BarChart3, CreditCard, Receipt, Wallet } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { DEFAULT_PAGE_SIZE, normalizeClientPageSize } from '@/constants/pagination';
import { useListUrlState } from '@/hooks/useListUrlState';
import { Button } from '@/components/ui/button';
import { ActivityTimeline } from '@/components/shared/ActivityTimeline';
import { DataTable } from '@/components/shared/DataTable';
import { DetailPanelState } from '@/components/shared/DetailPanelState';
import { DetailGrid } from '@/components/shared/DetailGrid';
import { ListCountSummary } from '@/components/shared/ListCountSummary';
import { FormField } from '@/components/shared/FormField';
import { FormTextareaField } from '@/components/shared/FormTextareaField';
import { Modal } from '@/components/shared/Modal';
import { ModalFormActions, ModalFormRoot, ModalFormScrollBody, ModalFormSection } from '@/components/shared/ModalForm';
import { PaginationBar } from '@/components/shared/PaginationBar';
import { SearchFilterBar } from '@/components/shared/SearchFilterBar';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { StatCard, statCardVariantAt } from '@/components/shared/StatCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { TableActionButton, TableActions } from '@/components/shared/TableActions';
import { editActionButtonClass, neutralActionButtonClass, viewActionButtonClass } from '@/components/shared/tableActionStyles';
import { formatDisplayLabel } from '@/utils/display';
import {
  createAdminFeePlan,
  downloadAdminLicencesExport,
  downloadAdminPaymentsExport,
  createAdminImport,
  createAdminInvoiceAdjustment,
  getAdminAuditLog,
  getAdminInvoice,
  getAdminLicence,
  getAdminPayment,
  listAdminAuditLogs,
  listAdminFeePlans,
  listAdminImports,
  listAdminInvoices,
  listAdminLicences,
  listAdminPayments,
  listAdminTimeline,
  processAdminImport,
  updateAdminFeePlan,
} from '@/features/admin/api';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import type { AuditLogResource, ImportBatchResource, InvoiceResource, LicencePaymentResource, LicenceResource, LicensingFeePlanResource, TimelineEventResource } from '@/types/domain';
import { formatCurrency, formatDate } from '@/utils/format';
import { exportDetailToPdfWhenReady } from '@/utils/pdfExport';
import { buildAdminInvoicePdfFields, buildAdminPaymentPdfFields } from '@/features/admin/adminFinancePdfExport';
import { confirmAdminSensitiveAction } from '@/features/admin/security';
import { getAdminFieldError, showAdminActionError, showAdminActionSuccess, showAdminExportError, showAdminExportSuccess } from '@/features/admin/action-feedback';
import { triggerBlobDownload } from '@/utils/download';
import { queryKeys } from '@/lib/queryKeys';
import { useAdminFinanceSummary } from '@/features/dashboard/useDashboard';
import {
  CompactMoneySummary,
  CompactReference,
  CompactStatusStack,
  type DetailModal,
  InvoiceRecentActions,
  InvoiceLinkedRefsCell,
  LinkedInvoiceRecords,
  LinkedPaymentRecords,
  PaymentLinkedRefsCell,
  PaymentRecentActions,
  SettlementBanner,
  SummaryCard,
  type AdminFinanceTab,
  financeStatusOptions,
  tabOptions,
} from '@/features/admin/AdminFinanceParts';

function FeePlanActions({ onView, onEdit }: { onView: () => void; onEdit: () => void }) {
  return (
    <TableActions>
      <TableActionButton className={viewActionButtonClass} onClick={(event) => { event.stopPropagation(); onView(); }}>View</TableActionButton>
      <TableActionButton className={editActionButtonClass} onClick={(event) => { event.stopPropagation(); onEdit(); }}>Edit</TableActionButton>
    </TableActions>
  );
}

const emptyFeePlanForm = {
  institution_type: '',
  basis_type: '',
  unit_cost: '',
  flat_amount: '',
  effective_from_year: String(new Date().getFullYear()),
  effective_to_year: '',
  description: '',
};

export function AdminFinancePage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<AdminFinanceTab>('invoices');
  const [isExporting, setIsExporting] = useState(false);
  const { page, search, status, dateFrom, dateTo, setPage, setSearch, setStatus, setDateFrom, setDateTo, resetFilters } = useListUrlState();
  const [perPage, setPerPageState] = useState(DEFAULT_PAGE_SIZE);
  const setPerPage = useCallback(
    (next: number) => {
      setPerPageState(normalizeClientPageSize(next));
      setPage(1);
    },
    [setPage],
  );
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [modalType, setModalType] = useState<DetailModal>(null);
  const [recordsModalOpen, setRecordsModalOpen] = useState(false);
  const [adjustmentForm, setAdjustmentForm] = useState({ adjustment_type: '', amount: '', reason_code: '', reason: '' });
  const [adjustmentErrors, setAdjustmentErrors] = useState<{ adjustment_type?: string; amount?: string; reason_code?: string; reason?: string }>({});
  const [feePlanForm, setFeePlanForm] = useState(emptyFeePlanForm);
  const [feePlanErrors, setFeePlanErrors] = useState<{ institution_type?: string; basis_type?: string; unit_cost?: string; flat_amount?: string; effective_from_year?: string; effective_to_year?: string; description?: string }>({});
  const [importType, setImportType] = useState<'' | 'members' | 'works' | 'institutions'>('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importErrors, setImportErrors] = useState<{ importType?: string; file?: string }>({});
  const [financePdfExporting, setFinancePdfExporting] = useState(false);

  const financeSummaryQuery = useAdminFinanceSummary();
  const invoiceQuery = usePaginatedList({ queryKey: [...queryKeys.adminInvoices, page, perPage, search, status, dateFrom, dateTo], queryFn: listAdminInvoices, params: { page, per_page: perPage, search: search || undefined, status: status || undefined, date_from: dateFrom || undefined, date_to: dateTo || undefined }, enabled: tab === 'invoices' });
  const paymentsQuery = usePaginatedList({ queryKey: [...queryKeys.adminPayments, page, perPage, search, status, dateFrom, dateTo], queryFn: listAdminPayments, params: { page, per_page: perPage, search: search || undefined, payment_status: status || undefined, date_from: dateFrom || undefined, date_to: dateTo || undefined }, enabled: tab === 'payments' });
  const licencesQuery = usePaginatedList({ queryKey: [...queryKeys.adminLicences, page, perPage, search, status, dateFrom, dateTo], queryFn: listAdminLicences, params: { page, per_page: perPage, search: search || undefined, status: status || undefined, date_from: dateFrom || undefined, date_to: dateTo || undefined }, enabled: tab === 'licences' });
  const feePlansQuery = usePaginatedList({ queryKey: [...queryKeys.adminFeePlans, page, perPage, search, status], queryFn: listAdminFeePlans, params: { page, per_page: perPage, search: search || undefined, status: status || undefined }, enabled: tab === 'fee-plans' });
  const importsQuery = usePaginatedList({ queryKey: [...queryKeys.adminImports, page, perPage, search, status], queryFn: listAdminImports, params: { page, per_page: perPage, search: search || undefined, status: status || undefined }, enabled: tab === 'imports' });
  const auditLogsQuery = usePaginatedList({ queryKey: [...queryKeys.adminAuditLogs, page, perPage, search], queryFn: listAdminAuditLogs, params: { page, per_page: perPage, search: search || undefined }, enabled: tab === 'audit' });

  const invoiceDetailQuery = useQuery({ queryKey: queryKeys.adminInvoice(selectedId), queryFn: async () => getAdminInvoice(selectedId as number), enabled: modalType === 'invoice' && Boolean(selectedId) });
  const paymentDetailQuery = useQuery({ queryKey: queryKeys.adminPayment(selectedId), queryFn: async () => getAdminPayment(selectedId as number), enabled: modalType === 'payment' && Boolean(selectedId) });
  const licenceDetailQuery = useQuery({ queryKey: queryKeys.adminLicence(selectedId), queryFn: async () => getAdminLicence(selectedId as number), enabled: modalType === 'licence' && Boolean(selectedId) });
  const auditDetailQuery = useQuery({ queryKey: queryKeys.adminAuditLog(selectedId), queryFn: async () => getAdminAuditLog(selectedId as number), enabled: modalType === 'audit' && Boolean(selectedId) });
  const invoiceTimelineQuery = useQuery({ queryKey: queryKeys.adminTimeline('invoice', selectedId), queryFn: async () => listAdminTimeline('invoice', selectedId as number, { page: 1, per_page: 6 }), enabled: modalType === 'invoice' && Boolean(selectedId) });
  const paymentTimelineQuery = useQuery({ queryKey: queryKeys.adminTimeline('payment', selectedId), queryFn: async () => listAdminTimeline('payment', selectedId as number, { page: 1, per_page: 6 }), enabled: modalType === 'payment' && Boolean(selectedId) });

  const invoice = invoiceDetailQuery.data?.data ?? null;
  const payment = paymentDetailQuery.data?.data ?? null;
  const licence = licenceDetailQuery.data?.data ?? null;
  const auditLog = auditDetailQuery.data?.data ?? null;
  const selectedFeePlan = useMemo(() => feePlansQuery.data?.data.find((row) => row.id === selectedId) ?? null, [feePlansQuery.data, selectedId]);

  function openModal(nextType: DetailModal, id?: number) {
    if (id) setSelectedId(id);
    if (nextType === 'fee-plan-form' && id && selectedFeePlan && selectedFeePlan.id === id) {
      setFeePlanForm({
        institution_type: selectedFeePlan.institution_type,
        basis_type: selectedFeePlan.basis_type,
        unit_cost: selectedFeePlan.unit_cost ? String(selectedFeePlan.unit_cost) : '',
        flat_amount: selectedFeePlan.flat_amount ? String(selectedFeePlan.flat_amount) : '',
        effective_from_year: String(selectedFeePlan.effective_from_year ?? new Date().getFullYear()),
        effective_to_year: selectedFeePlan.effective_to_year ? String(selectedFeePlan.effective_to_year) : '',
        description: selectedFeePlan.description ?? '',
      });
    }
    if (nextType === 'fee-plan-form' && !id) {
      setSelectedId(null);
      setFeePlanForm(emptyFeePlanForm);
    }
    if (nextType === 'invoice') setAdjustmentErrors({});
    if (nextType === 'fee-plan-form') setFeePlanErrors({});
    setModalType(nextType);
  }

  function closeModal() {
    setModalType(null);
    setAdjustmentForm({ adjustment_type: 'manual_adjustment', amount: '', reason_code: '', reason: '' });
    setAdjustmentErrors({});
    setFeePlanErrors({});
  }

  const adjustmentMutation = useMutation({
    mutationFn: async () => {
      if (!invoice) throw new Error('Select an invoice first.');
      const confirmed = await confirmAdminSensitiveAction({ title: 'Confirm invoice adjustment', description: 'Submitting an invoice adjustment changes finance records and requires protected confirmation.', confirmLabel: 'Submit adjustment' });
      if (!confirmed) throw new Error('Security confirmation cancelled.');
      const nextErrors: { adjustment_type?: string; amount?: string } = {};
      if (!adjustmentForm.adjustment_type) nextErrors.adjustment_type = 'Choose an adjustment type to continue.';
      if (!adjustmentForm.amount) nextErrors.amount = 'Enter an adjustment amount to continue.';
      setAdjustmentErrors(nextErrors);
      if (Object.keys(nextErrors).length) throw new Error('Please correct the highlighted fields and try again.');
      return createAdminInvoiceAdjustment(invoice.id, {
        adjustment_type: adjustmentForm.adjustment_type as 'credit_note' | 'manual_adjustment',
        amount: Number(adjustmentForm.amount),
        reason_code: adjustmentForm.reason_code,
        reason: adjustmentForm.reason,
      });
    },
    onSuccess: async (response) => {
      showAdminActionSuccess('Invoice adjustment submitted successfully.', response.message);
      setAdjustmentErrors({});
      await Promise.all([invoiceQuery.refetch(), invoiceDetailQuery.refetch(), invoiceTimelineQuery.refetch(), financeSummaryQuery.refetch()]);
    },
    onError: (error) => {
      setAdjustmentErrors((current) => ({
        adjustment_type: getAdminFieldError(error, ['adjustment_type']) ?? current.adjustment_type,
        amount: getAdminFieldError(error, ['amount']) ?? current.amount,
        reason_code: getAdminFieldError(error, ['reason_code']) ?? current.reason_code,
        reason: getAdminFieldError(error, ['reason']) ?? current.reason,
      }));
      showAdminActionError(error, 'The invoice adjustment could not be saved. Check the adjustment type, amount, and reason, then try again.');
    },
  });

  const createOrUpdateFeePlanMutation = useMutation({
    mutationFn: async () => {
      const nextErrors: { institution_type?: string; basis_type?: string; effective_from_year?: string } = {};
      if (!feePlanForm.institution_type) nextErrors.institution_type = 'Choose an institution type to continue.';
      if (!feePlanForm.basis_type) nextErrors.basis_type = 'Choose a pricing basis to continue.';
      if (!feePlanForm.effective_from_year) nextErrors.effective_from_year = 'Enter the first year this fee plan applies.';
      setFeePlanErrors(nextErrors);
      if (Object.keys(nextErrors).length) throw new Error('Please correct the highlighted fields and try again.');
      const payload = {
        institution_type: feePlanForm.institution_type as 'university' | 'polytechnic' | 'college_of_education' | 'professional_body' | 'religious_organization' | 'corporate_organization' | 'government_agency' | 'ngo' | 'research_institute' | 'library' | 'other',
        basis_type: feePlanForm.basis_type as 'per_student' | 'per_member' | 'per_branch' | 'flat_rate',
        unit_cost: feePlanForm.unit_cost ? Number(feePlanForm.unit_cost) : undefined,
        flat_amount: feePlanForm.flat_amount ? Number(feePlanForm.flat_amount) : undefined,
        effective_from_year: Number(feePlanForm.effective_from_year),
        effective_to_year: feePlanForm.effective_to_year ? Number(feePlanForm.effective_to_year) : undefined,
        description: feePlanForm.description || undefined,
        is_active: true,
      };
      return selectedId ? updateAdminFeePlan(selectedId, payload) : createAdminFeePlan(payload);
    },
    onSuccess: async (response) => {
      showAdminActionSuccess('Fee plan saved successfully.', response.message);
      setFeePlanErrors({});
      await feePlansQuery.refetch();
      closeModal();
    },
    onError: (error) => {
      setFeePlanErrors((current) => ({
        institution_type: getAdminFieldError(error, ['institution_type']) ?? current.institution_type,
        basis_type: getAdminFieldError(error, ['basis_type']) ?? current.basis_type,
        unit_cost: getAdminFieldError(error, ['unit_cost']) ?? current.unit_cost,
        flat_amount: getAdminFieldError(error, ['flat_amount']) ?? current.flat_amount,
        effective_from_year: getAdminFieldError(error, ['effective_from_year']) ?? current.effective_from_year,
        effective_to_year: getAdminFieldError(error, ['effective_to_year']) ?? current.effective_to_year,
        description: getAdminFieldError(error, ['description']) ?? current.description,
      }));
      showAdminActionError(error, 'The fee plan could not be saved. Check the pricing fields and effective years, then try again.');
    },
  });

  const createImportMutation = useMutation({
    mutationFn: async () => {
      const nextErrors: { importType?: string; file?: string } = {};
      if (!importType) nextErrors.importType = 'Choose an import type to continue.';
      if (!importFile) nextErrors.file = 'Upload a CSV file to continue.';
      setImportErrors(nextErrors);
      if (Object.keys(nextErrors).length || !importFile) throw new Error('Please correct the highlighted fields and try again.');
      const selectedFile = importFile;
      return createAdminImport({ import_type: importType as 'members' | 'works' | 'institutions', file: selectedFile });
    },
    onSuccess: async (response) => {
      showAdminActionSuccess('Import batch created successfully.', response.message);
      setImportErrors({});
      setImportFile(null);
      await importsQuery.refetch();
    },
    onError: (error) => {
      setImportErrors((current) => ({
        importType: getAdminFieldError(error, ['import_type']) ?? current.importType,
        file: getAdminFieldError(error, ['file']) ?? current.file,
      }));
      showAdminActionError(error, 'The import batch could not be created. Check the import type and file, then try again.');
    },
  });

  const processImportMutation = useMutation({
    mutationFn: async (batch: ImportBatchResource) => {
      const confirmed = await confirmAdminSensitiveAction({ title: 'Confirm import processing', description: 'Processing this finance import can create or update operational records. Confirm before continuing.', confirmLabel: 'Process batch' });
      if (!confirmed) throw new Error('Security confirmation cancelled.');
      return processAdminImport(batch.id);
    },
    onSuccess: async (response) => {
      showAdminActionSuccess('Import batch processed successfully.', response.message);
      await importsQuery.refetch();
    },
    onError: (error) => showAdminActionError(error, 'The import batch could not be processed.'),
  });

  const activeMeta = tab === 'invoices' ? invoiceQuery.data?.meta : tab === 'payments' ? paymentsQuery.data?.meta : tab === 'licences' ? licencesQuery.data?.meta : tab === 'imports' ? importsQuery.data?.meta : tab === 'audit' ? auditLogsQuery.data?.meta : feePlansQuery.data?.meta;
  const tabHelperText = tab === 'invoices'
    ? 'Review invoice balances, then open a row to inspect settlement, linked records, and adjustments.'
    : tab === 'payments'
      ? 'Inspect payment records, then open a row to review allocation, gateway details, and recent activity.'
      : tab === 'licences'
        ? 'Inspect issued licences, then open a row to review linked billing context and settlement state.'
        : tab === 'fee-plans'
          ? 'Review pricing rules, then open a row to inspect effective years and billing basis.'
          : tab === 'imports'
            ? 'Review finance import batches, then open a row to inspect status, file details, and processing outcomes.'
            : 'Inspect finance audit entries, then open a row to review before-and-after payload context.';
  const searchPlaceholder = tab === 'invoices'
    ? 'Search invoices by reference, institution, or billing year'
    : tab === 'payments'
      ? 'Search payments by reference, institution, or gateway ref'
      : tab === 'licences'
        ? 'Search licences by number, institution, or linked invoice'
        : tab === 'imports'
          ? 'Search import batches by file, type, or status'
          : tab === 'audit'
            ? 'Search audit entries by action, actor, or reference'
            : 'Search fee plans by institution type, basis, or year';
  const countSubject = tab === 'invoices'
    ? 'invoices'
    : tab === 'payments'
      ? 'payments'
      : tab === 'licences'
        ? 'licences'
        : tab === 'imports'
          ? 'import batches'
          : tab === 'audit'
            ? 'audit entries'
            : 'fee plans';
  const countHelper = tab === 'invoices'
    ? `${activeMeta?.total ?? 0} invoice records in the current finance view`
    : tab === 'payments'
      ? `${activeMeta?.total ?? 0} payment records in the current finance view`
      : tab === 'licences'
        ? `${activeMeta?.total ?? 0} licence records in the current finance view`
        : tab === 'imports'
          ? `${activeMeta?.total ?? 0} import batches in the current finance view`
          : tab === 'audit'
            ? `${activeMeta?.total ?? 0} audit entries in the current finance view`
            : `${activeMeta?.total ?? 0} fee plan records in the current pricing view`;

  return (
    <div className="space-y-6">
      <SectionHeader title="Admin finance and controls" description="Invoices, payments, plans, imports, audit." actions={tab === 'payments' || tab === 'licences' ? <Button variant="outline" disabled={isExporting} onClick={async () => { try { setIsExporting(true); const response = tab === 'payments' ? await downloadAdminPaymentsExport({ search: search || undefined, payment_status: status || undefined, date_from: dateFrom || undefined, date_to: dateTo || undefined }) : await downloadAdminLicencesExport({ search: search || undefined, licence_status: status || undefined, date_from: dateFrom || undefined, date_to: dateTo || undefined }); triggerBlobDownload(response.blob, response.filename); showAdminExportSuccess(tab === 'payments' ? 'Payments' : 'Licences'); } catch { showAdminExportError(tab === 'payments' ? 'Payments' : 'Licences'); } finally { setIsExporting(false); } }}>{isExporting ? 'Exporting…' : 'Export CSV'}</Button> : undefined} />

      <div className="flex flex-wrap gap-2">
        {tabOptions.map((option) => (
          <Button key={option.key} variant={tab === option.key ? 'default' : 'outline'} onClick={() => { setTab(option.key); setSelectedId(null); setPage(1); setSearch(''); setStatus(''); setDateFrom(''); setDateTo(''); setRecordsModalOpen(true); }}>
            {option.label}
          </Button>
        ))}
      </div>
      <p className="text-sm text-[#667085] dark:text-slate-300">{tabHelperText}</p>
      <ListCountSummary meta={activeMeta} subject={countSubject} helper={countHelper} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard variant={statCardVariantAt(0)} label="Total payments" value={financeSummaryQuery.data?.totals.total_payments ?? '—'} hint="Recorded payment attempts" icon={<CreditCard className="h-6 w-6" />} />
        <StatCard variant={statCardVariantAt(1)} label="Total amount" value={formatCurrency(financeSummaryQuery.data?.totals.total_amount ?? 0, 'NGN')} hint="Gross payment value" icon={<Wallet className="h-6 w-6" />} compactValue />
        <StatCard variant={statCardVariantAt(2)} label="Paid amount" value={formatCurrency(financeSummaryQuery.data?.totals.total_paid_amount ?? 0, 'NGN')} hint={`${financeSummaryQuery.data?.status_breakdown.paid ?? 0} settled payments`} icon={<BarChart3 className="h-6 w-6" />} compactValue />
        <StatCard variant={statCardVariantAt(3)} label="Pending amount" value={formatCurrency(financeSummaryQuery.data?.totals.total_pending_amount ?? 0, 'NGN')} hint={`${financeSummaryQuery.data?.status_breakdown.pending ?? 0} pending • ${financeSummaryQuery.data?.status_breakdown.failed ?? 0} failed payments`} compactValue />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
        <div className="rounded-2xl border border-[#EAECF0] dark:border-slate-800 bg-white dark:bg-slate-950 p-5">
          <p className="text-sm font-semibold text-[#101828]">Payment status breakdown</p>
          <div className="mt-4 space-y-3">
            {[
              { label: 'Paid', value: financeSummaryQuery.data?.status_breakdown.paid ?? 0 },
              { label: 'Pending', value: financeSummaryQuery.data?.status_breakdown.pending ?? 0 },
              { label: 'Failed', value: financeSummaryQuery.data?.status_breakdown.failed ?? 0 },
            ].map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex items-center justify-between text-sm text-[#475467] dark:text-slate-300"><span>{item.label}</span><span className="font-medium text-[#101828]">{item.value}</span></div>
                <div className="h-2 rounded-full bg-[#F2F4F7]"><div className="h-2 rounded-full bg-[#AF1512]" style={{ width: `${Math.max(8, ((item.value || 0) / Math.max(1, (financeSummaryQuery.data?.totals.total_payments ?? 1))) * 100)}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-[#EAECF0] dark:border-slate-800 bg-white dark:bg-slate-950 p-5">
          <p className="text-sm font-semibold text-[#101828]">Recent payments</p>
          <div className="mt-4 space-y-3">
            {(financeSummaryQuery.data?.recent_payments ?? []).length ? (financeSummaryQuery.data?.recent_payments ?? []).map((payment) => (
              <div key={payment.id} className="flex items-center justify-between rounded-xl bg-[#F9FAFB] px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-[#101828]">{payment.payment_reference ?? `Payment #${payment.id}`}</p>
                  <p className="text-xs text-[#667085] dark:text-slate-300">{payment.institution?.name ?? 'Unknown institution'} • {formatDate(payment.paid_at ?? payment.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-[#101828]">{formatCurrency(payment.amount, payment.currency ?? 'NGN')}</p>
                  <StatusBadge value={payment.payment_status} />
                </div>
              </div>
            )) : <p className="text-sm text-[#667085] dark:text-slate-300">No recent payments yet. Process or reconcile payments to populate this activity list.</p>}
          </div>
        </div>
      </div>

      <div className="hidden">
      <SearchFilterBar search={search} onSearchChange={setSearch} status={status} onStatusChange={setStatus} statusOptions={tab === 'invoices' || tab === 'payments' ? financeStatusOptions : undefined} searchPlaceholder={searchPlaceholder} dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} onReset={resetFilters} />

      {tab === 'invoices' ? (
        <div className="space-y-4">
          <DataTable columns={[
            { key: 'number', header: 'Invoice', render: (row: InvoiceResource) => <CompactReference primary={row.invoice_number ?? `#${row.id}`} secondary={row.invoice_type ?? 'Type not set'} tertiary={row.billing_year ? `Billing year ${row.billing_year}` : undefined} /> },
            { key: 'linked', header: 'Linked records', render: (row: InvoiceResource) => <InvoiceLinkedRefsCell row={row} /> },
            { key: 'status', header: 'Status', render: (row: InvoiceResource) => <CompactStatusStack primary={row.status} secondary={row.settlement_summary?.state} /> },
            { key: 'amounts', header: 'Amounts', render: (row: InvoiceResource) => <CompactMoneySummary primary={row.total_amount} secondary={row.amount_paid} tertiary={row.outstanding_amount} currency={row.currency} /> },
            { key: 'due', header: 'Due / issued', render: (row: InvoiceResource) => <CompactReference primary={formatDate(row.due_date)} secondary={row.settlement_summary?.label ?? 'Settlement pending'} tertiary={row.issue_date ? `Issued ${formatDate(row.issue_date)}` : undefined} /> },
          ]} rows={invoiceQuery.data?.data ?? []} isLoading={invoiceQuery.isLoading} loadingTitle="Loading invoices" loadingDescription="The latest invoices are being fetched from the backend." onRowClick={(row) => openModal('invoice', row.id)} selectedRowKey={modalType === 'invoice' ? selectedId ?? undefined : undefined} getRowKey={(row) => row.id} exportTitle="Admin finance invoices" emptyTitle="No invoices match this view" emptyDescription="Adjust the current filters or create new billing activity to populate invoice rows." />
          <PaginationBar meta={activeMeta} onPageChange={setPage} subject={countSubject} perPage={perPage} onPerPageChange={setPerPage} />
        </div>
      ) : null}

      {tab === 'payments' ? (
        <div className="space-y-4">
          <DataTable columns={[
            { key: 'reference', header: 'Payment', render: (row: LicencePaymentResource) => <CompactReference primary={row.payment_reference ?? `#${row.id}`} secondary={row.gateway_name ?? 'Gateway not set'} tertiary={row.gateway_reference ?? undefined} /> },
            { key: 'linked', header: 'Linked records', render: (row: LicencePaymentResource) => <PaymentLinkedRefsCell row={row} /> },
            { key: 'status', header: 'Status', render: (row: LicencePaymentResource) => <CompactStatusStack primary={row.payment_status} secondary={row.settlement_summary?.state} /> },
            { key: 'amounts', header: 'Amounts', render: (row: LicencePaymentResource) => <CompactMoneySummary primary={row.amount} secondary={row.amount_allocated} tertiary={row.balance_after} currency={row.currency} /> },
            { key: 'paid_at', header: 'Paid / due', render: (row: LicencePaymentResource) => <CompactReference primary={formatDate(row.paid_at ?? row.created_at)} secondary={row.settlement_summary?.label ?? 'Settlement pending'} tertiary={row.invoice?.due_date ? `Invoice due ${formatDate(row.invoice.due_date)}` : row.settlement_summary?.due_date ? `Due ${formatDate(row.settlement_summary.due_date)}` : undefined} /> },
          ]} rows={paymentsQuery.data?.data ?? []} isLoading={paymentsQuery.isLoading} loadingTitle="Loading payments" loadingDescription="The latest payments are being fetched from the backend." onRowClick={(row) => openModal('payment', row.id)} selectedRowKey={modalType === 'payment' ? selectedId ?? undefined : undefined} getRowKey={(row) => row.id} exportTitle="Admin finance payments" emptyTitle="No payments match this view" emptyDescription="Adjust the current filters or process new receipts to populate payment rows." />
          <PaginationBar meta={activeMeta} onPageChange={setPage} subject={countSubject} perPage={perPage} onPerPageChange={setPerPage} />
        </div>
      ) : null}

      {tab === 'licences' ? (
        <div className="space-y-4">
          <DataTable columns={[
            { key: 'number', header: 'Licence', render: (row: LicenceResource) => row.licence_number ?? `#${row.id}` },
            { key: 'year', header: 'Year', render: (row: LicenceResource) => row.licence_year ?? '—' },
            { key: 'licence_status', header: 'Status', render: (row: LicenceResource) => <StatusBadge value={row.licence_status} /> },
            { key: 'payment_status', header: 'Payment', render: (row: LicenceResource) => <StatusBadge value={row.payment_status} /> },
          ]} rows={licencesQuery.data?.data ?? []} isLoading={licencesQuery.isLoading} loadingTitle="Loading licences" loadingDescription="The latest licences are being fetched from the backend." onRowClick={(row) => openModal('licence', row.id)} selectedRowKey={modalType === 'licence' ? selectedId ?? undefined : undefined} getRowKey={(row) => row.id} exportTitle="Admin finance licences" emptyTitle="No licences match this view" emptyDescription="Adjust the current filters or complete declaration and finance processing to populate licence rows." />
          <PaginationBar meta={activeMeta} onPageChange={setPage} subject={countSubject} perPage={perPage} onPerPageChange={setPerPage} />
        </div>
      ) : null}

      {tab === 'fee-plans' ? (
        <div className="space-y-4">
          <SectionHeader title="Fee plans" description="Per-type pricing rules." action={<Button onClick={() => openModal('fee-plan-form')}>New fee plan</Button>} />
          <DataTable columns={[
            { key: 'institution_type', header: 'Institution type', render: (row: LicensingFeePlanResource) => row.institution_type_label ?? row.institution_type },
            { key: 'basis_type', header: 'Basis', render: (row: LicensingFeePlanResource) => row.basis_type_label ?? row.basis_type },
            { key: 'unit_cost', header: 'Unit cost', render: (row: LicensingFeePlanResource) => formatCurrency(row.unit_cost) },
            { key: 'active', header: 'Active', render: (row: LicensingFeePlanResource) => <StatusBadge value={row.active_status ?? (row.is_active ? 'active' : 'inactive')} label={row.active_label} /> },
            { key: 'actions', header: '', render: (row: LicensingFeePlanResource) => <FeePlanActions onView={() => openModal('fee-plan', row.id)} onEdit={() => { setSelectedId(row.id); setFeePlanForm({ institution_type: row.institution_type, basis_type: row.basis_type, unit_cost: row.unit_cost ? String(row.unit_cost) : '', flat_amount: row.flat_amount ? String(row.flat_amount) : '', effective_from_year: String(row.effective_from_year ?? new Date().getFullYear()), effective_to_year: row.effective_to_year ? String(row.effective_to_year) : '', description: row.description ?? '' }); setModalType('fee-plan-form'); }} /> },
          ]} rows={feePlansQuery.data?.data ?? []} getRowKey={(row) => row.id} />
          <PaginationBar meta={activeMeta} onPageChange={setPage} subject={countSubject} perPage={perPage} onPerPageChange={setPerPage} />
        </div>
      ) : null}

      {tab === 'imports' ? (
        <div className="space-y-4"><div className="rounded-2xl border border-[#EAECF0] dark:border-slate-800 bg-white dark:bg-slate-950 p-5"><SectionHeader title="Create import batch" description="Upload CSV, then run batch." /><div className="space-y-4"><div className="space-y-2"><label className="text-sm font-medium text-slate-700 dark:text-slate-300">Import type<span className="ml-1 text-red-600 dark:text-red-400">*</span></label><select value={importType} onChange={(event) => { setImportType(event.target.value as '' | 'members' | 'works' | 'institutions'); setImportErrors((current) => ({ ...current, importType: undefined })); }} className="h-10 w-full rounded-xl border border-slate-300 bg-white dark:bg-slate-950 px-3 text-sm"><option value="" disabled>Select import type</option><option value="members">Members</option><option value="works">Works</option><option value="institutions">Institutions</option></select>{importErrors.importType ? <p className="text-sm text-[#B42318]">{importErrors.importType}</p> : <p className="text-sm text-[#6B788E] dark:text-slate-300">Choose the record group that matches the uploaded file.</p>}</div><div className="space-y-2"><label className="text-sm font-medium text-slate-700 dark:text-slate-300">File<span className="ml-1 text-red-600 dark:text-red-400">*</span></label><input type="file" accept=".csv,.txt" onChange={(event) => { setImportFile(event.target.files?.[0] ?? null); setImportErrors((current) => ({ ...current, file: undefined })); }} className="block text-sm text-slate-600" />{importErrors.file ? <p className="text-sm text-[#B42318]">{importErrors.file}</p> : <p className="text-sm text-[#6B788E] dark:text-slate-300">Upload a CSV file that matches the selected import type.</p>}</div><Button onClick={() => createImportMutation.mutate()} disabled={createImportMutation.isPending}>{createImportMutation.isPending ? 'Creating…' : 'Create batch'}</Button></div></div><DataTable columns={[{ key: 'file', header: 'File', render: (row: ImportBatchResource) => row.source_filename ?? `Batch #${row.id}` }, { key: 'type', header: 'Type', render: (row: ImportBatchResource) => formatDisplayLabel(row.import_type) }, { key: 'status', header: 'Status', render: (row: ImportBatchResource) => <StatusBadge value={row.status} /> }, { key: 'rows', header: 'Rows', render: (row: ImportBatchResource) => row.total_rows ?? '—' }, { key: 'actions', header: 'Action', render: (row: ImportBatchResource) => <TableActions><TableActionButton className={neutralActionButtonClass} onClick={() => processImportMutation.mutate(row)} disabled={processImportMutation.isPending}>{processImportMutation.isPending ? 'Processing…' : 'Process batch'}</TableActionButton></TableActions> }]} rows={importsQuery.data?.data ?? []} isLoading={importsQuery.isLoading} loadingTitle="Loading import batches" loadingDescription="The latest import batches are being fetched from the backend." getRowKey={(row) => row.id} /><PaginationBar meta={activeMeta} onPageChange={setPage} subject={countSubject} perPage={perPage} onPerPageChange={setPerPage} /></div>
      ) : null}

      {tab === 'audit' ? (
        <div className="space-y-4">
          <DataTable columns={[
            { key: 'action', header: 'Action', render: (row: AuditLogResource) => row.action },
            { key: 'subject', header: 'Subject', render: (row: AuditLogResource) => `${row.subject_type ?? '—'} #${row.subject_id ?? '—'}` },
            { key: 'actor', header: 'Actor', render: (row: AuditLogResource) => row.actor?.name ?? 'System' },
            { key: 'created', header: 'Created', render: (row: AuditLogResource) => formatDate(row.created_at) },
          ]} rows={auditLogsQuery.data?.data ?? []} isLoading={auditLogsQuery.isLoading} loadingTitle="Loading audit logs" loadingDescription="The latest finance audit records are being fetched from the backend." onRowClick={(row) => openModal('audit', row.id)} selectedRowKey={modalType === 'audit' ? selectedId ?? undefined : undefined} getRowKey={(row) => row.id} emptyTitle="No finance audit records found" emptyDescription="Recent finance actions will appear here after invoice, payment, plan, or import activity." />
          <PaginationBar meta={activeMeta} onPageChange={setPage} subject={countSubject} perPage={perPage} onPerPageChange={setPerPage} />
        </div>
      ) : null}

      </div>

      <Modal
        open={recordsModalOpen}
        onClose={() => setRecordsModalOpen(false)}
        title={tab === 'invoices' ? 'Invoices' : tab === 'payments' ? 'Payments' : tab === 'licences' ? 'Licences' : 'Fee Plans'}
        subtitle={tab === 'fee-plans' ? 'Per-type pricing.' : 'Filter and open a row.'}
        size="xl"
      >
        <div className="space-y-4">
          <SearchFilterBar search={search} onSearchChange={setSearch} status={status} onStatusChange={setStatus} statusOptions={tab === 'invoices' || tab === 'payments' ? financeStatusOptions : undefined} searchPlaceholder={searchPlaceholder} dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} onReset={resetFilters} />

          {tab === 'invoices' ? (
            <div className="space-y-4">
              <DataTable columns={[
                { key: 'number', header: 'Invoice', render: (row: InvoiceResource) => <CompactReference primary={row.invoice_number ?? `#${row.id}`} secondary={row.invoice_type ?? 'Type not set'} tertiary={row.billing_year ? `Billing year ${row.billing_year}` : undefined} /> },
                { key: 'linked', header: 'Linked records', render: (row: InvoiceResource) => <InvoiceLinkedRefsCell row={row} /> },
                { key: 'status', header: 'Status', render: (row: InvoiceResource) => <CompactStatusStack primary={row.status} secondary={row.settlement_summary?.state} /> },
                { key: 'amounts', header: 'Amounts', render: (row: InvoiceResource) => <CompactMoneySummary primary={row.total_amount} secondary={row.amount_paid} tertiary={row.outstanding_amount} currency={row.currency} /> },
                { key: 'due', header: 'Due / issued', render: (row: InvoiceResource) => <CompactReference primary={formatDate(row.due_date)} secondary={row.settlement_summary?.label ?? 'Settlement pending'} tertiary={row.issue_date ? `Issued ${formatDate(row.issue_date)}` : undefined} /> },
              ]} rows={invoiceQuery.data?.data ?? []} isLoading={invoiceQuery.isLoading} loadingTitle="Loading record" loadingDescription="Please wait…preparing selected resource." onRowClick={(row) => openModal('invoice', row.id)} selectedRowKey={modalType === 'invoice' ? selectedId ?? undefined : undefined} getRowKey={(row) => row.id} exportTitle="Admin finance invoices" emptyTitle="No invoices match this view" emptyDescription="Adjust the current filters or create new billing activity to populate invoice rows." />
              <PaginationBar meta={activeMeta} onPageChange={setPage} subject={countSubject} perPage={perPage} onPerPageChange={setPerPage} />
            </div>
          ) : null}

          {tab === 'payments' ? (
            <div className="space-y-4">
              <DataTable columns={[
                { key: 'reference', header: 'Payment', render: (row: LicencePaymentResource) => <CompactReference primary={row.payment_reference ?? `#${row.id}`} secondary={row.gateway_name ?? 'Gateway not set'} tertiary={row.gateway_reference ?? undefined} /> },
                { key: 'linked', header: 'Linked records', render: (row: LicencePaymentResource) => <PaymentLinkedRefsCell row={row} /> },
                { key: 'status', header: 'Status', render: (row: LicencePaymentResource) => <CompactStatusStack primary={row.payment_status} secondary={row.settlement_summary?.state} /> },
                { key: 'amounts', header: 'Amounts', render: (row: LicencePaymentResource) => <CompactMoneySummary primary={row.amount} secondary={row.amount_allocated} tertiary={row.balance_after} currency={row.currency} /> },
                { key: 'paid_at', header: 'Paid / due', render: (row: LicencePaymentResource) => <CompactReference primary={formatDate(row.paid_at ?? row.created_at)} secondary={row.settlement_summary?.label ?? 'Settlement pending'} tertiary={row.invoice?.due_date ? `Invoice due ${formatDate(row.invoice.due_date)}` : row.settlement_summary?.due_date ? `Due ${formatDate(row.settlement_summary.due_date)}` : undefined} /> },
              ]} rows={paymentsQuery.data?.data ?? []} isLoading={paymentsQuery.isLoading} loadingTitle="Loading record" loadingDescription="Please wait…preparing selected resource." onRowClick={(row) => openModal('payment', row.id)} selectedRowKey={modalType === 'payment' ? selectedId ?? undefined : undefined} getRowKey={(row) => row.id} exportTitle="Admin finance payments" emptyTitle="No payments match this view" emptyDescription="Adjust the current filters or process new receipts to populate payment rows." />
              <PaginationBar meta={activeMeta} onPageChange={setPage} subject={countSubject} perPage={perPage} onPerPageChange={setPerPage} />
            </div>
          ) : null}

          {tab === 'licences' ? (
            <div className="space-y-4">
              <DataTable columns={[
                { key: 'number', header: 'Licence', render: (row: LicenceResource) => row.licence_number ?? `#${row.id}` },
                { key: 'year', header: 'Year', render: (row: LicenceResource) => row.licence_year ?? '—' },
                { key: 'licence_status', header: 'Status', render: (row: LicenceResource) => <StatusBadge value={row.licence_status} /> },
                { key: 'payment_status', header: 'Payment', render: (row: LicenceResource) => <StatusBadge value={row.payment_status} /> },
              ]} rows={licencesQuery.data?.data ?? []} isLoading={licencesQuery.isLoading} loadingTitle="Loading record" loadingDescription="Please wait…preparing selected resource." onRowClick={(row) => openModal('licence', row.id)} selectedRowKey={modalType === 'licence' ? selectedId ?? undefined : undefined} getRowKey={(row) => row.id} exportTitle="Admin finance licences" emptyTitle="No licences match this view" emptyDescription="Adjust the current filters or complete declaration and finance processing to populate licence rows." />
              <PaginationBar meta={activeMeta} onPageChange={setPage} subject={countSubject} perPage={perPage} onPerPageChange={setPerPage} />
            </div>
          ) : null}

          {tab === 'fee-plans' ? (
            <div className="space-y-4">
              <div className="flex justify-end"><Button onClick={() => openModal('fee-plan-form')}>New fee plan</Button></div>
              <DataTable columns={[
                { key: 'institution_type', header: 'Institution type', render: (row: LicensingFeePlanResource) => row.institution_type_label ?? row.institution_type },
                { key: 'basis_type', header: 'Basis', render: (row: LicensingFeePlanResource) => row.basis_type_label ?? row.basis_type },
                { key: 'unit_cost', header: 'Unit cost', render: (row: LicensingFeePlanResource) => formatCurrency(row.unit_cost) },
                { key: 'active', header: 'Active', render: (row: LicensingFeePlanResource) => <StatusBadge value={row.is_active ? 'active' : 'inactive'} /> },
                { key: 'actions', header: '', render: (row: LicensingFeePlanResource) => <FeePlanActions onView={() => openModal('fee-plan', row.id)} onEdit={() => { setSelectedId(row.id); setFeePlanForm({ institution_type: row.institution_type, basis_type: row.basis_type, unit_cost: row.unit_cost ? String(row.unit_cost) : '', flat_amount: row.flat_amount ? String(row.flat_amount) : '', effective_from_year: String(row.effective_from_year ?? new Date().getFullYear()), effective_to_year: row.effective_to_year ? String(row.effective_to_year) : '', description: row.description ?? '' }); setModalType('fee-plan-form'); }} /> },
              ]} rows={feePlansQuery.data?.data ?? []} isLoading={feePlansQuery.isLoading} loadingTitle="Loading record" loadingDescription="Please wait…preparing selected resource." getRowKey={(row) => row.id} emptyTitle="No fee plans match this view" emptyDescription="Create a fee plan to populate this list." />
              <PaginationBar meta={activeMeta} onPageChange={setPage} subject={countSubject} perPage={perPage} onPerPageChange={setPerPage} />
            </div>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={modalType !== null && modalType !== 'fee-plan-form' ? modalType !== null : false}
        onClose={closeModal}
        title={modalType === 'invoice' ? 'Invoice details' : modalType === 'payment' ? 'Payment details' : modalType === 'licence' ? 'Licence details' : modalType === 'fee-plan' ? 'Fee plan details' : modalType === 'audit' ? 'Audit log details' : ''}
        subtitle="Selected record details."
        size="lg"
      >
        {modalType === 'invoice' ? (invoiceDetailQuery.isLoading ? <DetailPanelState mode="loading" title="Loading invoice" description="Please wait…preparing selected resource." /> : invoice ? <div className="space-y-5"><SettlementBanner summary={invoice.settlement_summary} /><div className="grid gap-4 md:grid-cols-3"><StatCard variant={statCardVariantAt(0)} label="Invoice total" value={formatCurrency(invoice.total_amount, invoice.currency ?? 'NGN')} hint={invoice.invoice_type ? `Type • ${invoice.invoice_type}` : 'Type • Not set'} icon={<BarChart3 className="h-6 w-6" />} compactValue /><StatCard variant={statCardVariantAt(1)} label="Amount paid" value={formatCurrency(invoice.amount_paid, invoice.currency ?? 'NGN')} hint={`${invoice.audit_summary?.payment_count ?? invoice.payments?.length ?? 0} payments linked`} icon={<Wallet className="h-6 w-6" />} compactValue /><StatCard variant={statCardVariantAt(2)} label="Outstanding" value={formatCurrency(invoice.outstanding_amount, invoice.currency ?? 'NGN')} hint={invoice.due_date ? `Due • ${formatDate(invoice.due_date)}` : 'Due • Not set'} icon={<AlertCircle className="h-6 w-6" />} compactValue /></div><div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-[#EAECF0] dark:border-slate-800 bg-[#FCFCFD] p-5"><div><h3 className="text-xl font-semibold text-[#101828]">{invoice.invoice_number ?? `Invoice #${invoice.id}`}</h3><p className="mt-1 text-sm text-[#667085] dark:text-slate-300">{invoice.institution?.name ?? invoice.related_entities?.institution?.name ?? 'Institution not linked'} · Billing year {invoice.billing_year ?? '—'}</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" disabled={financePdfExporting} onClick={() => {
                  void (async () => {
                    if (!selectedId) return;
                    setFinancePdfExporting(true);
                    try {
                      await exportDetailToPdfWhenReady(invoice.invoice_number ?? `Invoice-${selectedId}`, {
                        prepare: () => queryClient.fetchQuery({ queryKey: queryKeys.adminInvoice(selectedId), queryFn: () => getAdminInvoice(selectedId) }),
                        buildFields: () => {
                          const fresh = queryClient.getQueryData<Awaited<ReturnType<typeof getAdminInvoice>>>(queryKeys.adminInvoice(selectedId));
                          const row = fresh?.data ?? invoice;
                          return buildAdminInvoicePdfFields(row);
                        },
                        header: { eyebrow: 'Official document — Admin finance', organizationName: 'REPRONIG' },
                      });
                    } finally {
                      setFinancePdfExporting(false);
                    }
                  })();
                }}>{financePdfExporting ? 'Preparing PDF…' : 'Export PDF'}</Button><StatusBadge value={invoice.status} /><StatusBadge value={invoice.settlement_summary?.state ?? 'outstanding'} /></div></div><DetailGrid items={[{ label: 'Invoice reference', value: invoice.invoice_number ?? `#${invoice.id}` }, { label: 'Invoice type', value: invoice.invoice_type ?? '—' }, { label: 'Status', value: <StatusBadge value={invoice.status} /> }, { label: 'Settlement', value: <StatusBadge value={invoice.settlement_summary?.state ?? 'outstanding'} /> }, { label: 'Issued on', value: formatDate(invoice.issue_date) }, { label: 'Due on', value: formatDate(invoice.due_date) }, { label: 'Subtotal', value: formatCurrency(invoice.subtotal_amount, invoice.currency ?? 'NGN') }, { label: 'Total', value: formatCurrency(invoice.total_amount, invoice.currency ?? 'NGN') }, { label: 'Amount paid', value: formatCurrency(invoice.amount_paid, invoice.currency ?? 'NGN') }, { label: 'Outstanding', value: formatCurrency(invoice.outstanding_amount, invoice.currency ?? 'NGN') }]} /><LinkedInvoiceRecords invoice={invoice} /><div className="grid gap-4 md:grid-cols-3"><SummaryCard label="Adjustments" value={invoice.audit_summary?.adjustment_count ?? invoice.adjustments?.length ?? 0} hint={invoice.adjustments?.[0]?.applied_at ? `Latest • ${formatDate(invoice.adjustments[0].applied_at)}` : 'Latest • None'} /><SummaryCard label="Recent actions" value={invoice.audit_summary?.recent_action_count ?? 0} hint={invoice.audit_summary?.last_action_at ? `Last action • ${formatDate(invoice.audit_summary.last_action_at)}` : 'Last action • None'} /><SummaryCard label="Linked payments" value={invoice.audit_summary?.payment_count ?? invoice.payments?.length ?? 0} hint={invoice.licence?.licence_number ? `Licence • ${invoice.licence.licence_number}` : 'Licence • Not linked'} /></div><div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]"><InvoiceRecentActions invoice={invoice} /><ActivityTimeline items={(invoiceTimelineQuery.data?.data ?? []) as TimelineEventResource[]} isLoading={invoiceTimelineQuery.isLoading} emptyTitle="No invoice timeline yet" /></div><div className="rounded-2xl border border-[#EAECF0] dark:border-slate-800 p-5"><SectionHeader title="Create adjustment" description="Capture the adjustment details that apply to this invoice." /><div className="space-y-4"><div className="space-y-2"><label className="text-sm font-medium text-slate-700 dark:text-slate-300">Adjustment type</label><select value={adjustmentForm.adjustment_type} onChange={(event) => { setAdjustmentForm((current) => ({ ...current, adjustment_type: event.target.value })); setAdjustmentErrors((current) => ({ ...current, adjustment_type: undefined })); }} className="h-10 w-full rounded-xl border border-slate-300 bg-white dark:bg-slate-950 px-3 text-sm"><option value="" disabled>Select adjustment type</option><option value="manual_adjustment">Manual adjustment</option><option value="credit_note">Credit note</option></select>{adjustmentErrors.adjustment_type ? <p className="text-sm text-[#B42318]">{adjustmentErrors.adjustment_type}</p> : <p className="text-sm text-[#6B788E] dark:text-slate-300">Choose how this invoice balance should be updated.</p>}</div><FormField label="Amount" requiredIndicator type="number" error={adjustmentErrors.amount} helperText="Enter the adjustment amount in the invoice currency." value={adjustmentForm.amount} onChange={(event) => { setAdjustmentForm((current) => ({ ...current, amount: event.target.value })); setAdjustmentErrors((current) => ({ ...current, amount: undefined })); }} /><FormField label="Reason code" placeholder="Enter reason code" error={adjustmentErrors.reason_code} value={adjustmentForm.reason_code} onChange={(event) => { setAdjustmentForm((current) => ({ ...current, reason_code: event.target.value })); setAdjustmentErrors((current) => ({ ...current, reason_code: undefined })); }} /><FormTextareaField label="Reason" placeholder="Add a short adjustment note" error={adjustmentErrors.reason} value={adjustmentForm.reason} onChange={(event) => { setAdjustmentForm((current) => ({ ...current, reason: event.target.value })); setAdjustmentErrors((current) => ({ ...current, reason: undefined })); }} /><Button onClick={() => adjustmentMutation.mutate()} disabled={adjustmentMutation.isPending}>{adjustmentMutation.isPending ? 'Saving…' : 'Save adjustment'}</Button></div></div></div> : <DetailPanelState mode="empty" title="No invoice selected" description="Choose an invoice from the table to review totals, linked records, and available adjustments." />) : null}
        {modalType === 'payment' ? (paymentDetailQuery.isLoading ? <DetailPanelState mode="loading" title="Loading payment" description="Please wait…preparing selected resource." /> : payment ? <div className="space-y-5"><SettlementBanner summary={payment.settlement_summary} /><div className="grid gap-4 md:grid-cols-3"><StatCard variant={statCardVariantAt(0)} label="Payment amount" value={formatCurrency(payment.amount, payment.currency ?? 'NGN')} hint={payment.gateway_name ? `Gateway • ${payment.gateway_name}` : 'Gateway • Not set'} icon={<CreditCard className="h-6 w-6" />} compactValue /><StatCard variant={statCardVariantAt(1)} label="Allocated" value={formatCurrency(payment.amount_allocated ?? payment.amount, payment.currency ?? 'NGN')} hint={payment.invoice?.invoice_number ? `Invoice • ${payment.invoice.invoice_number}` : 'Invoice • Not linked'} icon={<Wallet className="h-6 w-6" />} compactValue /><StatCard variant={statCardVariantAt(2)} label="Balance after" value={formatCurrency(payment.balance_after, payment.currency ?? 'NGN')} hint={payment.paid_at ? `Paid • ${formatDate(payment.paid_at)}` : 'Paid • Pending'} icon={<Receipt className="h-6 w-6" />} compactValue /></div><div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-[#EAECF0] dark:border-slate-800 bg-[#FCFCFD] p-5"><div><h3 className="text-xl font-semibold text-[#101828]">{payment.payment_reference ?? `Payment #${payment.id}`}</h3><p className="mt-1 text-sm text-[#667085] dark:text-slate-300">{payment.institution?.name ?? payment.related_entities?.institution?.name ?? 'Institution not linked'} · {payment.gateway_reference ?? 'No gateway reference'}</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" disabled={financePdfExporting} onClick={() => {
                  void (async () => {
                    if (!selectedId) return;
                    setFinancePdfExporting(true);
                    try {
                      await exportDetailToPdfWhenReady(payment.payment_reference ?? `Payment-${selectedId}`, {
                        prepare: () => queryClient.fetchQuery({ queryKey: queryKeys.adminPayment(selectedId), queryFn: () => getAdminPayment(selectedId) }),
                        buildFields: () => {
                          const fresh = queryClient.getQueryData<Awaited<ReturnType<typeof getAdminPayment>>>(queryKeys.adminPayment(selectedId));
                          const row = fresh?.data ?? payment;
                          return buildAdminPaymentPdfFields(row);
                        },
                        header: { eyebrow: 'Official document — Admin finance', organizationName: 'REPRONIG' },
                      });
                    } finally {
                      setFinancePdfExporting(false);
                    }
                  })();
                }}>{financePdfExporting ? 'Preparing PDF…' : 'Export PDF'}</Button><StatusBadge value={payment.payment_status} /><StatusBadge value={payment.settlement_summary?.state ?? 'outstanding'} /></div></div><DetailGrid items={[{ label: 'Payment reference', value: payment.payment_reference ?? `#${payment.id}` }, { label: 'Payment status', value: <StatusBadge value={payment.payment_status} /> }, { label: 'Settlement', value: <StatusBadge value={payment.settlement_summary?.state ?? 'outstanding'} /> }, { label: 'Gateway', value: payment.gateway_name ?? '—' }, { label: 'Gateway reference', value: payment.gateway_reference ?? '—' }, { label: 'Amount', value: formatCurrency(payment.amount, payment.currency ?? 'NGN') }, { label: 'Allocated', value: formatCurrency(payment.amount_allocated ?? payment.amount, payment.currency ?? 'NGN') }, { label: 'Balance before', value: formatCurrency(payment.balance_before, payment.currency ?? 'NGN') }, { label: 'Balance after', value: formatCurrency(payment.balance_after, payment.currency ?? 'NGN') }, { label: 'Paid on', value: formatDate(payment.paid_at) }]} /><LinkedPaymentRecords payment={payment} /><div className="grid gap-4 md:grid-cols-3"><SummaryCard label="Recent actions" value={payment.audit_summary?.recent_action_count ?? 0} hint={payment.audit_summary?.last_action_at ? `Last action • ${formatDate(payment.audit_summary.last_action_at)}` : 'Last action • None'} /><SummaryCard label="Reconciliations" value={payment.audit_summary?.reconciliation_count ?? 0} hint={payment.invoice?.status ? `Invoice status • ${payment.invoice.status}` : 'Invoice status • Unavailable'} /><SummaryCard label="Linked declaration" value={payment.declaration?.id ? `#${payment.declaration.id}` : 'Not linked'} hint={payment.declaration?.licensing_year ? `Year • ${payment.declaration.licensing_year}` : 'Year • Not set'} /></div><div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]"><PaymentRecentActions payment={payment} /><ActivityTimeline items={(paymentTimelineQuery.data?.data ?? []) as TimelineEventResource[]} isLoading={paymentTimelineQuery.isLoading} emptyTitle="No payment timeline yet" /></div></div> : <DetailPanelState mode="empty" title="No payment selected" description="Choose a payment from the table to review allocation, linkage, and recent finance activity." />) : null}
        {modalType === 'licence' ? (licenceDetailQuery.isLoading ? <DetailPanelState mode="loading" title="Loading licence" description="Please wait…preparing selected resource." /> : licence ? <div className="space-y-5"><SettlementBanner summary={licence.settlement_summary} /><div className="grid gap-4 md:grid-cols-3"><SummaryCard label="Amount due" value={formatCurrency(licence.amount_due)} hint={licence.invoice?.invoice_number ? `Invoice • ${licence.invoice.invoice_number}` : 'Invoice • Not linked'} /><SummaryCard label="Amount paid" value={formatCurrency(licence.amount_paid)} hint={licence.financial_summary?.payment_count ? `Payments • ${licence.financial_summary.payment_count}` : 'Payments • None'} /><SummaryCard label="Outstanding" value={formatCurrency(licence.outstanding_amount)} hint={licence.settlement_summary?.label ?? 'Settlement pending'} /></div><DetailGrid items={[{ label: 'Licence reference', value: licence.licence_number ?? `#${licence.id}` }, { label: 'Licence year', value: licence.licence_year ?? '—' }, { label: 'Institution', value: licence.institution?.name ?? licence.related_entities?.institution?.name ?? 'Not linked' }, { label: 'Institution licence ID', value: licence.institution?.licence_id ?? licence.related_entities?.institution?.licence_id ?? '—' }, { label: 'Status', value: <StatusBadge value={licence.licence_status} /> }, { label: 'Payment status', value: <StatusBadge value={licence.payment_status} /> }, { label: 'Start date', value: formatDate(licence.start_date) }, { label: 'End date', value: formatDate(licence.end_date) }, { label: 'Issued on', value: formatDate(licence.issued_at) }, { label: 'Invoice', value: licence.invoice?.invoice_number ?? 'Not linked' }, { label: 'Invoice status', value: licence.invoice?.status ? <StatusBadge value={licence.invoice.status} /> : '—' }, { label: 'Declaration', value: licence.declaration?.id ? `Declaration #${licence.declaration.id}` : 'Not linked' }, { label: 'Amount due', value: formatCurrency(licence.amount_due) }, { label: 'Amount paid', value: formatCurrency(licence.amount_paid) }, { label: 'Outstanding', value: formatCurrency(licence.outstanding_amount) }]} columns={3} /></div> : <DetailPanelState mode="empty" title="No licence selected" description="Choose a licence from the table to review finance status and linked invoice context." />) : null}
        {modalType === 'fee-plan' ? (selectedFeePlan ? <DetailGrid items={Object.entries(selectedFeePlan as unknown as Record<string, unknown>).map(([key, value]) => ({ label: key.replaceAll('_', ' '), value: typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? '—') }))} columns={3} /> : <DetailPanelState mode="empty" title="No fee plan selected" description="Choose a fee plan from the table to inspect its pricing rules or open the fee plan form to create one." />) : null}
        {modalType === 'audit' ? (auditDetailQuery.isLoading ? <DetailPanelState mode="loading" title="Loading audit log" description="Please wait…preparing selected resource." /> : auditLog ? <div className="space-y-6"><DetailGrid items={[{ label: 'Action', value: auditLog.action }, { label: 'Subject', value: `${auditLog.subject_type ?? '—'} #${auditLog.subject_id ?? '—'}` }, { label: 'Created by', value: auditLog.actor?.name ?? 'System' }, { label: 'Created on', value: formatDate(auditLog.created_at) }]} /><div><p className="text-sm font-medium text-slate-700 dark:text-slate-300">Before</p><pre className="mt-2 overflow-auto rounded-2xl bg-slate-50 dark:bg-slate-900 p-4 text-xs text-slate-700 dark:text-slate-300">{JSON.stringify(auditLog.before, null, 2)}</pre></div><div><p className="text-sm font-medium text-slate-700 dark:text-slate-300">After</p><pre className="mt-2 overflow-auto rounded-2xl bg-slate-50 dark:bg-slate-900 p-4 text-xs text-slate-700 dark:text-slate-300">{JSON.stringify(auditLog.after, null, 2)}</pre></div></div> : <DetailPanelState mode="empty" title="No audit log selected" description="Choose an audit log from the table to inspect the before-and-after finance payload." />) : null}
      </Modal>

      <Modal open={modalType === 'fee-plan-form'} onClose={closeModal} title={selectedId ? 'Edit fee plan' : 'Create fee plan'} subtitle="Define institution type, pricing basis, amounts, and effective years." size="md">
        <ModalFormRoot
          onSubmit={(event) => {
            event.preventDefault();
            createOrUpdateFeePlanMutation.mutate();
          }}
        >
          <ModalFormScrollBody>
            <ModalFormSection badge="1" title="Plan scope" description="Which institution type and pricing basis this plan applies to.">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Institution type<span className="ml-1 text-red-600 dark:text-red-400">*</span></label>
                <select value={feePlanForm.institution_type} onChange={(event) => { setFeePlanForm((current) => ({ ...current, institution_type: event.target.value })); setFeePlanErrors((current) => ({ ...current, institution_type: undefined })); }} className="h-12 w-full rounded-md border border-[#222222] bg-white px-4 text-[15px] outline-none transition focus:border-[#9B2C24] focus:ring-2 focus:ring-[#9B2C24]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                  <option value="" disabled>Select institution type</option>
                  {['university','polytechnic','college_of_education','professional_body','religious_organization','corporate_organization','government_agency','ngo','research_institute','library','other'].map((option) => <option key={option} value={option}>{option.replace(/_/g, ' ')}</option>)}
                </select>
                {feePlanErrors.institution_type ? <p className="text-sm text-[#B42318]">{feePlanErrors.institution_type}</p> : null}
              </div>
              <div className="mt-5 space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Pricing basis<span className="ml-1 text-red-600 dark:text-red-400">*</span></label>
                <select value={feePlanForm.basis_type} onChange={(event) => { setFeePlanForm((current) => ({ ...current, basis_type: event.target.value })); setFeePlanErrors((current) => ({ ...current, basis_type: undefined })); }} className="h-12 w-full rounded-md border border-[#222222] bg-white px-4 text-[15px] outline-none transition focus:border-[#9B2C24] focus:ring-2 focus:ring-[#9B2C24]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                  <option value="" disabled>Select pricing basis</option>
                  {['per_student','per_member','per_branch','flat_rate'].map((option) => <option key={option} value={option}>{option.replace(/_/g, ' ')}</option>)}
                </select>
                {feePlanErrors.basis_type ? <p className="text-sm text-[#B42318]">{feePlanErrors.basis_type}</p> : null}
              </div>
            </ModalFormSection>
            <ModalFormSection badge="2" title="Pricing" description="Per-unit cost and/or flat amount depending on the basis you selected.">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Unit cost" type="number" error={feePlanErrors.unit_cost} helperText="Use when the plan charges per unit." value={feePlanForm.unit_cost} onChange={(event) => { setFeePlanForm((current) => ({ ...current, unit_cost: event.target.value })); setFeePlanErrors((current) => ({ ...current, unit_cost: undefined })); }} />
                <FormField label="Flat amount" type="number" error={feePlanErrors.flat_amount} helperText="Use for a single flat charge." value={feePlanForm.flat_amount} onChange={(event) => { setFeePlanForm((current) => ({ ...current, flat_amount: event.target.value })); setFeePlanErrors((current) => ({ ...current, flat_amount: undefined })); }} />
              </div>
            </ModalFormSection>
            <ModalFormSection badge="3" title="Schedule & notes" description="Effective years bound when this plan can be used; leave end year open if ongoing.">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Effective from year" type="number" error={feePlanErrors.effective_from_year} helperText="First year this plan applies." value={feePlanForm.effective_from_year} onChange={(event) => { setFeePlanForm((current) => ({ ...current, effective_from_year: event.target.value })); setFeePlanErrors((current) => ({ ...current, effective_from_year: undefined })); }} />
                <FormField label="Effective to year" type="number" error={feePlanErrors.effective_to_year} helperText="Leave blank if open-ended." value={feePlanForm.effective_to_year} onChange={(event) => { setFeePlanForm((current) => ({ ...current, effective_to_year: event.target.value })); setFeePlanErrors((current) => ({ ...current, effective_to_year: undefined })); }} />
              </div>
              <div className="mt-5">
                <FormTextareaField label="Description" placeholder="Add a short fee plan summary" error={feePlanErrors.description} value={feePlanForm.description} onChange={(event) => { setFeePlanForm((current) => ({ ...current, description: event.target.value })); setFeePlanErrors((current) => ({ ...current, description: undefined })); }} />
              </div>
            </ModalFormSection>
          </ModalFormScrollBody>
          <ModalFormActions>
            <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
            <Button type="submit" disabled={createOrUpdateFeePlanMutation.isPending}>{createOrUpdateFeePlanMutation.isPending ? 'Saving…' : 'Save fee plan'}</Button>
          </ModalFormActions>
        </ModalFormRoot>
      </Modal>
    </div>
  );
}
