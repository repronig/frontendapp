import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { markAllNotificationsAsRead, markNotificationAsRead } from '@/features/notifications/api';
import {
  decrementUnreadCountCache,
  markAllNotificationsReadInEntry,
  notificationWasUnread,
  type NotificationCacheValue,
  patchAllNotificationCaches,
  patchNotificationReadAt,
  restoreNotificationQueryEntries,
  snapshotNotificationQueryEntries,
} from '@/features/notifications/notificationCache';
import { toastApiError } from '@/lib/mutationFeedback';
import { queryKeys } from '@/lib/queryKeys';

type SnapshotCtx = {
  previousQueries: [QueryKey, unknown][];
  previousUnread: unknown;
};

function invalidateNotificationsOnError(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
  queryClient.invalidateQueries({ queryKey: queryKeys.notificationsUnreadCount });
}

export function notificationMarkReadMutationOptions(queryClient: QueryClient) {
  return {
    mutationFn: markNotificationAsRead,
    onMutate: async (notificationId: string | number): Promise<SnapshotCtx> => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications });
      await queryClient.cancelQueries({ queryKey: queryKeys.notificationsUnreadCount });

      const previousQueries = snapshotNotificationQueryEntries(queryClient);
      const previousUnread = queryClient.getQueryData(queryKeys.notificationsUnreadCount);

      const readAt = new Date().toISOString();
      patchAllNotificationCaches(queryClient, (prev) => patchNotificationReadAt(prev, notificationId, readAt));

      let decrement = false;
      for (const [, data] of previousQueries) {
        if (notificationWasUnread(data as NotificationCacheValue, notificationId)) {
          decrement = true;
          break;
        }
      }
      if (decrement) decrementUnreadCountCache(queryClient);

      return { previousQueries, previousUnread };
    },
    onError: (error: unknown, _notificationId: unknown, context: SnapshotCtx | undefined) => {
      if (context?.previousQueries) restoreNotificationQueryEntries(queryClient, context.previousQueries);
      if (context && 'previousUnread' in context) {
        queryClient.setQueryData(queryKeys.notificationsUnreadCount, context.previousUnread);
      }
      toastApiError(error);
    },
    onSettled: (_data: unknown, error: unknown) => {
      if (error) invalidateNotificationsOnError(queryClient);
    },
  };
}

export function notificationMarkAllReadMutationOptions(queryClient: QueryClient) {
  return {
    mutationFn: markAllNotificationsAsRead,
    onMutate: async (): Promise<SnapshotCtx> => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications });
      await queryClient.cancelQueries({ queryKey: queryKeys.notificationsUnreadCount });

      const previousQueries = snapshotNotificationQueryEntries(queryClient);
      const previousUnread = queryClient.getQueryData(queryKeys.notificationsUnreadCount);

      const readAt = new Date().toISOString();
      patchAllNotificationCaches(queryClient, (prev) => markAllNotificationsReadInEntry(prev, readAt));

      queryClient.setQueryData(queryKeys.notificationsUnreadCount, (old: { unread_count: number } | undefined) => {
        const next = old ? { ...old, unread_count: 0 } : { unread_count: 0 };
        return next;
      });

      return { previousQueries, previousUnread };
    },
    onError: (error: unknown, _v: unknown, context: SnapshotCtx | undefined) => {
      if (context?.previousQueries) restoreNotificationQueryEntries(queryClient, context.previousQueries);
      if (context && 'previousUnread' in context) {
        queryClient.setQueryData(queryKeys.notificationsUnreadCount, context.previousUnread);
      }
      toastApiError(error);
    },
    onSettled: (_data: unknown, error: unknown) => {
      if (error) invalidateNotificationsOnError(queryClient);
    },
  };
}
