export interface PdfHeaderOptions {
  eyebrow?: string;
  organizationName?: string | null;
  logoUrl?: string | null;
  /** Line under the logo in receipt-style row exports (e.g. platform display name). */
  platformName?: string | null;
}

/** Same asset as `AppLogo` / `public/assets/repronig-logo.png` (PDF used `/repronig-logo.png`, which 404s). */
function repronigLogoPathname(): string {
  const base =
    typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL != null
      ? String(import.meta.env.BASE_URL)
      : '/';
  return `${base}assets/repronig-logo.png`.replace(/\/{2,}/g, '/');
}

/** Absolute logo URL for print preview (browser resolves before print). */
export function defaultPrintLogoUrl(): string {
  const pathname = repronigLogoPathname();
  if (typeof window === 'undefined') return pathname;
  try {
    return new URL(pathname, window.location.origin).href;
  } catch {
    return pathname;
  }
}

/**
 * Refetches detail (or any async prep), then opens the printable document so images and data are ready.
 */
export async function exportDetailToPdfWhenReady(
  title: string,
  options: {
    prepare: () => Promise<unknown>;
    buildFields: () => Array<{ label: string; value: string | number | null | undefined }>;
    header?: PdfHeaderOptions;
  },
): Promise<void> {
  await options.prepare();
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
  const fields = options.buildFields();
  exportDetailToPdf(title, fields, {
    ...options.header,
    logoUrl: options.header?.logoUrl ?? defaultPrintLogoUrl(),
  });
}

export function exportDetailToPdf(title: string, fields: Array<{ label: string; value: string | number | null | undefined }>, header?: PdfHeaderOptions) {
  const rows = fields.map((field) => `<tr><th>${escapeHtml(field.label)}</th><td>${escapeHtml(String(field.value ?? '—'))}</td></tr>`).join('');
  printHtml(title, `<!doctype html><html><head><title>${escapeHtml(title)}</title><style>${pdfStyles('portrait')}</style></head><body>${renderHeader(title, header)}<main><table>${rows}</table></main>${printScript()}</body></html>`);
}

export type ExportRowsPdfLayout = 'default' | 'receipt';

export function exportRowsToPdf(
  title: string,
  columns: Array<{ label: string; getValue: (row: Record<string, unknown>) => string | number | null | undefined }>,
  rows: Array<Record<string, unknown>>,
  header?: PdfHeaderOptions,
  options?: { layout?: ExportRowsPdfLayout },
) {
  const layout = options?.layout ?? 'default';
  const headerCells = columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join('');
  const bodyRows = rows.map((row) => `<tr>${columns.map((column) => `<td>${escapeHtml(String(column.getValue(row) ?? '—'))}</td>`).join('')}</tr>`).join('');
  const tableRows = bodyRows || '<tr><td colspan="99">No records available.</td></tr>';
  const tableDefault = `<table><thead><tr>${headerCells}</tr></thead><tbody>${tableRows}</tbody></table>`;
  const tableReceipt = `<table class="receipt-meta-table"><thead><tr>${headerCells}</tr></thead><tbody>${tableRows}</tbody></table>`;

  if (layout === 'receipt') {
    const logoUrl = header?.logoUrl || defaultPrintLogoUrl();
    const watermarkUrl = cssUrlValue(logoUrl);
    const masthead = renderReceiptMasthead(header);
    const platformFooter = escapeHtml(header?.platformName ?? 'REPRONIG Digital Rights Management Platform');
    printHtml(
      title,
      `<!doctype html><html><head><title>${escapeHtml(title)}</title><style>${pdfReceiptStyles()}</style></head><body class="receipt-document"><div class="sheet"><div class="watermark" style="background-image:url(${watermarkUrl});"></div><div class="receipt-foreground">${masthead}<main class="receipt-main"><h1 class="receipt-doc-title">${escapeHtml(title)}</h1><p class="receipt-doc-sub">Confirmation of payment lines for this invoice.</p><div class="section-label">Payment details</div>${tableReceipt}</main><footer class="receipt-footer">Thank you for your payment. Please retain this receipt for your records.<br><strong>${platformFooter}</strong></footer></div></div>${printScript()}</body></html>`,
    );
    return;
  }

  printHtml(title, `<!doctype html><html><head><title>${escapeHtml(title)}</title><style>${pdfStyles('landscape')}</style></head><body>${renderHeader(title, header)}<main>${tableDefault}</main>${printScript()}</body></html>`);
}

function cssUrlValue(url: string): string {
  return `'${url.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function renderReceiptMasthead(header?: PdfHeaderOptions): string {
  const logoUrl = header?.logoUrl || defaultPrintLogoUrl();
  const logo = `<img src="${escapeHtml(logoUrl)}" alt="REPRONIG" style="max-width:190px;max-height:72px;width:auto;height:auto;display:block;margin:0 auto;" />`;
  const platformLine = escapeHtml(header?.platformName ?? 'REPRONIG Digital Rights Management Platform');
  const generatedAt = new Date().toLocaleString();
  return `<header class="pdf-masthead"><div class="brand-mark">${logo}</div><div class="pdf-platform">${platformLine}</div><div class="generated-date">Generated ${escapeHtml(generatedAt)}</div></header>`;
}

function renderHeader(title: string, header?: PdfHeaderOptions) {
  const logoUrl = header?.logoUrl || defaultPrintLogoUrl();
  const logo = `<img src="${escapeHtml(logoUrl)}" alt="REPRONIG" width="220" height="88" />`;
  const eyebrow = header?.eyebrow ? `<p>${escapeHtml(header.eyebrow)}</p>` : '<p>REPRONIG Digital Rights Management System</p>';
  const organization = header?.organizationName ? `<strong>${escapeHtml(header.organizationName)}</strong>` : '';
  const generatedAt = new Date().toLocaleString();
  return `<header class="pdf-header"><div class="brand-mark">${logo}</div><div class="brand-wordmark" aria-hidden="true">REPRONIG</div>${eyebrow}<h1>${escapeHtml(title)}</h1>${organization}<div class="generated-date">Generated date: ${escapeHtml(generatedAt)}</div></header>`;
}

function pdfStyles(orientation: 'portrait' | 'landscape') {
  return `
    @page{size:${orientation};margin:${orientation === 'landscape' ? '18mm' : '22mm'};}
    *{box-sizing:border-box;}
    body{font-family:Arial,Helvetica,sans-serif;margin:0;padding:0;color:#101828;background:#fff;}
    main{width:100%;}
    h1{font-size:24px;margin:8px 0 6px;line-height:1.25;text-align:center;}
    .pdf-header{display:flex;flex-direction:column;align-items:center;text-align:center;margin:0 0 28px;padding-bottom:18px;border-bottom:2px solid #6a1025;}
    .pdf-header p{margin:8px 0 0;color:#667085;text-transform:uppercase;font-size:10px;letter-spacing:.12em;font-weight:700;}
    .pdf-header strong{display:block;color:#344054;font-size:14px;}
    .generated-date{margin-top:12px;color:#667085;font-size:12px;}
    .brand-mark{width:260px;min-height:72px;display:flex;align-items:center;justify-content:center;overflow:hidden;}
    .brand-mark img{max-width:260px;max-height:88px;width:auto;height:auto;object-fit:contain;display:block;}
    .brand-wordmark{margin-top:4px;font-size:11px;font-weight:800;letter-spacing:0.28em;color:#6a1025;}
    table{width:100%;border-collapse:collapse;table-layout:auto;margin-top:10px;}
    th,td{border:1px solid #EAECF0;padding:${orientation === 'landscape' ? '9px' : '12px'};text-align:left;font-size:${orientation === 'landscape' ? '11px' : '14px'};vertical-align:top;word-break:break-word;overflow-wrap:anywhere;}
    th{background:#FCFCF7;color:#475467;text-transform:uppercase;font-size:${orientation === 'landscape' ? '9px' : '11px'};letter-spacing:.08em;}
    @media print{button{display:none!important;}}
  `;
}

/** Matches institution API `payment-receipt` PDF (white sheet, wine accents, tiled logo, green amount column). */
function pdfReceiptStyles() {
  return `
    @page{size:portrait;margin:20px 26px;}
    *{box-sizing:border-box;}
    html,body{height:auto;margin:0;padding:0;}
    body.receipt-document{
      font-family:DejaVu Sans,Helvetica,Arial,sans-serif;
      font-size:10.5pt;
      margin:0;
      padding:0;
      color:#1a1a1a;
      background:#ffffff;
      -webkit-print-color-adjust:exact;
      print-color-adjust:exact;
    }
    .sheet{
      position:relative;
      overflow:hidden;
      background:#ffffff;
      border:1px solid rgba(106,16,37,0.22);
      box-shadow:0 0 0 5px rgba(250,246,240,0.9);
      min-height:280mm;
    }
    .watermark{
      position:absolute;
      left:0;top:0;right:0;bottom:0;
      width:100%;
      min-height:280mm;
      z-index:0;
      opacity:0.038;
      background-repeat:repeat;
      background-size:72px auto;
      background-position:0 0;
      pointer-events:none;
    }
    .receipt-foreground{position:relative;z-index:1;background:transparent;}
    .pdf-masthead{
      padding:40px 32px 18px;
      border-bottom:3px double #6a1025;
      background:transparent;
      text-align:center;
    }
    .pdf-masthead .brand-mark{margin:0 auto;}
    .pdf-platform{
      font-size:11pt;
      font-weight:700;
      color:#2b0a12;
      margin:2px 0 0;
      letter-spacing:0.02em;
    }
    .pdf-masthead .generated-date{
      font-size:8.5pt;
      color:#667085;
      margin:8px 0 0;
    }
    .receipt-main{
      padding:22px 32px 32px;
      background:transparent;
    }
    .receipt-doc-title{
      font-size:17pt;
      font-weight:700;
      margin:0 0 4px;
      color:#6a1025;
      text-align:center;
      letter-spacing:0.04em;
    }
    .receipt-doc-sub{
      text-align:center;
      font-size:9pt;
      color:#667085;
      margin:0 0 22px;
    }
    .section-label{
      font-size:7.5pt;
      text-transform:uppercase;
      letter-spacing:0.14em;
      color:#6a1025;
      font-weight:700;
      margin:0 0 8px;
      padding-bottom:4px;
      border-bottom:1px solid rgba(106,16,37,0.2);
    }
    .receipt-meta-table{
      width:100%;
      border-collapse:collapse;
      margin:0 0 8px;
    }
    .receipt-meta-table th,
    .receipt-meta-table td{
      padding:10px 8px 10px 0;
      vertical-align:top;
      border-bottom:1px solid rgba(106,16,37,0.1);
      text-align:left;
    }
    .receipt-meta-table thead th{
      width:auto;
      font-size:8.25pt;
      text-transform:uppercase;
      letter-spacing:0.07em;
      color:#5a3d45;
      font-weight:700;
    }
    .receipt-meta-table tbody td{
      font-weight:600;
      color:#1a1a1a;
      font-size:10.25pt;
    }
    .receipt-meta-table tbody tr:nth-child(even) td{background:rgba(106,16,37,0.03);}
    .receipt-meta-table tbody tr:last-child td{border-bottom:0;}
    .receipt-meta-table tbody td:nth-child(4){color:#129242;font-weight:700;}
    .receipt-footer{
      margin-top:26px;
      padding-top:14px;
      border-top:1px solid rgba(106,16,37,0.18);
      font-size:7.75pt;
      color:#667085;
      text-align:center;
      line-height:1.55;
    }
    .receipt-footer strong{color:#2b0a12;font-weight:700;}
    @media print{
      button{display:none!important;}
      body.receipt-document{background:#fff;}
    }
  `;
}

function printScript() {
  return `<script>
    async function waitForImages(){
      const images = Array.from(document.images || []);
      await Promise.all(images.map(function(img){
        if (img.complete && img.naturalWidth > 0) return Promise.resolve();
        return new Promise(function(resolve){
          img.onload = resolve;
          img.onerror = resolve;
          setTimeout(resolve, 2800);
        });
      }));
    }
    window.onload = function(){
      waitForImages().finally(function(){
        setTimeout(function(){ window.focus(); window.print(); }, 420);
      });
    };
  <\/script>`;
}

function printHtml(title: string, html: string) {
  const printWindow = window.open('', '_blank', 'width=1100,height=800');
  if (printWindow?.document) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    return;
  }

  const printFrame = document.createElement('iframe');
  printFrame.title = title;
  printFrame.style.position = 'fixed';
  printFrame.style.right = '0';
  printFrame.style.bottom = '0';
  printFrame.style.width = '0';
  printFrame.style.height = '0';
  printFrame.style.border = '0';
  document.body.appendChild(printFrame);

  const frameDocument = printFrame.contentWindow?.document;
  if (frameDocument) {
    frameDocument.open();
    frameDocument.write(html);
    frameDocument.close();
    window.setTimeout(() => printFrame.remove(), 15000);
    return;
  }

  printFrame.remove();
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${slugify(title)}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'export';
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  }[char] ?? char));
}
