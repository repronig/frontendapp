/** Escape plain text for safe insertion into HTML (paragraph fallback). */
export function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

/**
 * Turn API terms `content` into HTML: pass through real HTML, or wrap plain text in paragraphs.
 */
export function formatTermsContent(content?: string) {
  if (!content?.trim()) {
    return '<p>Terms and conditions have not been published yet. Please contact REPRONIG support.</p>';
  }

  const trimmed = content.trim();
  const containsHtml = /<\/?[a-z][\s\S]*>/i.test(trimmed);

  if (containsHtml) {
    return trimmed;
  }

  return trimmed
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`)
    .join('');
}
