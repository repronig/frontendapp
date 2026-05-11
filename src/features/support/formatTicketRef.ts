/** `#` + id zero-padded to `digitCount + 3` (three leading zeros before the number, e.g. `#00012`). */
export function formatSupportTicketRef(id: number): string {
  if (!Number.isFinite(id) || id < 0) return '#';
  const s = String(Math.max(0, Math.trunc(id)));
  return `#${s.padStart(s.length + 3, '0')}`;
}
