export function formatDisplayLabel(input?: string | null): string {
  if (!input) return '—';
  const normalized = input
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim();

  if (!normalized) return '—';

  return normalized
    .split(/\s+/)
    .map((word) => {
      if (!word) return word;
      if (word === word.toUpperCase() && word.length > 1) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

export function formatDisplayValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed.includes('_')) return value;
  if (trimmed.includes('@') || trimmed.includes('://') || trimmed.includes('/')) return value;
  if (/\s/.test(trimmed)) return value.replace(/_/g, ' ');
  return formatDisplayLabel(trimmed);
}
