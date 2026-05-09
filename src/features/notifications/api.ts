import { apiClient } from '@/api/client';
import type { ApiSuccess, PaginatedResponse } from '@/types/api';
import type { UserNotificationResource } from '@/types/domain';

export async function listNotifications(params?: {
  page?: number;
  per_page?: number;
  category?: string;
  unread?: boolean;
}) {
  const { data } = await apiClient.get<PaginatedResponse<UserNotificationResource>>('/me/notifications', {
    params,
  });

  return data;
}

/** Returns the payload stored under `notificationsUnreadCount` (same shape as layout dropdown cache). */
export async function getUnreadNotificationCount(): Promise<{ unread_count: number }> {
  const { data } = await apiClient.get<ApiSuccess<{ unread_count: number }>>('/me/notifications/unread-count');
  return data.data;
}

export async function markNotificationAsRead(notificationId: string) {
  const { data } = await apiClient.post<ApiSuccess<UserNotificationResource>>(`/me/notifications/${notificationId}/read`);
  return data;
}

export async function markAllNotificationsAsRead() {
  const { data } = await apiClient.post<ApiSuccess<{ marked_count: number }>>('/me/notifications/read-all');
  return data;
}
