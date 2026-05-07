import { useEffect, useMemo, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getPublicPlatformSettings } from '@/features/public/api';
import {
  downloadInstitutionLicenceCertificate,
  downloadInstitutionPaymentReceipt,
  getInstitutionLicence,
  initiateInstitutionLicencePayment,
  listInstitutionLicencePayments,
  listInstitutionLicences,
  verifyInstitutionPayment,
} from '@/features/institution/api';
import { getApiErrorMessageAsync } from '@/api/error';
import { onMutationApiError } from '@/lib/mutationFeedback';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { useTablePagination } from '@/hooks/useTablePagination';
import { CheckCircle2 } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable';
import { DetailPanelState } from '@/components/shared/DetailPanelState';
import { FormField } from '@/components/shared/FormField';
import { FormSelectField } from '@/components/shared/FormSelectField';
import { Modal } from '@/components/shared/Modal';
import { ModalFormActions, ModalFormRoot, ModalFormScrollBody, ModalFormSection } from '@/components/shared/ModalForm';
import { PaginationBar } from '@/components/shared/PaginationBar';
import { PaymentGatewayModal } from '@/components/shared/PaymentGatewayModal';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { licencePaymentSchema, type LicencePaymentFormValues } from '@/features/institution/schemas';
import type { PaymentInitiationResult } from '@/types/domain';
import { buildOnlineGatewaySelectOptions, resolveDefaultOnlineGateway } from '@/utils/institutionLicensingSettings';
import { formatCurrency, formatDate } from '@/utils/format';
import { triggerBlobDownload } from '@/utils/download';
import { queryKeys } from '@/lib/queryKeys';

export function InstitutionLicencesPage() {
  const queryClient = useQueryClient();
  const { page, setPage, perPage, setPerPage } = useTablePagination();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [paymentResult, setPaymentResult] = useState<PaymentInitiationResult | null>(null);
  const [certificateBusy, setCertificateBusy] = useState(false);
  const [receiptBusyId, setReceiptBusyId] = useState<number | null>(null);
  const settingsQuery = useQuery({ queryKey: queryKeys.publicPlatformSettings, queryFn: async () => (await getPublicPlatformSettings()).data });
  const licensing = settingsQuery.data?.licensing;
  const gatewayOptions = useMemo(() => buildOnlineGatewaySelectOptions(licensing), [licensing]);
  const defaultOnlineGateway = useMemo(() => resolveDefaultOnlineGateway(licensing), [licensing]);
  const hasOnlineGateways = gatewayOptions.length > 0;

  const listQuery = usePaginatedList({ queryKey: [...queryKeys.institutionLicences, page, perPage], queryFn: listInstitutionLicences, params: { page, per_page: perPage } });

  const detailQuery = useQuery({
    queryKey: queryKeys.institutionLicence(selectedId),
    queryFn: async () => {
      if (!selectedId) throw new Error('Licence id is required.');
      return getInstitutionLicence(selectedId);
    },
    enabled: Boolean(selectedId),
  });

  const paymentsQuery = useQuery({
    queryKey: queryKeys.institutionLicencePayments(selectedId),
    queryFn: async () => {
      if (!selectedId) throw new Error('Licence id is required.');
      return listInstitutionLicencePayments(selectedId);
    },
    enabled: Boolean(selectedId),
  });

  const licence = detailQuery.data?.data ?? null;
  const licenceIsPaid = licence?.payment_status === 'paid' || licence?.payment_status === 'fully_paid' || Number(licence?.outstanding_amount ?? 0) <= 0;
  const canDownloadCertificate = Boolean(
    licence && ['active', 'expired'].includes(String(licence.licence_status ?? '').toLowerCase()),
  );

  async function handleDownloadCertificate() {
    if (!selectedId) return;
    try {
      setCertificateBusy(true);
      const blob = await downloadInstitutionLicenceCertificate(selectedId);
      const name = (licence?.licence_number ?? `licence-${selectedId}`).replace(/[^\w.-]+/g, '-');
      triggerBlobDownload(blob, `licence-certificate-${name}.pdf`);
      toast.success('Certificate downloaded.');
    } catch (error) {
      toast.error(await getApiErrorMessageAsync(error, 'Could not download certificate.'));
    } finally {
      setCertificateBusy(false);
    }
  }

  async function handleDownloadReceipt(paymentId: number, reference?: string | null) {
    try {
      setReceiptBusyId(paymentId);
      const blob = await downloadInstitutionPaymentReceipt(paymentId);
      const safeRef = (reference ?? `payment-${paymentId}`).replace(/[^\w.-]+/g, '-');
      triggerBlobDownload(blob, `payment-receipt-${safeRef}.pdf`);
      toast.success('Receipt downloaded.');
    } catch (error) {
      toast.error(await getApiErrorMessageAsync(error, 'Could not download receipt.'));
    } finally {
      setReceiptBusyId(null);
    }
  }
  const paymentForm = useForm<LicencePaymentFormValues>({
    resolver: zodResolver(licencePaymentSchema) as Resolver<LicencePaymentFormValues>,
    defaultValues: { gateway_name: 'paystack', callback_url: window.location.href, amount: 0 },
  });

  useEffect(() => {
    if (!licence) return;
    paymentForm.reset({
      gateway_name: (defaultOnlineGateway ?? gatewayOptions[0]?.value ?? 'paystack') as LicencePaymentFormValues['gateway_name'],
      callback_url: window.location.href,
      amount: Number(licence.outstanding_amount ?? licence.amount_due ?? 0),
    });
  }, [licence, paymentForm, defaultOnlineGateway, gatewayOptions]);

  const paymentMutation = useMutation({
    mutationFn: async (values: LicencePaymentFormValues) => {
      if (!licence) throw new Error('Select a licence first.');
      return initiateInstitutionLicencePayment(licence.id, values as LicencePaymentFormValues);
    },
    onSuccess: (response) => {
      toast.success(response.message);
      setPaymentResult(response.data);
      queryClient.invalidateQueries({ queryKey: queryKeys.institutionLicence(selectedId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.institutionLicencePayments(selectedId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.institutionLicences });
    },
    onError: onMutationApiError(),
  });

  return (
    <div className="space-y-6">
      <SectionHeader title="Institution licences" description="Your licences and payment history." />
      <DataTable columns={[{ key: 'licence_number', header: 'Licence', render: (row) => row.licence_number ?? `Licence ${row.id}` }, { key: 'licence_year', header: 'Year', render: (row) => row.licence_year ?? '—' }, { key: 'licence_status', header: 'Status', render: (row) => <StatusBadge value={row.licence_status as string} /> }, { key: 'payment_status', header: 'Payment', render: (row) => <StatusBadge value={row.payment_status as string} /> }, { key: 'outstanding_amount', header: 'Outstanding', render: (row) => formatCurrency(row.outstanding_amount as number | null) }]} rows={listQuery.data?.data ?? []} getRowKey={(row) => row.id} onRowClick={(row) => setSelectedId(row.id)} selectedRowKey={selectedId ?? undefined} isLoading={listQuery.isLoading} exportTitle="Institution licences" />
      <PaginationBar meta={listQuery.data?.meta} onPageChange={setPage} perPage={perPage} onPerPageChange={setPerPage} />

      <Modal open={Boolean(selectedId)} onClose={() => setSelectedId(null)} title="Licence details" subtitle="Review licence detail and payment history for the selected licence." size="lg">
        {detailQuery.isLoading ? <DetailPanelState mode="loading" title="Loading licence" description="Please wait while the licence details are prepared." /> : null}
        {licence ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-border bg-card p-5">
              <div className="min-w-0 space-y-2">
                <h3 className="break-words text-xl font-semibold leading-snug text-foreground">{licence.licence_number ?? `Licence #${licence.id}`}</h3>
                <div className="flex flex-wrap items-center gap-2"><StatusBadge value={licence.licence_status} /><StatusBadge value={licence.payment_status} /></div>
              </div>
              {canDownloadCertificate ? (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" disabled={certificateBusy} onClick={() => void handleDownloadCertificate()}>
                    {certificateBusy ? 'Preparing…' : 'Certificate (PDF)'}
                  </Button>
                </div>
              ) : null}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                ['Licence number', licence.licence_number ?? '—'],
                ['Start date', formatDate(licence.start_date)],
                ['End date', formatDate(licence.end_date)],
                ['Amount due', formatCurrency(licence.amount_due)],
                ['Outstanding', formatCurrency(licence.outstanding_amount)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-border bg-card px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
                  <p className="mt-1 break-words text-[15px] font-semibold leading-7 text-foreground">{value}</p>
                </div>
              ))}
            </div>
            {licenceIsPaid ? (
              <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">Licence payment is complete.</p>
                </div>
              </div>
            ) : hasOnlineGateways ? (
              <ModalFormRoot onSubmit={paymentForm.handleSubmit((values) => paymentMutation.mutate(values))}>
                <ModalFormScrollBody>
                  <ModalFormSection badge="1" title="Licence payment" description="Confirm gateway, callback URL if required, and amount before starting checkout.">
                    <div className="grid gap-4 md:grid-cols-3">
                      <FormSelectField label="Gateway" requiredIndicator options={gatewayOptions} error={paymentForm.formState.errors.gateway_name?.message} {...paymentForm.register('gateway_name')} />
                      <FormField label="Callback URL" error={paymentForm.formState.errors.callback_url?.message} {...paymentForm.register('callback_url')} />
                      <FormField label="Amount" requiredIndicator type="number" error={paymentForm.formState.errors.amount?.message} {...paymentForm.register('amount', { valueAsNumber: true })} />
                    </div>
                  </ModalFormSection>
                </ModalFormScrollBody>
                <ModalFormActions>
                  <Button type="submit" disabled={paymentMutation.isPending}>{paymentMutation.isPending ? 'Initiating...' : 'Initiate licence payment'}</Button>
                </ModalFormActions>
              </ModalFormRoot>
            ) : (
              <Alert
                title="Online payment unavailable"
                description="The platform has disabled Paystack and Flutterwave for licence checkout. Please contact REPRONIG support or pay any related invoice from the Invoices page if offline transfer is enabled there."
              />
            )}
            <div className="space-y-3">
              <SectionHeader title="Payment history" description="Payments for this licence." />
              {(paymentsQuery.data?.data ?? []).map((payment) => (
                <div key={payment.id} className="rounded-xl border border-border bg-card p-4 text-sm leading-6 text-muted-foreground">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground">{payment.payment_reference ?? `Payment ${payment.id}`}</span>
                      <StatusBadge value={payment.payment_status} />
                    </div>
                    {payment.payment_status === 'paid' ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={receiptBusyId === payment.id}
                        onClick={() => void handleDownloadReceipt(payment.id, payment.payment_reference)}
                      >
                        {receiptBusyId === payment.id ? '…' : 'Receipt'}
                      </Button>
                    ) : null}
                  </div>
                  <p className="mt-1">{payment.gateway_name ?? 'Gateway'} • {formatCurrency(payment.amount)} • {formatDate(payment.paid_at ?? payment.created_at)}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Modal>
      <PaymentGatewayModal
        payment={paymentResult}
        customerEmail={licence?.institution?.email}
        onClose={() => setPaymentResult(null)}
        onPaymentVerified={async (payment) => {
          await verifyInstitutionPayment(payment.payment_id);
          queryClient.invalidateQueries({ queryKey: queryKeys.institutionLicence(selectedId) });
          queryClient.invalidateQueries({ queryKey: queryKeys.institutionLicencePayments(selectedId) });
          queryClient.invalidateQueries({ queryKey: queryKeys.institutionLicences });
        }}
      />
    </div>
  );
}
