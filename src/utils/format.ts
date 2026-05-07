export function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatFileSize(value?: number | null) {
  if (!value && value !== 0) return 'Unknown size';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}


export function formatCurrency(value?: number | string | null, currency: string | null = 'NGN') {
  if (value === null || value === undefined || value === "") return "—";

  const amount = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(amount)) return String(value);

  const currencyCode = (currency ?? 'NGN').toUpperCase();
  const formattedAmount = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);

  if (currencyCode === 'NGN') {
    return `₦${formattedAmount}`;
  }

  return new Intl.NumberFormat(undefined, { style: 'currency', currency: currencyCode, maximumFractionDigits: 2 }).format(amount);
}

/** Total payment amount ÷ total invoice amount, for dashboard collection hints. */
export function formatPaymentVolumeVsInvoiceTotal(paymentSum: number, invoiceSum: number): string {
  if (!Number.isFinite(paymentSum) || !Number.isFinite(invoiceSum) || invoiceSum <= 0) {
    return '— vs invoice total';
  }
  const pct = (paymentSum / invoiceSum) * 100;
  const rounded = Math.round(pct * 10) / 10;
  return `${rounded}% of invoice total`;
}

export function formatRelativeTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const diffSeconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diffSeconds < 60) return `${diffSeconds || 1}s ago`;
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}d ago`;
  return formatDate(value);
}


export function humanizeLabel(value?: string | null, options?: { keepModelNamespace?: boolean }) {
  if (!value) return '—';
  const withoutNamespace = options?.keepModelNamespace ? value.replace(/App\\Models\\/g, 'App model ') : value.replace(/App\\Models\\/g, '');
  const cleaned = withoutNamespace
    .replace(/[._\-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : '—';
}

export function humanizeActivityLabel(value?: string | null) {
  return humanizeLabel(value);
}

export function humanizeActivitySubject(value?: string | null) {
  return humanizeLabel(value);
}

export function humanizeAdminSubject(value?: string | null) {
  return humanizeLabel(value, { keepModelNamespace: true });
}
