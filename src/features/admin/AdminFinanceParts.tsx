import type { ReactNode } from 'react';
import { Alert } from '@/components/ui/alert';
import { StatusBadge } from '@/components/shared/StatusBadge';
import type { InvoiceResource, LicencePaymentResource, SettlementSummaryResource } from '@/types/domain';
import { formatCurrency, formatDate } from '@/utils/format';

export const tabOptions = [
  { key: 'invoices', label: 'Invoices' },
  { key: 'payments', label: 'Payments' },
  { key: 'licences', label: 'Licences' },
  { key: 'fee-plans', label: 'Fee plans' },
] as const;

export const financeStatusOptions = [
  { label: 'Paid', value: 'paid' },
  { label: 'Partially paid', value: 'partially_paid' },
  { label: 'Outstanding', value: 'outstanding' },
  { label: 'Pending', value: 'pending' },
  { label: 'Failed', value: 'failed' },
  { label: 'Rejected', value: 'rejected' },
];

export type AdminFinanceTab = 'invoices' | 'payments' | 'licences' | 'fee-plans' | 'imports' | 'audit';
export type DetailModal = 'invoice' | 'payment' | 'licence' | 'fee-plan' | 'audit' | 'fee-plan-form' | null;

export function SummaryCard({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#EAECF0] dark:border-slate-800 bg-[#FCFCFD] dark:bg-slate-900 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-[#667085] dark:text-slate-300 dark:text-slate-400">{label}</p>
      <div className="mt-2 max-w-full break-all text-base font-semibold leading-tight text-[#101828] dark:text-slate-100 sm:text-[17px]">{value}</div>
      {hint ? <p className="mt-1 break-words text-xs text-[#667085] dark:text-slate-300 dark:text-slate-400">{hint}</p> : null}
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

export function SettlementBanner({ summary }: { summary?: SettlementSummaryResource | null }) {
  if (!summary) return null;
  return (
    <div className={`rounded-2xl border px-4 py-3 ${settlementTone(summary)}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{summary.label}</p>
          <p className="mt-1 text-sm opacity-90">Paid {formatCurrency(summary.amount_paid)} • Outstanding {formatCurrency(summary.outstanding_amount)}</p>
        </div>
        {summary.due_date ? <p className="text-xs font-medium">Due {formatDate(summary.due_date)}</p> : null}
      </div>
    </div>
  );
}

function LinkedRecordTile({
  title,
  value,
  subtitle,
  badge,
  valueDense = false,
}: {
  title: string;
  value: ReactNode;
  subtitle?: string;
  badge?: ReactNode;
  /** Smaller, wrapping-friendly text for long refs (e.g. invoice / licence numbers). */
  valueDense?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</p>
      <div
        className={
          valueDense
            ? 'mt-2 min-w-0 max-w-full break-all text-xs font-semibold leading-snug text-slate-950 dark:text-slate-100 sm:text-[13px]'
            : 'mt-2 text-[15px] font-semibold leading-6 text-slate-950 dark:text-slate-100'
        }
      >
        {value}
      </div>
      {subtitle ? <p className="mt-2 break-words text-sm leading-6 text-slate-600 dark:text-slate-300">{subtitle}</p> : null}
      {badge ? <div className="mt-2">{badge}</div> : null}
    </div>
  );
}

export function LinkedInvoiceRecords({ invoice }: { invoice: InvoiceResource }) {
  const records: {
    title: string;
    value: ReactNode;
    subtitle?: string;
    badge?: ReactNode;
    valueDense?: boolean;
  }[] = [
    { title: 'Institution', value: invoice.related_entities?.institution?.name ?? invoice.institution?.name ?? 'Not linked', subtitle: invoice.related_entities?.institution?.licence_id ?? invoice.institution?.licence_id ?? 'No licence ID', badge: null },
    { title: 'Declaration', value: invoice.related_entities?.declaration?.id ? `Declaration #${invoice.related_entities.declaration.id}` : 'Not linked', subtitle: invoice.related_entities?.declaration?.licensing_year ? `Year ${invoice.related_entities.declaration.licensing_year}` : undefined, badge: invoice.related_entities?.declaration?.declaration_status ? <StatusBadge value={invoice.related_entities.declaration.declaration_status} /> : null },
    { title: 'Licence', value: invoice.related_entities?.licence?.licence_number ?? invoice.licence?.licence_number ?? 'Not linked', subtitle: invoice.related_entities?.licence?.id ? `Record #${invoice.related_entities.licence.id}` : undefined, badge: invoice.related_entities?.licence?.licence_status ? <StatusBadge value={invoice.related_entities.licence.licence_status} /> : null, valueDense: true },
  ];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Linked records</p>
      <div className="mt-4 grid min-w-0 gap-3 md:grid-cols-3">
        {records.map((record) => (
          <LinkedRecordTile key={record.title} title={record.title} value={record.value} subtitle={record.subtitle} badge={record.badge} valueDense={record.valueDense} />
        ))}
      </div>
    </div>
  );
}

export function LinkedPaymentRecords({ payment }: { payment: LicencePaymentResource }) {
  const records: {
    title: string;
    value: ReactNode;
    subtitle?: string;
    badge?: ReactNode;
    valueDense?: boolean;
  }[] = [
    { title: 'Institution', value: payment.related_entities?.institution?.name ?? payment.institution?.name ?? 'Not linked', subtitle: payment.related_entities?.institution?.licence_id ?? payment.institution?.licence_id ?? 'No licence ID', badge: null },
    { title: 'Declaration', value: payment.related_entities?.declaration?.id ? `Declaration #${payment.related_entities.declaration.id}` : 'Not linked', subtitle: payment.related_entities?.declaration?.licensing_year ? `Year ${payment.related_entities.declaration.licensing_year}` : undefined, badge: payment.related_entities?.declaration?.declaration_status ? <StatusBadge value={payment.related_entities.declaration.declaration_status} /> : null },
    { title: 'Licence', value: payment.related_entities?.licence?.licence_number ?? payment.licence?.licence_number ?? 'Not linked', subtitle: payment.related_entities?.licence?.id ? `Record #${payment.related_entities.licence.id}` : undefined, badge: payment.related_entities?.licence?.licence_status ? <StatusBadge value={payment.related_entities.licence.licence_status} /> : null, valueDense: true },
    { title: 'Invoice', value: payment.related_entities?.invoice?.invoice_number ?? payment.invoice?.invoice_number ?? 'Not linked', subtitle: payment.related_entities?.invoice?.due_date ? `Due ${formatDate(payment.related_entities.invoice.due_date)}` : undefined, badge: payment.related_entities?.invoice?.status ? <StatusBadge value={payment.related_entities.invoice.status} /> : null, valueDense: true },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Linked records</p>
      <div className="mt-4 grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {records.map((record) => (
          <LinkedRecordTile key={record.title} title={record.title} value={record.value} subtitle={record.subtitle} badge={record.badge} valueDense={record.valueDense} />
        ))}
      </div>
    </div>
  );
}

export function CompactReference({ primary, secondary, tertiary }: { primary: ReactNode; secondary?: ReactNode; tertiary?: ReactNode }) {
  return (
    <div className="min-w-[160px]">
      <div className="text-sm font-semibold text-[#101828]">{primary}</div>
      {secondary ? <div className="mt-1 break-words text-xs text-[#667085] dark:text-slate-300 dark:text-slate-400">{secondary}</div> : null}
      {tertiary ? <div className="mt-1 text-xs text-[#98A2B3]">{tertiary}</div> : null}
    </div>
  );
}

export function CompactStatusStack({ primary, secondary }: { primary?: string | null; secondary?: string | null }) {
  return (
    <div className="flex min-w-[150px] flex-wrap gap-2">
      {primary ? <StatusBadge value={primary} /> : <span className="text-sm text-[#667085] dark:text-slate-300">—</span>}
      {secondary ? <StatusBadge value={secondary} /> : null}
    </div>
  );
}

export function InvoiceLinkedRefsCell({ row }: { row: InvoiceResource }) {
  return (
    <div className="min-w-[190px] space-y-1">
      <div className="text-sm font-semibold text-[#101828]">{row.institution?.name ?? row.related_entities?.institution?.name ?? 'Institution not linked'}</div>
      <div className="text-xs text-[#667085] dark:text-slate-300">{row.licence?.licence_number ?? row.related_entities?.licence?.licence_number ?? 'No licence linked'}</div>
      <div className="text-xs text-[#98A2B3]">{row.declaration?.id ?? row.related_entities?.declaration?.id ? `Declaration #${row.declaration?.id ?? row.related_entities?.declaration?.id}` : 'No declaration linked'}</div>
    </div>
  );
}

export function PaymentLinkedRefsCell({ row }: { row: LicencePaymentResource }) {
  return (
    <div className="min-w-[200px] space-y-1">
      <div className="text-sm font-semibold text-[#101828]">{row.institution?.name ?? row.related_entities?.institution?.name ?? 'Institution not linked'}</div>
      <div className="text-xs text-[#667085] dark:text-slate-300">{row.invoice?.invoice_number ?? row.related_entities?.invoice?.invoice_number ?? 'No invoice linked'}</div>
      <div className="text-xs text-[#98A2B3]">{row.licence?.licence_number ?? row.related_entities?.licence?.licence_number ?? 'No licence linked'}{(row.declaration?.id ?? row.related_entities?.declaration?.id) ? ` · Declaration #${row.declaration?.id ?? row.related_entities?.declaration?.id}` : ''}</div>
    </div>
  );
}

export function CompactMoneySummary({ primary, secondary, tertiary, currency = 'NGN' }: { primary?: number | null; secondary?: number | null; tertiary?: number | null; currency?: string | null }) {
  return (
    <div className="min-w-[150px] space-y-1">
      <div className="text-sm font-semibold text-[#101828]">{formatCurrency(primary ?? 0, currency ?? 'NGN')}</div>
      {typeof secondary === 'number' ? <div className="text-xs text-[#667085] dark:text-slate-300">Paid/Allocated {formatCurrency(secondary, currency ?? 'NGN')}</div> : null}
      {typeof tertiary === 'number' ? <div className="text-xs text-[#98A2B3]">Outstanding/Balance {formatCurrency(tertiary, currency ?? 'NGN')}</div> : null}
    </div>
  );
}

export function PaymentRecentActions({ payment }: { payment: LicencePaymentResource }) {
  const actions = payment.audit_summary?.recent_actions ?? [];
  if (!actions.length) return <Alert title="No recent payment actions" description="Payment status and reconciliation updates will appear here." />;

  return (
    <div className="rounded-2xl border border-[#EAECF0] dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
      <p className="text-sm font-semibold text-[#344054] dark:text-slate-200">Recent payment actions</p>
      <div className="mt-3 space-y-2">
        {actions.map((action) => (
          <div key={action.id} className="flex items-start justify-between gap-3 rounded-xl bg-[#F9FAFB] px-3 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#101828]">{action.label ?? 'Action'}</p>
              <p className="mt-1 break-words text-xs text-[#667085] dark:text-slate-300 dark:text-slate-400">{action.description ?? '—'}</p>
              <p className="mt-1 break-words text-xs text-[#667085] dark:text-slate-300 dark:text-slate-400">{action.actor?.name ?? 'System'} · {formatDate(action.created_at)}</p>
            </div>
            <div className="text-right text-sm font-semibold text-[#101828]">
              {typeof action.amount === 'number' ? formatCurrency(action.amount, payment.currency ?? 'NGN') : '—'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function InvoiceRecentActions({ invoice }: { invoice: InvoiceResource }) {
  const actions = invoice.audit_summary?.recent_actions ?? [];
  if (!actions.length) return <Alert title="No recent invoice actions" description="Adjustments and payment updates will appear here." />;
  return (
    <div className="rounded-2xl border border-[#EAECF0] dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
      <p className="text-sm font-semibold text-[#344054] dark:text-slate-200">Recent invoice actions</p>
      <div className="mt-3 space-y-2">{actions.map((action) => <div key={action.id} className="flex items-start justify-between gap-3 rounded-xl bg-[#F9FAFB] px-3 py-3"><div className="min-w-0"><p className="text-sm font-semibold text-[#101828]">{action.label ?? 'Action'}</p><p className="mt-1 break-words text-xs text-[#667085] dark:text-slate-300 dark:text-slate-400">{action.description ?? '—'}</p><p className="mt-1 break-words text-xs text-[#667085] dark:text-slate-300 dark:text-slate-400">{action.actor?.name ?? 'System'} · {formatDate(action.created_at)}</p></div><div className="text-right text-sm font-semibold text-[#101828]">{typeof action.amount === 'number' ? formatCurrency(action.amount, invoice.currency ?? 'NGN') : '—'}</div></div>)}</div>
    </div>
  );
}
