import type { InvoiceResource, LicencePaymentResource, LicenceResource } from '@/types/domain';
import { formatCurrency, formatDate } from '@/utils/format';

export type AdminFinancePdfField = { label: string; value: string | number | null | undefined };

function settlementLabel(summary: InvoiceResource['settlement_summary'] | LicencePaymentResource['settlement_summary']): string {
  if (!summary) return '—';
  if (summary.label) return String(summary.label);
  if (summary.state) return String(summary.state).replaceAll('_', ' ');
  return '—';
}

/** Plain-text fields aligned with admin finance invoice detail (for print/PDF export). */
export function buildAdminInvoicePdfFields(invoice: InvoiceResource): AdminFinancePdfField[] {
  const institution = invoice.institution ?? invoice.related_entities?.institution;
  const institutionEmail = invoice.institution?.email ?? '—';
  const declaration = invoice.declaration ?? invoice.related_entities?.declaration;
  const licence = invoice.licence ?? invoice.related_entities?.licence;

  const rows: AdminFinancePdfField[] = [
    { label: 'Invoice reference', value: invoice.invoice_number ?? `#${invoice.id}` },
    { label: 'Invoice type', value: invoice.invoice_type ?? '—' },
    { label: 'Billing year', value: invoice.billing_year ?? '—' },
    { label: 'Status', value: invoice.status ?? '—' },
    { label: 'Settlement', value: settlementLabel(invoice.settlement_summary) },
    { label: 'Currency', value: invoice.currency ?? 'NGN' },
    { label: 'Issued on', value: formatDate(invoice.issue_date) },
    { label: 'Due on', value: formatDate(invoice.due_date) },
    { label: 'Subtotal', value: formatCurrency(invoice.subtotal_amount, invoice.currency ?? 'NGN') },
    { label: 'Total', value: formatCurrency(invoice.total_amount, invoice.currency ?? 'NGN') },
    { label: 'Amount paid', value: formatCurrency(invoice.amount_paid, invoice.currency ?? 'NGN') },
    { label: 'Outstanding', value: formatCurrency(invoice.outstanding_amount, invoice.currency ?? 'NGN') },
    { label: 'Institution', value: institution?.name ?? '—' },
    { label: 'Institution licence ID', value: institution?.licence_id ?? '—' },
    { label: 'Institution email', value: institutionEmail },
    { label: 'Declaration', value: declaration?.id ? `#${declaration.id} (${declaration.licensing_year ?? '—'})` : '—' },
    { label: 'Declaration status', value: declaration?.declaration_status ?? '—' },
    { label: 'Licence', value: licence?.licence_number ?? '—' },
    { label: 'Licence status', value: licence?.licence_status ?? '—' },
    { label: 'Licence payment status', value: licence?.payment_status ?? '—' },
  ];

  const payments = invoice.payments ?? [];
  if (payments.length) {
    rows.push({
      label: 'Linked payments',
      value: payments
        .slice(0, 20)
        .map((p) => `${p.payment_reference ?? `#${p.id}`} (${p.payment_status ?? '—'})`)
        .join(' · '),
    });
  } else {
    rows.push({ label: 'Linked payments', value: 'None' });
  }

  const adjustments = invoice.adjustments ?? [];
  if (adjustments.length) {
    rows.push({
      label: 'Adjustments',
      value: adjustments
        .slice(0, 15)
        .map((a) => `${a.adjustment_type ?? 'adjustment'} ${formatCurrency(a.amount, invoice.currency ?? 'NGN')} @ ${formatDate(a.applied_at)}`)
        .join(' | '),
    });
  }

  const recent = invoice.audit_summary?.recent_actions ?? [];
  if (recent.length) {
    rows.push({
      label: 'Recent actions',
      value: recent
        .slice(0, 8)
        .map((a) => `${formatDate(a.created_at)} — ${a.label ?? a.type ?? 'action'}`)
        .join(' · '),
    });
  }

  rows.push(
    { label: 'Adjustment count', value: invoice.audit_summary?.adjustment_count ?? adjustments.length },
    { label: 'Payment count', value: invoice.audit_summary?.payment_count ?? payments.length },
    { label: 'Last finance action', value: formatDate(invoice.audit_summary?.last_action_at) },
  );

  return rows;
}

/** Plain-text fields aligned with admin licensing-ops licence detail (DetailGrid + linked entities + summaries). */
export function buildAdminLicencePdfFields(licence: LicenceResource): AdminFinancePdfField[] {
  const institution = licence.institution ?? licence.related_entities?.institution;
  const declaration = licence.declaration ?? licence.related_entities?.declaration;
  const invoice = licence.invoice ?? licence.related_entities?.invoice;
  const cur = 'NGN';

  const amountDue = licence.financial_summary?.amount_due ?? licence.amount_due;
  const amountPaid = licence.financial_summary?.amount_paid ?? licence.amount_paid;
  const outstanding = licence.financial_summary?.outstanding_amount ?? licence.outstanding_amount;
  const paymentCount = licence.financial_summary?.payment_count ?? licence.payments?.length ?? 0;

  const rows: AdminFinancePdfField[] = [
    { label: 'Licence reference', value: licence.licence_number ?? `#${licence.id}` },
    { label: 'Internal licence ID', value: licence.id },
    { label: 'Licence year', value: licence.licence_year ?? '—' },
    { label: 'Agreement version', value: licence.agreement_version ?? '—' },
    { label: 'Licence status', value: licence.licence_status ?? '—' },
    { label: 'Payment status', value: licence.payment_status ?? '—' },
    { label: 'Settlement', value: settlementLabel(licence.settlement_summary) },
    { label: 'Settlement due', value: formatDate(licence.settlement_summary?.due_date) },
    { label: 'Amount due', value: formatCurrency(amountDue, cur) },
    { label: 'Amount paid', value: formatCurrency(amountPaid, cur) },
    { label: 'Outstanding', value: formatCurrency(outstanding, cur) },
    { label: 'Payment count', value: paymentCount },
    { label: 'Negotiated rate', value: licence.negotiated_rate != null ? String(licence.negotiated_rate) : '—' },
    { label: 'Institution licence ID', value: institution?.licence_id ?? licence.licence_id_snapshot ?? '—' },
    { label: 'Issued at', value: formatDate(licence.issued_at) },
    { label: 'Starts at', value: formatDate(licence.start_date) },
    { label: 'Ends at', value: formatDate(licence.end_date) },
    { label: 'Declaration year', value: declaration?.licensing_year ?? '—' },
    { label: 'Invoice', value: invoice?.invoice_number ?? '—' },
    { label: 'Invoice status', value: invoice?.status ?? '—' },
    { label: 'Invoice due', value: formatDate(invoice?.due_date) },
    { label: 'Institution', value: institution?.name ?? '—' },
    { label: 'Institution email', value: licence.institution?.email ?? '—' },
    {
      label: 'Linked — declaration',
      value: declaration?.id != null ? `Declaration #${declaration.id}` : 'Not linked',
    },
    { label: 'Linked — declaration year', value: declaration?.licensing_year != null ? `Year ${declaration.licensing_year}` : '—' },
    { label: 'Linked — declaration status', value: declaration?.declaration_status ?? '—' },
    { label: 'Linked — invoice', value: invoice?.invoice_number ?? 'Not linked' },
    { label: 'Linked — invoice due', value: formatDate(invoice?.due_date) },
    { label: 'Linked — invoice status', value: invoice?.status ?? '—' },
    { label: 'Created', value: formatDate(licence.created_at) },
    { label: 'Updated', value: formatDate(licence.updated_at) },
  ];

  const payments = licence.payments ?? [];
  if (payments.length) {
    rows.push({
      label: 'Linked payments',
      value: payments
        .slice(0, 20)
        .map((p) => `${p.payment_reference ?? `#${p.id}`} (${p.payment_status ?? '—'}) ${formatCurrency(p.amount, p.currency ?? cur)} @ ${formatDate(p.paid_at ?? p.created_at)}`)
        .join(' · '),
    });
  } else {
    rows.push({ label: 'Linked payments', value: 'None' });
  }

  return rows;
}

/** Plain-text fields aligned with admin finance payment detail (for print/PDF export). */
export function buildAdminPaymentPdfFields(payment: LicencePaymentResource): AdminFinancePdfField[] {
  const institution = payment.institution ?? payment.related_entities?.institution;
  const invoice = payment.invoice ?? payment.related_entities?.invoice;
  const licence = payment.licence ?? payment.related_entities?.licence;
  const declaration = payment.declaration ?? payment.related_entities?.declaration;
  const cur = payment.currency ?? 'NGN';

  const rows: AdminFinancePdfField[] = [
    { label: 'Payment reference', value: payment.payment_reference ?? `#${payment.id}` },
    { label: 'Internal payment ID', value: payment.id },
    { label: 'Payment status', value: payment.payment_status ?? '—' },
    { label: 'Settlement', value: settlementLabel(payment.settlement_summary) },
    { label: 'Currency', value: cur },
    { label: 'Amount', value: formatCurrency(payment.amount, cur) },
    { label: 'Amount allocated', value: formatCurrency(payment.amount_allocated ?? payment.amount, cur) },
    { label: 'Balance before', value: formatCurrency(payment.balance_before, cur) },
    { label: 'Balance after', value: formatCurrency(payment.balance_after, cur) },
    { label: 'Paid on', value: formatDate(payment.paid_at) },
    { label: 'Created', value: formatDate(payment.created_at) },
    { label: 'Updated', value: formatDate(payment.updated_at) },
    { label: 'Gateway', value: payment.gateway_name ?? '—' },
    { label: 'Gateway reference', value: payment.gateway_reference ?? '—' },
    { label: 'Provider event ID', value: payment.provider_event_id ?? '—' },
    { label: 'Licence ID', value: payment.licence_id },
    { label: 'Invoice ID', value: payment.invoice_id ?? '—' },
    { label: 'Institution', value: institution?.name ?? '—' },
    { label: 'Institution licence ID', value: institution?.licence_id ?? '—' },
    { label: 'Institution email', value: payment.institution?.email ?? '—' },
    { label: 'Invoice', value: invoice?.invoice_number ? `${invoice.invoice_number} (${invoice.status ?? '—'})` : '—' },
    { label: 'Invoice due', value: formatDate(invoice?.due_date) },
    { label: 'Licence', value: licence?.licence_number ?? '—' },
    { label: 'Licence year', value: payment.licence?.licence_year ?? '—' },
    { label: 'Licence status', value: licence?.licence_status ?? '—' },
    { label: 'Declaration', value: declaration?.id ? `#${declaration.id}` : '—' },
    { label: 'Declaration year', value: declaration?.licensing_year ?? '—' },
    { label: 'Declaration status', value: declaration?.declaration_status ?? '—' },
    { label: 'Outstanding on declaration', value: formatCurrency(payment.declaration?.outstanding_amount ?? null, cur) },
  ];

  if (payment.offline) {
    rows.push(
      { label: 'Offline — paid in full', value: payment.offline.paid_in_full ? 'Yes' : 'No' },
      { label: 'Offline — institution note', value: payment.offline.institution_note || '—' },
      { label: 'Offline — submitted at', value: formatDate(payment.offline.submitted_at) },
    );
    if (payment.offline.rejection_reason) {
      rows.push({ label: 'Offline — rejection reason', value: payment.offline.rejection_reason });
    }
  }

  const recent = payment.audit_summary?.recent_actions ?? [];
  if (recent.length) {
    rows.push({
      label: 'Recent actions',
      value: recent
        .slice(0, 10)
        .map((a) => `${formatDate(a.created_at)} — ${a.label ?? a.type ?? 'action'}`)
        .join(' · '),
    });
  }

  rows.push(
    { label: 'Reconciliation count', value: payment.audit_summary?.reconciliation_count ?? '—' },
    { label: 'Last action at', value: formatDate(payment.audit_summary?.last_action_at) },
  );

  return rows;
}
