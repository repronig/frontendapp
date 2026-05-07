import { notificationsInboxQueryKey, queryKeys } from '@/lib/queryKeys';

export const notificationsQueryKeys = {
  notifications: queryKeys.notifications,
  dropdown: queryKeys.notificationsDropdown,
  unreadCount: queryKeys.notificationsUnreadCount,
  inboxPage: notificationsInboxQueryKey,
} as const;
