import type { QueryClient, QueryKey } from '@tanstack/react-query';
import type { PaginatedResponse } from '@/types/api';
import type { UserNotificationResource } from '@/types/domain';
import { queryKeys } from '@/lib/queryKeys';

/** Layout dropdown stores `UserNotificationResource[]`; list pages store full `PaginatedResponse`. */
export type NotificationCacheValue = UserNotificationResource[] | PaginatedResponse<UserNotificationResource> | undefined;

export function notificationIdEquals(n: UserNotificationResource, rawId: string | number): boolean {
  return String(n.id) === String(rawId);
}

/** Whether the notification appears unread anywhere in this cache entry. */
export function notificationWasUnread(cacheValue: NotificationCacheValue, rawId: string | number): boolean {
  const list = notificationsFromCacheEntry(cacheValue);
  return list.some((n) => notificationIdEquals(n, rawId) && !n.read_at);
}

function notificationsFromCacheEntry(cacheValue: NotificationCacheValue): UserNotificationResource[] {
  if (!cacheValue) return [];
  if (Array.isArray(cacheValue)) return cacheValue;
  return cacheValue.data ?? [];
}

export function patchNotificationReadAt(
  cacheValue: NotificationCacheValue,
  rawId: string | number,
  readAt: string,
): NotificationCacheValue {
  if (!cacheValue) return cacheValue;
  if (Array.isArray(cacheValue)) {
    return cacheValue.map((n) => (notificationIdEquals(n, rawId) ? { ...n, read_at: readAt } : n));
  }
  if ('data' in cacheValue && Array.isArray(cacheValue.data)) {
    return {
      ...cacheValue,
      data: cacheValue.data.map((n) => (notificationIdEquals(n, rawId) ? { ...n, read_at: readAt } : n)),
    };
  }
  return cacheValue;
}

export function markAllNotificationsReadInEntry(cacheValue: NotificationCacheValue, readAt: string): NotificationCacheValue {
  if (!cacheValue) return cacheValue;
  if (Array.isArray(cacheValue)) {
    return cacheValue.map((n) => ({ ...n, read_at: n.read_at ?? readAt }));
  }
  if ('data' in cacheValue && Array.isArray(cacheValue.data)) {
    return {
      ...cacheValue,
      data: cacheValue.data.map((n) => ({ ...n, read_at: n.read_at ?? readAt })),
    };
  }
  return cacheValue;
}

/** Snapshot every notification-related query cached under the `notifications` prefix (dropdown + inbox pages). */
export function snapshotNotificationQueryEntries(queryClient: QueryClient): [QueryKey, unknown][] {
  return queryClient.getQueriesData({ queryKey: queryKeys.notifications, exact: false });
}

export function restoreNotificationQueryEntries(queryClient: QueryClient, entries: [QueryKey, unknown][]) {
  entries.forEach(([key, data]) => queryClient.setQueryData(key, data));
}

export function patchAllNotificationCaches(queryClient: QueryClient, updater: (prev: NotificationCacheValue) => NotificationCacheValue) {
  queryClient.setQueriesData({ queryKey: queryKeys.notifications, exact: false }, (old: unknown) => updater(old as NotificationCacheValue));
}

export function decrementUnreadCountCache(queryClient: QueryClient) {
  queryClient.setQueryData(queryKeys.notificationsUnreadCount, (old: { unread_count: number } | undefined) => {
    if (!old) return old;
    return { ...old, unread_count: Math.max(0, (old.unread_count ?? 0) - 1) };
  });
}
