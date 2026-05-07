import type { UserResource } from '@/types/domain';

/** Normalize a user-like object from the API (snake_case or camelCase, partial shapes). */
export function coerceUserLike(user: unknown): Pick<UserResource, 'first_name' | 'last_name' | 'name'> | null {
  if (!user || typeof user !== 'object') return null;
  const o = user as Record<string, unknown>;
  const first =
    (typeof o.first_name === 'string' ? o.first_name : typeof o.firstName === 'string' ? o.firstName : '').trim();
  const last =
    (typeof o.last_name === 'string' ? o.last_name : typeof o.lastName === 'string' ? o.lastName : '').trim();
  const name = (typeof o.name === 'string' ? o.name : '').trim();
  const email = (typeof o.email === 'string' ? o.email : '').trim();
  const displayName = name || [first, last].filter(Boolean).join(' ').trim() || email;
  if (!displayName && !first && !last) return null;
  return {
    first_name: first,
    last_name: last,
    name: displayName,
  };
}

/** Split a display name into first token vs remainder (e.g. "Ada Marie Curie" → first + rest as last). */
export function splitDisplayName(name: string | undefined | null): { first: string; last: string } {
  const n = (name ?? '').trim();
  if (!n) return { first: '', last: '' };
  const parts = n.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return { first: parts[0] ?? '', last: '' };
  return { first: parts[0] ?? '', last: parts.slice(1).join(' ') };
}

/** Prefer API `first_name` / `last_name`; otherwise derive from `name`. */
export function firstLastFromUser(user: UserResource | null | undefined): { first_name: string; last_name: string } {
  if (!user) return { first_name: '', last_name: '' };
  const f = user.first_name?.trim() ?? '';
  const l = user.last_name?.trim() ?? '';
  if (f || l) return { first_name: f, last_name: l };
  const { first, last } = splitDisplayName(user.name);
  return { first_name: first, last_name: last };
}

/**
 * Merge several `UserResource` snapshots (profile API, `/me` user, `member_profile.user`, etc.).
 * Picks explicit `first_name` / `last_name` when present, then fills gaps from `name` (display split).
 */
export function mergedFirstLastFromUsers(
  ...users: (UserResource | null | undefined | unknown)[]
): { first_name: string; last_name: string } {
  const list = users
    .map((raw) => coerceUserLike(raw))
    .filter((u): u is Pick<UserResource, 'first_name' | 'last_name' | 'name'> => u != null);
  let first_name = '';
  let last_name = '';
  for (const u of list) {
    const f = u.first_name?.trim() ?? '';
    const l = u.last_name?.trim() ?? '';
    if (f && !first_name) first_name = f;
    if (l && !last_name) last_name = l;
  }
  for (const u of list) {
    if (first_name && last_name) break;
    const { first, last } = splitDisplayName(u.name);
    if (!first_name) first_name = first;
    if (!last_name) last_name = last;
  }
  return { first_name: first_name.trim(), last_name: last_name.trim() };
}
