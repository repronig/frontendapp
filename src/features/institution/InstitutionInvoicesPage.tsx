import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AlertCircle, BarChart3, Wallet } from 'lucide-react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getPublicPlatformSettings } from '@/features/public/api';
import { downloadInstitutionPaymentReceipt, getInstitutionInvoice, initiateInstitutionInvoicePayment, listInstitutionInvoices, submitOfflineInstitutionInvoicePayment, verifyInstitutionPayment } from '@/features/institution/api';
import { getApiErrorMessageAsync } from '@/api/error';
import { onMutationApiError } from '@/lib/mutationFeedback';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { useTablePagination } from '@/hooks/useTablePagination';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable';
import { DetailPanelState } from '@/components/shared/DetailPanelState';
import { FormField } from '@/components/shared/FormField';
import { FormSelectField } from '@/components/shared/FormSelectField';
import { FormTextareaField } from '@/components/shared/FormTextareaField';
import { Modal } from '@/components/shared/Modal';
import { ModalFormActions, ModalFormRoot, ModalFormScrollBody, ModalFormSection } from '@/components/shared/ModalForm';
import { PaginationBar } from '@/components/shared/PaginationBar';
import { PaymentGatewayModal } from '@/components/shared/PaymentGatewayModal';
import { SearchFilterBar } from '@/components/shared/SearchFilterBar';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { StatCard, statCardVariantAt } from '@/components/shared/StatCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { invoicePaymentSchema, type InvoicePaymentFormValues } from '@/features/institution/schemas';
import type { PaymentInitiationResult } from '@/types/domain';
import { buildOnlineGatewaySelectOptions, resolveDefaultOnlineGateway } from '@/utils/institutionLicensingSettings';
import { formatCurrency, formatDate } from '@/utils/format';
import { triggerBlobDownload } from '@/utils/download';
import { resolveFileUrl } from '@/utils/fileUrl';
import { exportRowsToPdf } from '@/utils/pdfExport';
import { queryKeys } from '@/lib/queryKeys';

const invoiceStatusOptions = [
  { label: 'Issued', value: 'issued' },
  { label: 'Partially paid', value: 'partially_paid' },
  { label: 'Overdue', value: 'overdue' },
  { label: 'Paid', value: 'paid' },
  { label: 'Cancelled', value: 'cancelled' },
];

function DetailItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/60">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <div className="mt-1 text-[15px] font-medium leading-6 text-slate-950 dark:text-slate-100">{value || '—'}</div>
    </div>
  );
}

export function InstitutionInvoicesPage() {
  const queryClient = useQueryClient();
  const { page, setPage, perPage, setPerPage } = useTablePagination();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [paymentResult, setPaymentResult] = useState<PaymentInitiationResult | null>(null);
  const [offlinePayOpen, setOfflinePayOpen] = useState(false);
  const [invoiceReceiptBusyId, setInvoiceReceiptBusyId] = useState<number | null>(null);
  const settingsQuery = useQuery({ queryKey: queryKeys.publicPlatformSettings, queryFn: async () => (await getPublicPlatformSettings()).data });
  const licensing = settingsQuery.data?.licensing;
  const offlinePaymentsEnabled = licensing?.offline_payment_enabled !== false;
  const gatewayOptions = useMemo(() => buildOnlineGatewaySelectOptions(licensing), [licensing]);
  const defaultOnlineGateway = useMemo(() => resolveDefaultOnlineGateway(licensing), [licensing]);
  const hasOnlineGateways = gatewayOptions.length > 0;
  const canUseAnyPayment = hasOnlineGateways || offlinePaymentsEnabled;

  const listQuery = usePaginatedList({
    queryKey: [...queryKeys.institutionInvoices, page, perPage, search, status],
    queryFn: listInstitutionInvoices,
    params: { page, per_page: perPage, search: search || undefined, status: status || undefined },
  });

  const detailQuery = useQuery({
    queryKey: queryKeys.institutionInvoice(selectedId),
    queryFn: async () => {
      if (!selectedId) throw new Error('Invoice id is required.');
      return getInstitutionInvoice(selectedId);
    },
    enabled: Boolean(selectedId),
  });

  const invoice = detailQuery.data?.data ?? null;
  const invoicePayments = invoice?.payments ?? [];
  const institutionLogoUrl = resolveFileUrl(invoice?.institution?.logo_medium_url ?? invoice?.institution?.logo_url ?? null);
  const institutionName = invoice?.institution?.name ?? 'Institution';
  const invoiceIsPaid = invoice?.status === 'paid' || invoice?.status === 'fully_paid' || Number(invoice?.outstanding_amount ?? 0) <= 0;
  const hasPendingOfflinePayment = (invoicePayments as { gateway_name?: string | null; payment_status?: string | null }[]).some(
    (p) => p.gateway_name === 'offline' && p.payment_status === 'pending_offline',
  );
  const form = useForm<InvoicePaymentFormValues>({
    resolver: zodResolver(invoicePaymentSchema) as Resolver<InvoicePaymentFormValues>,
    defaultValues: { amount: 0, gateway_name: 'paystack', callback_url: window.location.href },
  });

  useEffect(() => {
    if (!invoice) return;
    form.reset({
      amount: Number(invoice.outstanding_amount ?? invoice.total_amount ?? 0),
      gateway_name: (defaultOnlineGateway ?? gatewayOptions[0]?.value ?? 'paystack') as InvoicePaymentFormValues['gateway_name'],
      callback_url: window.location.href,
    });
  }, [form, invoice, defaultOnlineGateway, gatewayOptions]);

  const paymentMutation = useMutation({
    mutationFn: async (values: InvoicePaymentFormValues) => {
      if (!invoice) throw new Error('Select an invoice first.');
      return initiateInstitutionInvoicePayment(invoice.id, values as InvoicePaymentFormValues);
    },
    onSuccess: (response) => {
      toast.success(response.message);
      setPaymentResult(response.data);
      queryClient.invalidateQueries({ queryKey: queryKeys.institutionInvoices });
      queryClient.invalidateQueries({ queryKey: queryKeys.institutionInvoice(selectedId) });
    },
    onError: onMutationApiError(),
  });

  const [offlineAmount, setOfflineAmount] = useState(0);
  const [offlinePaidFull, setOfflinePaidFull] = useState(false);
  const [offlineNote, setOfflineNote] = useState('');
  const [offlineFile, setOfflineFile] = useState<File | null>(null);

  useEffect(() => {
    if (!offlinePayOpen || !invoice) return;
    setOfflineAmount(Number(invoice.outstanding_amount ?? invoice.total_amount ?? 0));
    setOfflinePaidFull(false);
    setOfflineNote('');
    setOfflineFile(null);
  }, [offlinePayOpen, invoice?.id, invoice?.outstanding_amount, invoice?.total_amount]);

  useEffect(() => {
    if (!selectedId) {
      setOfflinePayOpen(false);
    }
  }, [selectedId]);

  const offlinePaymentMutation = useMutation({
    mutationFn: async (payload: { amount: number; paid_in_full: boolean; institution_note: string; receipt: File }) => {
      if (!invoice) throw new Error('Select an invoice first.');
      const fd = new FormData();
      fd.append('amount', String(payload.amount));
      fd.append('paid_in_full', payload.paid_in_full ? '1' : '0');
      if (payload.institution_note.trim()) {
        fd.append('institution_note', payload.institution_note.trim());
      }
      fd.append('receipt', payload.receipt);
      return submitOfflineInstitutionInvoicePayment(invoice.id, fd);
    },
    onSuccess: (response) => {
      toast.success(response.message);
      setOfflinePayOpen(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.institutionInvoices });
      queryClient.invalidateQueries({ queryKey: queryKeys.institutionInvoice(selectedId) });
    },
    onError: onMutationApiError(),
  });

  async function handleInvoicePaymentReceipt(paymentId: number, reference?: string | null) {
    try {
      setInvoiceReceiptBusyId(paymentId);
      const blob = await downloadInstitutionPaymentReceipt(paymentId);
      const safeRef = (reference ?? `payment-${paymentId}`).replace(/[^\w.-]+/g, '-');
      triggerBlobDownload(blob, `payment-receipt-${safeRef}.pdf`);
      toast.success('Receipt downloaded.');
    } catch (error) {
      toast.error(await getApiErrorMessageAsync(error, 'Could not download receipt.'));
    } finally {
      setInvoiceReceiptBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Institution invoices" description="View balances and pay." />
      <SearchFilterBar search={search} onSearchChange={(value) => { setSearch(value); setPage(1); }} status={status} onStatusChange={(value) => { setStatus(value); setPage(1); }} statusOptions={invoiceStatusOptions} searchPlaceholder="Search by invoice number or licence" onReset={() => { setSearch(''); setStatus(''); setPage(1); }} />
      <DataTable columns={[{ key: 'invoice_number', header: 'Invoice', render: (row) => row.invoice_number ?? `Invoice ${row.id}` }, { key: 'billing_year', header: 'Year', render: (row) => row.billing_year ?? '—' }, { key: 'status', header: 'Status', render: (row) => <StatusBadge value={row.status as string} /> }, { key: 'total_amount', header: 'Total', render: (row) => formatCurrency(row.total_amount as number | null) }, { key: 'outstanding_amount', header: 'Outstanding', render: (row) => formatCurrency(row.outstanding_amount as number | null) }]} rows={listQuery.data?.data ?? []} getRowKey={(row) => row.id} onRowClick={(row) => setSelectedId(row.id)} selectedRowKey={selectedId ?? undefined} isLoading={listQuery.isLoading} exportTitle="Institution invoices" />
      <PaginationBar meta={listQuery.data?.meta} onPageChange={setPage} perPage={perPage} onPerPageChange={setPerPage} />

      <Modal open={Boolean(selectedId)} onClose={() => setSelectedId(null)} title="Invoice details" subtitle={invoiceIsPaid ? 'Paid in full.' : 'Balance and payment options.'} size="lg">
        {detailQuery.isLoading ? (
          <DetailPanelState mode="loading" title="Loading invoice" description="Please wait while the invoice details are prepared." />
        ) : invoice ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="flex items-center gap-3">
                <div className="flex h-[90px] w-[90px] shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-950">
                  {institutionLogoUrl ? <img src={institutionLogoUrl} alt={institutionName} className="h-full w-full object-contain" /> : institutionName.slice(0, 1)}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{institutionName}</p>
                  <h3 className="text-xl font-semibold leading-7 text-slate-950 dark:text-slate-50">{invoice.invoice_number ?? `Invoice #${invoice.id}`}</h3>
                  <p className="mt-1 text-[15px] leading-6 text-slate-600 dark:text-slate-300">Billing year {invoice.billing_year ?? '—'}{invoice.licence?.licence_number ? ` · Licence ${invoice.licence.licence_number}` : ''}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge value={invoice.status} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <StatCard
                variant={statCardVariantAt(0)}
                label="Total amount"
                value={formatCurrency(invoice.total_amount, invoice.currency)}
                hint={invoice.issue_date ? `Issued • ${formatDate(invoice.issue_date)}` : 'Issue date not set'}
                icon={<BarChart3 className="h-6 w-6" />}
                compactValue
              />
              <StatCard
                variant={statCardVariantAt(1)}
                label="Amount paid"
                value={formatCurrency(invoice.amount_paid, invoice.currency)}
                hint={invoiceIsPaid ? 'Paid in full' : 'Settlement in progress'}
                icon={<Wallet className="h-6 w-6" />}
                compactValue
              />
              <StatCard
                variant={statCardVariantAt(2)}
                label="Outstanding"
                value={formatCurrency(invoice.outstanding_amount, invoice.currency)}
                hint={invoice.due_date ? `Due • ${formatDate(invoice.due_date)}` : 'Due date not set'}
                icon={<AlertCircle className="h-6 w-6" />}
                compactValue
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <DetailItem label="Invoice number" value={invoice.invoice_number ?? '—'} />
              <DetailItem label="Status" value={<StatusBadge value={invoice.status} />} />
              <DetailItem label="Issue date" value={formatDate(invoice.issue_date)} />
              <DetailItem label="Due date" value={formatDate(invoice.due_date)} />
              <DetailItem label="Linked licence" value={invoice.licence?.licence_number ?? '—'} />
              <DetailItem label="Invoice type" value={invoice.invoice_type ?? '—'} />
            </div>

            {!invoiceIsPaid ? (
              <div className="space-y-5">
                {hasPendingOfflinePayment ? (
                  <Alert title="Offline Payment pending review" description="You have submitted an offline payment for this invoice. It will appear below as pending until REPRONIG finance Team confirms it." />
                ) : null}
                {!canUseAnyPayment && !hasPendingOfflinePayment ? (
                  <Alert
                    title="No payment methods available"
                    description="Online checkout is turned off and offline bank transfer is disabled for this platform. Please contact REPRONIG support to settle this invoice."
                  />
                ) : null}
                {hasOnlineGateways && !hasPendingOfflinePayment ? (
                  <ModalFormSection badge="1" title="Pay online" description="Choose a gateway and amount, then start card checkout.">
                    <form className="grid gap-4 md:grid-cols-[1fr_1fr_auto]" onSubmit={form.handleSubmit((values) => paymentMutation.mutate(values))}>
                      <FormSelectField label="Gateway" requiredIndicator options={gatewayOptions} error={form.formState.errors.gateway_name?.message} {...form.register('gateway_name')} />
                      <FormField label="Payment amount" type="number" error={form.formState.errors.amount?.message} {...form.register('amount', { valueAsNumber: true })} />
                      <input type="hidden" {...form.register('callback_url')} />
                      <div className="flex items-end"><Button type="submit" disabled={paymentMutation.isPending}>{paymentMutation.isPending ? 'Initiating...' : 'Pay online'}</Button></div>
                    </form>
                  </ModalFormSection>
                ) : null}
                {offlinePaymentsEnabled && !hasPendingOfflinePayment ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-5 dark:border-slate-700 dark:bg-slate-900/40">
                    <SectionHeader title="Pay offline (bank transfer)" description="Proof upload; balance updates after confirmation." />
                    <Button type="button" variant="outline" onClick={() => setOfflinePayOpen(true)}>
                      Start offline payment
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-[15px] leading-6 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100">
                <span>This invoice has been paid in full. See below for payment receipts.</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => exportRowsToPdf(
                    `Payment breakdown - ${invoice.invoice_number ?? `Invoice #${invoice.id}`}`,
                    [
                      { label: 'Reference', getValue: (row) => row.reference as string },
                      { label: 'Gateway', getValue: (row) => row.gateway as string },
                      { label: 'Status', getValue: (row) => row.status as string },
                      { label: 'Amount', getValue: (row) => row.amount as string },
                      { label: 'Paid on', getValue: (row) => row.paid_on as string },
                    ],
                    invoicePayments.map((payment) => ({
                      reference: payment.payment_reference ?? payment.gateway_reference ?? `Payment #${payment.id}`,
                      gateway: payment.gateway_name ?? '—',
                      status: payment.payment_status ?? '—',
                      amount: formatCurrency(payment.amount_allocated ?? payment.amount, payment.currency ?? invoice.currency),
                      paid_on: formatDate(payment.paid_at),
                    })),
                    { platformName: 'REPRONIG Digital Rights Management Platform' },
                    { layout: 'receipt' },
                  )}
                >
                  PDF Payment Breakdown
                </Button>
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
              <SectionHeader title="Payments" description="Linked payments" />
              {invoicePayments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                    <thead>
                      <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        <th className="px-3 py-2">Reference</th>
                        <th className="px-3 py-2">Gateway</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Amount</th>
                        <th className="px-3 py-2">Paid on</th>
                        <th className="px-3 py-2 text-right">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {invoicePayments.map((payment) => (
                        <tr key={payment.id} className="text-slate-700 dark:text-slate-200">
                          <td className="px-3 py-3 font-medium text-slate-950 dark:text-slate-50">{payment.payment_reference ?? payment.gateway_reference ?? `Payment #${payment.id}`}</td>
                          <td className="px-3 py-3">{payment.gateway_name ?? '—'}</td>
                          <td className="px-3 py-3"><StatusBadge value={payment.payment_status} /></td>
                          <td className="px-3 py-3">{formatCurrency(payment.amount_allocated ?? payment.amount, payment.currency ?? invoice.currency)}</td>
                          <td className="px-3 py-3">{formatDate(payment.paid_at)}</td>
                          <td className="px-3 py-3 text-right">
                            {payment.payment_status === 'paid' ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={invoiceReceiptBusyId === payment.id}
                                onClick={() => void handleInvoicePaymentReceipt(payment.id, payment.payment_reference)}
                              >
                                {invoiceReceiptBusyId === payment.id ? '…' : 'PDF'}
                              </Button>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <DetailPanelState mode="empty" title="No payments recorded" description="Payments linked to this invoice will appear here." />
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={offlinePayOpen}
        onClose={() => setOfflinePayOpen(false)}
        title="Offline payment to REPRONIG"
        subtitle="Transfer from your institution account using the bank details below, then submit the amount and proof of payment."
        size="lg"
      >
        <ModalFormRoot
          onSubmit={(event) => {
            event.preventDefault();
            if (!invoice) return;
            const max = Number(invoice.outstanding_amount ?? 0);
            if (!offlineFile) {
              toast.error('Please attach a receipt or teller (PDF or image).');
              return;
            }
            if (offlineAmount <= 0 || offlineAmount > max) {
              toast.error(`Amount must be between 0.01 and ${max.toFixed(2)}.`);
              return;
            }
            offlinePaymentMutation.mutate({
              amount: offlineAmount,
              paid_in_full: offlinePaidFull,
              institution_note: offlineNote,
              receipt: offlineFile,
            });
          }}
        >
          <ModalFormScrollBody>
            <ModalFormSection badge="1" title="Bank transfer details" description="Use these details when paying from your institution account.">
              <dl className="grid gap-2 text-sm text-slate-600 dark:text-slate-300">
                <div><span className="font-medium text-slate-800 dark:text-slate-200">Account name: </span>{licensing?.repronig_bank?.account_name || '—'}</div>
                <div><span className="font-medium text-slate-800 dark:text-slate-200">Bank: </span>{licensing?.repronig_bank?.bank_name || '—'}</div>
                <div><span className="font-medium text-slate-800 dark:text-slate-200">Account number: </span>{licensing?.repronig_bank?.account_number || '—'}</div>
                {licensing?.repronig_bank?.reference_note ? (
                  <div className="pt-1 text-sm leading-6"><span className="font-medium text-slate-800 dark:text-slate-200">Reference: </span>{licensing.repronig_bank.reference_note}</div>
                ) : null}
              </dl>
            </ModalFormSection>
            <ModalFormSection badge="2" title="Confirm your payment" description="Enter the amount you transferred, attach proof, then submit for finance review.">
              <div className="space-y-4">
                <FormField
                  label="Amount you paid (same currency as invoice)"
                  requiredIndicator
                  type="number"
                  value={offlineAmount === 0 ? '' : String(offlineAmount)}
                  onChange={(event) => setOfflineAmount(Number(event.target.value) || 0)}
                />
                <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-700 dark:text-slate-200">
                  <input type="checkbox" className="mt-1 h-4 w-4 rounded border-slate-300" checked={offlinePaidFull} onChange={(event) => setOfflinePaidFull(event.target.checked)} />
                  <span>This transfer covers the full outstanding balance on this invoice.</span>
                </label>
                <FormTextareaField
                  label="Transfer / payment note (optional)"
                  value={offlineNote}
                  onChange={(event) => setOfflineNote(event.target.value)}
                  placeholder="e.g. bank reference, transfer narration"
                />
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-100">Receipt or teller (PDF or image)</span>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,image/*,application/pdf"
                    className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white dark:file:bg-slate-700"
                    onChange={(event) => setOfflineFile(event.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
            </ModalFormSection>
          </ModalFormScrollBody>
          <ModalFormActions>
            <Button type="button" variant="outline" onClick={() => setOfflinePayOpen(false)} disabled={offlinePaymentMutation.isPending}>Cancel</Button>
            <Button type="submit" disabled={offlinePaymentMutation.isPending}>{offlinePaymentMutation.isPending ? 'Submitting…' : 'Submit for review'}</Button>
          </ModalFormActions>
        </ModalFormRoot>
      </Modal>

      <PaymentGatewayModal
        payment={paymentResult}
        customerEmail={invoice?.institution?.email}
        onClose={() => setPaymentResult(null)}
        onPaymentVerified={async (payment) => {
          await verifyInstitutionPayment(payment.payment_id);
          queryClient.invalidateQueries({ queryKey: queryKeys.institutionInvoices });
          queryClient.invalidateQueries({ queryKey: queryKeys.institutionInvoice(selectedId) });
        }}
      />
    </div>
  );
}
