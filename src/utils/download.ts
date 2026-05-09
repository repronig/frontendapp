export function triggerBlobDownload(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

/**
 * Best-effort filename from Content-Disposition (RFC 5987 filename* and quoted filename).
 * Browsers may hide this header on cross-origin responses unless the API exposes it.
 */
export function parseFilenameFromContentDisposition(disposition: string): string | null {
  const raw = disposition.trim();
  if (!raw) return null;

  const star = raw.match(/filename\*=(?:UTF-8'')?([^;]+)/i);
  if (star?.[1]) {
    let inner = star[1].trim().replace(/^["']|["']$/g, '');
    inner = inner.replace(/^UTF-8''/i, '');
    try {
      return decodeURIComponent(inner);
    } catch {
      return inner;
    }
  }

  const quoted = raw.match(/filename="([^"]+)"/i);
  if (quoted?.[1]) return quoted[1];

  const loose = raw.match(/filename=([^;\s]+)/i);
  if (loose?.[1]) return loose[1].replace(/^["']|["']$/g, '');

  return null;
}
