import { useState } from 'react';
import { useTablePagination } from '@/hooks/useTablePagination';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { normalizeApiError } from '@/api/error';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { PaginationBar } from '@/components/shared/PaginationBar';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { Button } from '@/components/ui/button';
import { getUnreadNotificationCount, listNotifications } from '@/features/notifications/api';
import { notificationMarkAllReadMutationOptions, notificationMarkReadMutationOptions } from '@/features/notifications/notificationMutationDefaults';
import { notificationsInboxQueryKey, queryKeys } from '@/lib/queryKeys';
import type { UserNotificationResource } from '@/types/domain';
import { cn } from '@/utils/cn';
import { formatDateTime } from '@/utils/format';
import { toast } from 'sonner';
import { DashboardError } from '@/features/dashboard/DashboardState';
import { QueryRefreshButton } from '@/components/shared/QueryRefreshButton';
import { useAuthStore } from '@/store/auth.store';

function getSeverityStyles(severity: string) {
  switch (severity) {
    case 'success':
      return 'border-[#D1FADF] bg-[#ECFDF3]';
    case 'warning':
      return 'border-[#FEDF89] bg-[#FFFAEB]';
    case 'error':
      return 'border-[#FECDCA] bg-[#FEF3F2]';
    default:
      return 'border-[#EAECF0] bg-[#F9FAFB]';
  }
}

function getCategoryBadgeStyles(category?: string) {
  switch ((category ?? '').toLowerCase()) {
    case 'security':
      return 'border-[#BFDBFE] dark:border-sky-900 bg-[#EFF6FF] text-[#1D4ED8]';
    case 'payment':
    case 'finance':
      return 'border-[#D1FAE5] bg-[#ECFDF5] text-[#047857]';
    case 'licence':
    case 'licensing':
      return 'border-[#E9D7FE] bg-[#F4EBFF] text-[#7C3AED]';
    case 'approval':
    case 'governance':
      return 'border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]';
    default:
      return 'border-[#D0D5DD] bg-white dark:bg-slate-950 text-[#475467] dark:text-slate-300';
  }
}

function normalizeNotificationActionUrl(actionUrl: string) {
  if (actionUrl === '/member/application') return '/member/onboarding';
  return actionUrl;
}

export function NotificationsPage() {
  const { page, setPage, perPage, setPerPage } = useTablePagination();
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'security' | 'payments' | 'approvals' | 'licensing' | 'governance'>('all');
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.currentUser);
  const canUseAdminCategoryFilters = Boolean(
    currentUser?.role_summary?.is_admin || currentUser?.role_summary?.is_super_admin,
  );

  const notificationsQuery = useQuery({
    queryKey: notificationsInboxQueryKey(page, perPage, activeFilter),
    queryFn: () => listNotifications({
      page,
      per_page: perPage,
      unread: activeFilter === 'unread' ? true : undefined,
      category: activeFilter === 'security'
        ? 'security'
        : activeFilter === 'payments'
          ? 'payment'
          : activeFilter === 'approvals'
            ? 'approval'
            : activeFilter === 'licensing'
              ? 'licensing'
              : activeFilter === 'governance'
                ? 'governance'
              : undefined,
    }),
  });

  const unreadCountQuery = useQuery({
    queryKey: queryKeys.notificationsUnreadCount,
    queryFn: getUnreadNotificationCount,
  });

  const refreshNotifications = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
    queryClient.invalidateQueries({ queryKey: queryKeys.notificationsUnreadCount });
  };

  const refetchNotifications = () => {
    void notificationsQuery.refetch();
    void unreadCountQuery.refetch();
  };

  const markReadMutation = useMutation(notificationMarkReadMutationOptions(queryClient));

  const markAllReadMutation = useMutation({
    ...notificationMarkAllReadMutationOptions(queryClient),
    onSuccess: () => {
      refreshNotifications();
      toast.success('All notifications marked as read.');
    },
  });

  const openNotificationTarget = (notification: UserNotificationResource) => {
    if (!notification.action_url) return;
    const actionUrl = normalizeNotificationActionUrl(notification.action_url);

    if (/^https?:\/\//.test(actionUrl)) {
      window.location.href = actionUrl;
      return;
    }

    navigate(actionUrl);
  };

  const handleNotificationClick = (notification: UserNotificationResource) => {
    if (!notification.read_at) markReadMutation.mutate(notification.id);
    openNotificationTarget(notification);
  };

  if (notificationsQuery.isLoading) return <LoadingState label="Loading notifications" />;
  if (notificationsQuery.isError) {
    return (
      <div className="space-y-4">
        <SectionHeader title="Notifications" description="Account and workflow alerts." />
        <DashboardError
          message={normalizeApiError(notificationsQuery.error).message}
          onRetry={refetchNotifications}
          isRetrying={notificationsQuery.isFetching && !notificationsQuery.isLoading}
        />
      </div>
    );
  }

  const notifications = notificationsQuery.data?.data ?? [];

  const filterOptions = [
    { label: 'All', value: 'all' as const },
    { label: 'Unread', value: 'unread' as const },
    ...(canUseAdminCategoryFilters
      ? [
        { label: 'Security', value: 'security' as const },
        { label: 'Payments', value: 'payments' as const },
        { label: 'Approvals', value: 'approvals' as const },
        { label: 'Licensing', value: 'licensing' as const },
        { label: 'Governance', value: 'governance' as const },
      ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <SectionHeader title="Notifications" description="Account and workflow alerts." />
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#EAECF0] dark:border-slate-800 bg-white dark:bg-slate-950 p-4 panel-shadow">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FFF4F4] text-[#AF1512]"><Bell className="h-5 w-5" /></div>
          <div>
            <p className="text-sm font-semibold text-[#2B2B2D] dark:text-slate-100">Unread notifications</p>
            <p className="text-sm text-[#6B788E] dark:text-slate-300">{unreadCountQuery.data?.unread_count ?? 0} unread</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setActiveFilter(option.value);
                setPage(1);
              }}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.06em] transition',
                activeFilter === option.value ? 'border-[#AF1512] bg-[#FFF1F1] text-[#AF1512]' : 'border-[#D0D5DD] bg-white dark:bg-slate-950 text-[#475467] dark:text-slate-300 hover:border-[#98A2B3]',
              )}
            >
              {option.label}
            </button>
          ))}
          <QueryRefreshButton
            onRefresh={refetchNotifications}
            isRefreshing={
              (notificationsQuery.isFetching && !notificationsQuery.isLoading) ||
              (unreadCountQuery.isFetching && !unreadCountQuery.isLoading)
            }
          />
          <Button variant="outline" onClick={() => markAllReadMutation.mutate(undefined)} disabled={markAllReadMutation.isPending || (unreadCountQuery.data?.unread_count ?? 0) === 0}>
            {markAllReadMutation.isPending ? 'Marking...' : 'Mark all as read'}
          </Button>
        </div>
      </div>

      {notifications.length === 0 ? (
        <EmptyState title="No notifications yet" description="As workflow events happen, your updates will appear here." />
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={cn(
                'rounded-md border px-5 py-4 transition hover:border-[#D0D5DD]',
                getSeverityStyles(notification.severity),
                !notification.read_at && 'ring-1 ring-inset ring-[#AF1512]/10',
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <button type="button" onClick={() => handleNotificationClick(notification)} className="min-w-0 flex-1 text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-[#2B2B2D] dark:text-slate-100">{notification.title}</p>
                    {notification.category ? <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em]', getCategoryBadgeStyles(notification.category))}>{notification.category}</span> : null}
                    {!notification.read_at ? <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#AF1512]" /> : null}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#475467] dark:text-slate-300">{notification.message ?? 'You have a new notification.'}</p>
                </button>
                <div className="flex shrink-0 flex-col items-end gap-2 text-right text-xs text-[#6B788E] dark:text-slate-300">
                  <p className="capitalize">{notification.severity}</p>
                  <p>{formatDateTime(notification.created_at)}</p>
                  {!notification.read_at ? (
                    <button
                      type="button"
                      className="text-xs font-semibold text-[#AF1512] hover:text-[#8E100D]"
                      onClick={() => markReadMutation.mutate(notification.id)}
                    >
                      Mark read
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <PaginationBar meta={notificationsQuery.data?.meta} onPageChange={setPage} perPage={perPage} onPerPageChange={setPerPage} />
    </div>
  );
}
