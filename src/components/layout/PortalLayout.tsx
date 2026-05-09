import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, ChevronDown, LogOut, Menu, Moon, Search, Settings, Sun, X } from 'lucide-react';
import { logout, updateMe, type UpdateMePayload } from '@/features/auth/api';
import type { UserResource } from '@/types/domain';
import { firstLastFromUser } from '@/utils/userNamesFromUser';
import { normalizeApiError } from '@/api/error';
import { portalNav } from '@/components/layout/portal-nav';
import { AppLogo } from '@/components/shared/AppLogo';
import { Button } from '@/components/ui/button';
import { getUnreadNotificationCount, listNotifications } from '@/features/notifications/api';
import { notificationMarkAllReadMutationOptions, notificationMarkReadMutationOptions } from '@/features/notifications/notificationMutationDefaults';
import { useThemeMode } from '@/hooks/useThemeMode';
import { queryKeys } from '@/lib/queryKeys';
import { toastApiError } from '@/lib/mutationFeedback';
import { useAuthStore } from '@/store/auth.store';
import type { PortalKey, UserNotificationResource } from '@/types/domain';
import { cn } from '@/utils/cn';
import { formatDateTime } from '@/utils/format';
import { toast } from 'sonner';
import { resolveFileUrl } from '@/utils/fileUrl';
import { InstitutionLicensingTermsGate } from '@/features/institution/InstitutionLicensingTermsGate';
import { QueryRetryBanner } from '@/components/shared/QueryRetryBanner';

function getPortalSubtitle(portal: PortalKey) {
  switch (portal) {
    case 'member':
      return 'Member Portal';
    case 'association':
      return 'Association Portal';
    case 'institution':
      return 'Institution Portal';
    case 'admin':
      return 'Admin Portal';
    case 'super_admin':
      return 'Super Admin Portal';
    default:
      return 'Portal';
  }
}

function getPortalBasePath(portal: PortalKey) {
  return portal === 'super_admin' ? '/super-admin' : `/${portal}`;
}

function getLoginRouteForPortal(portal: PortalKey) {
  return `${getPortalBasePath(portal)}/login`;
}

function getNotificationsRouteForPortal(portal: PortalKey) {
  return `${getPortalBasePath(portal)}/notifications`;
}

function getSettingsRouteForPortal(portal: PortalKey) {
  if (portal === 'super_admin') return '/super-admin/account-settings';
  return `${getPortalBasePath(portal)}/settings`;
}

function normalizeNotificationActionUrl(actionUrl: string) {
  if (actionUrl === '/member/application') return '/member/onboarding';
  return actionUrl;
}

function getSeverityStyles(severity: string) {
  switch (severity) {
    case 'success':
      return 'border-[#D1FADF] bg-[#ECFDF3]';
    case 'warning':
      return 'border-[#FEDF89] bg-[#FFFAEB]';
    case 'error':
      return 'border-[#FECDCA] bg-[#FEF3F2]';
    default:
      return 'border-[#EAECF0] bg-[#F9FAFB] dark:border-slate-700 dark:bg-slate-900';
  }
}

function getCategoryBadgeStyles(category?: string) {
  switch ((category ?? '').toLowerCase()) {
    case 'security':
      return 'border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8] dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300';
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
      return 'border-[#D0D5DD] bg-white dark:bg-slate-950 text-[#475467] dark:text-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300';
  }
}

export function PortalLayout({ portal, title }: { portal: PortalKey; title: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.currentUser);
  const clearSession = useAuthStore((state) => state.clearSession);
  const setCurrentUser = useAuthStore((state) => state.setCurrentUser);
  const { theme, toggleTheme } = useThemeMode();
  const [openMenu, setOpenMenu] = useState(false);
  const [openNotifications, setOpenNotifications] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [profileForm, setProfileForm] = useState<UpdateMePayload>({ first_name: '', last_name: '', phone: '' });
  const notificationsDropdownRef = useRef<HTMLDivElement | null>(null);
  const profileMenuDropdownRef = useRef<HTMLDivElement | null>(null);

  function profileFormFromUser(user: UserResource): UpdateMePayload {
    const { first_name, last_name } = firstLastFromUser(user);
    return { first_name, last_name, phone: user.phone ?? '' };
  }

  useEffect(() => {
    if (!currentUser?.user) return;
    setProfileForm(profileFormFromUser(currentUser.user));
  }, [
    currentUser?.user?.id,
    currentUser?.user?.first_name,
    currentUser?.user?.last_name,
    currentUser?.user?.name,
    currentUser?.user?.phone,
  ]);

  useEffect(() => {
    if (!openNotifications) return;

    function handleDocumentPointerDown(event: MouseEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (notificationsDropdownRef.current?.contains(target)) return;
      setOpenNotifications(false);
    }

    document.addEventListener('mousedown', handleDocumentPointerDown);

    return () => {
      document.removeEventListener('mousedown', handleDocumentPointerDown);
    };
  }, [openNotifications]);

  useEffect(() => {
    if (!openMenu) return;

    function handleDocumentPointerDown(event: MouseEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (profileMenuDropdownRef.current?.contains(target)) return;
      setOpenMenu(false);
    }

    document.addEventListener('mousedown', handleDocumentPointerDown);

    return () => {
      document.removeEventListener('mousedown', handleDocumentPointerDown);
    };
  }, [openMenu]);

  const navItems = portalNav[portal];
  const displayName = currentUser?.user.name ?? 'Portal User';
  const avatarImageUrl = resolveFileUrl(currentUser?.user.avatar_thumb_url ?? currentUser?.user.avatar_url ?? null);
  const initials = useMemo(() => displayName.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase(), [displayName]);
  const portalSubtitle = getPortalSubtitle(portal);

  const notificationsQuery = useQuery({
    queryKey: queryKeys.notificationsDropdown,
    queryFn: async () => (await listNotifications({ page: 1, per_page: 8 })).data,
  });

  const unreadCountQuery = useQuery({
    queryKey: queryKeys.notificationsUnreadCount,
    queryFn: getUnreadNotificationCount,
  });

  const markReadMutation = useMutation(notificationMarkReadMutationOptions(queryClient));

  const markAllReadMutation = useMutation({
    ...notificationMarkAllReadMutationOptions(queryClient),
    onSuccess: () => {
      toast.success('All notifications marked as read.');
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: updateMe,
    onSuccess: (response) => {
      if (currentUser?.user) {
        setCurrentUser({ ...currentUser, user: { ...currentUser.user, ...response.data } });
      }
      setProfileModalOpen(false);
      toast.success('Profile updated successfully.');
    },
    onError: (error) => {
      toastApiError(error);
    },
  });

  async function handleLogout() {
    try {
      await logout();
      toast.success('Logout successful.');
    } catch (error) {
      toastApiError(error);
    } finally {
      clearSession();
      navigate(getLoginRouteForPortal(portal));
    }
  }

  function openNotificationTarget(notification: UserNotificationResource) {
    if (!notification.action_url) return;
    const actionUrl = normalizeNotificationActionUrl(notification.action_url);

    if (/^https?:\/\//.test(actionUrl)) {
      window.location.href = actionUrl;
      return;
    }

    navigate(actionUrl);
  }

  function handleNotificationClick(notification: UserNotificationResource) {
    if (!notification.read_at) {
      markReadMutation.mutate(notification.id);
    }

    setOpenNotifications(false);
    openNotificationTarget(notification);
  }

  const currentPageTitle = navItems.find((item) =>
    item.to === getPortalBasePath(portal) ? location.pathname === item.to : location.pathname.startsWith(item.to),
  )?.label;

  return (
    <div className={cn('min-h-screen bg-[#FDFDFD]', theme === 'dark' && 'dark-theme-shell')}>
      <div className="grid min-h-screen lg:grid-cols-[260px_minmax(0,1fr)]">
        {mobileSidebarOpen ? <button type="button" className="glass-overlay fixed inset-0 z-40 lg:hidden" onClick={() => setMobileSidebarOpen(false)} aria-label="Close navigation" /> : null}

        <aside className={cn('fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-[#EAECF0] bg-[#FCFCF7] px-5 py-6 dark:border-slate-800 dark:bg-slate-950 transition-transform duration-300 lg:static lg:w-auto lg:translate-x-0 lg:px-6 lg:py-8', mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full')}>
          <div className="shrink-0 border-b border-[#E8DDD4]/80 pb-6 dark:border-slate-800/80">
            <div className="mb-3 flex justify-end lg:hidden">
              <button type="button" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[#EAECF0] dark:border-slate-800 bg-white dark:bg-slate-950 text-[#667085] dark:text-slate-300" onClick={() => setMobileSidebarOpen(false)} aria-label="Close navigation">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-col items-center px-1">
              <AppLogo size="lg" className="mx-auto" />
              <div className="mt-1 w-full max-w-[240px] px-2">
                <div className="mx-auto h-0.5 w-12 rounded-full bg-[#AF1512]/45 dark:bg-amber-400/35" aria-hidden />
                <p className="mt-3 text-center text-sm font-bold leading-snug tracking-wide text-[#5A0706] dark:text-amber-100/95">{portalSubtitle}</p>
              </div>
            </div>
          </div>

          <nav className="mt-6 space-y-2 overflow-y-auto pr-1 scrollbar-thin">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === getPortalBasePath(portal)}
                  onClick={() => setMobileSidebarOpen(false)}
                  className={({ isActive }) => cn('flex items-center gap-3 rounded-md px-4 py-3 text-[16px] font-medium transition-all', isActive ? 'bg-[#AF1512] text-white shadow-[0_12px_24px_rgba(175,21,18,0.16)]' : 'text-[#484848] hover:bg-white dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900')}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="mt-auto pt-6">
            <div className="rounded-md border border-[#EAECF0] bg-white dark:bg-slate-950 p-4 text-sm leading-6 text-[#6B788E] dark:text-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              REPRONIG Digital Rights System version 1.0
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="relative z-40 border-b border-[#EAECF0] bg-white/95 dark:bg-slate-950/95 px-4 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 sm:px-6 md:px-8">
            <div className="page-container flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-3 lg:gap-4">
                <button type="button" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-[#EAECF0] dark:border-slate-800 bg-white dark:bg-slate-950 text-[#667085] dark:text-slate-300 lg:hidden" onClick={() => setMobileSidebarOpen(true)} aria-label="Open navigation">
                  <Menu className="h-5 w-5" />
                </button>
                <div className="relative min-w-0 flex-1 lg:max-w-xl">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#98A2B3]" />
                  <input className="h-11 w-full rounded-md border border-[#EAECF0] bg-[#FCFCF7] pl-12 pr-4 text-sm text-[#1E2024] dark:text-slate-100 outline-none transition focus:border-[#AF1512] focus:bg-white dark:bg-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:bg-slate-900 sm:h-12 sm:text-base" placeholder={`Search ${currentPageTitle?.toLowerCase() ?? 'anything here'}`} />
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <button type="button" onClick={toggleTheme} className="flex h-11 w-11 items-center justify-center rounded-md border border-[#EAECF0] dark:border-slate-800 bg-white dark:bg-slate-950 text-[#667085] dark:text-slate-300 hover:text-[#2B2B2D] dark:text-slate-100" aria-label="Toggle dark mode">
                  {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </button>
                <button type="button" onClick={() => navigate(getSettingsRouteForPortal(portal))} className="flex h-11 w-11 items-center justify-center rounded-md border border-[#EAECF0] dark:border-slate-800 bg-white dark:bg-slate-950 text-[#667085] dark:text-slate-300 hover:text-[#2B2B2D] dark:text-slate-100" aria-label="Open settings">
                  <Settings className="h-5 w-5" />
                </button>
                <div className="relative" ref={notificationsDropdownRef}>
                  <button
                    onClick={() => {
                      setOpenNotifications((value) => !value);
                      setOpenMenu(false);
                    }}
                    className="relative flex h-11 w-11 items-center justify-center rounded-md border border-[#EAECF0] dark:border-slate-800 bg-white dark:bg-slate-950 text-[#667085] dark:text-slate-300 hover:text-[#2B2B2D] dark:text-slate-100"
                  >
                    <Bell className="h-5 w-5" />
                    {(unreadCountQuery.data?.unread_count ?? 0) > 0 ? (
                      <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#AF1512] px-1 text-[11px] font-semibold text-white">
                        {unreadCountQuery.data?.unread_count}
                      </span>
                    ) : null}
                  </button>
                  {openNotifications ? (
                    <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[min(92vw,380px)] rounded-md border border-[#EAECF0] bg-white dark:bg-slate-950 p-2 panel-shadow dark:border-slate-800 dark:bg-slate-950">
                      <div className="flex items-center justify-between px-3 py-2">
                        <div>
                          <p className="text-sm font-semibold text-[#2B2B2D] dark:text-slate-100 dark:text-slate-100">Notifications</p>
                           
                        </div>
                        <button
                          onClick={() => markAllReadMutation.mutate(undefined)}
                          disabled={markAllReadMutation.isPending || (unreadCountQuery.data?.unread_count ?? 0) === 0}
                          className="text-xs font-semibold text-[#AF1512] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Mark all as read
                        </button>
                      </div>
                      <div className="max-h-[420px] space-y-2 overflow-y-auto px-2 pb-2">
                        {notificationsQuery.isLoading ? (
                          <div className="rounded-md border border-[#D6E6FF] bg-[#F4F8FF] dark:bg-slate-900 px-4 py-5 text-sm text-[#2563EB] dark:text-sky-300">Loading notifications…</div>
                        ) : notificationsQuery.isError ? (
                          <QueryRetryBanner
                            message={normalizeApiError(notificationsQuery.error).message}
                            onRetry={() => {
                              void notificationsQuery.refetch();
                              void unreadCountQuery.refetch();
                            }}
                            isRetrying={notificationsQuery.isFetching && !notificationsQuery.isLoading}
                          />
                        ) : notificationsQuery.data?.length ? (
                          notificationsQuery.data.map((notification) => (
                            <div
                              key={notification.id}
                              className={cn(
                                'rounded-md border px-4 py-3 transition hover:border-[#D0D5DD]',
                                getSeverityStyles(notification.severity),
                                !notification.read_at && 'ring-1 ring-inset ring-[#AF1512]/10',
                              )}
                            >
                              <button
                                type="button"
                                onClick={() => handleNotificationClick(notification)}
                                className="block w-full text-left"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="text-sm font-semibold text-[#2B2B2D] dark:text-slate-100 dark:text-slate-100">{notification.title}</p>
                                      {notification.category ? <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em]', getCategoryBadgeStyles(notification.category))}>{notification.category}</span> : null}
                                    </div>
                                    <p className="mt-1 text-sm leading-6 text-[#475467] dark:text-slate-300 dark:text-slate-300">{notification.message ?? 'You have a new notification.'}</p>
                                  </div>
                                  {!notification.read_at ? <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[#AF1512]" /> : null}
                                </div>
                              </button>
                              <div className="mt-2 flex items-center justify-between gap-3 text-xs text-[#6B788E] dark:text-slate-300 dark:text-slate-400">
                                <span className="capitalize">{notification.severity}</span>
                                <div className="flex items-center gap-3">
                                  <span>{formatDateTime(notification.created_at)}</span>
                                  {!notification.read_at ? (
                                    <button
                                      type="button"
                                      onClick={() => markReadMutation.mutate(notification.id)}
                                      className="font-semibold text-[#AF1512] hover:text-[#8E100D]"
                                    >
                                      Mark read
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-md border border-dashed border-[#D0D5DD] bg-[#FCFCF7] dark:bg-slate-900 px-4 py-8 text-center text-sm text-[#6B788E] dark:text-slate-300">
                            No notifications yet.
                          </div>
                        )}
                      </div>
                      <div className="border-t border-[#EAECF0] dark:border-slate-800 px-3 pb-1 pt-3">
                        <button
                          type="button"
                          onClick={() => {
                            setOpenNotifications(false);
                            navigate(getNotificationsRouteForPortal(portal));
                          }}
                          className="text-xs font-semibold text-[#AF1512]"
                        >
                          View all notifications
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="relative" ref={profileMenuDropdownRef}>
                  <button
                    onClick={() => {
                      setOpenMenu((value) => !value);
                      setOpenNotifications(false);
                    }}
                    className="flex items-center gap-3 rounded-md border border-[#EAECF0] bg-white dark:bg-slate-950 px-2 py-2 hover:border-[#D0D5DD] dark:border-slate-700 dark:bg-slate-900 sm:px-3"
                  >
                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[#5A0706] text-sm font-bold text-white sm:h-11 sm:w-11">
                      {avatarImageUrl ? (
                        <img src={avatarImageUrl} alt={displayName} className="h-full w-full object-cover" />
                      ) : (
                        initials
                      )}
                    </div>
                    <div className="hidden text-left md:block">
                      <p className="text-sm font-semibold text-[#2B2B2D] dark:text-slate-100 dark:text-slate-100">{displayName}</p>
                      <p className="text-xs text-[#6B788E] dark:text-slate-300 dark:text-slate-400">{title}</p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-[#98A2B3]" />
                  </button>
                  {openMenu ? (
                    <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-56 rounded-md border border-[#EAECF0] bg-white dark:bg-slate-950 p-2 panel-shadow dark:border-slate-800 dark:bg-slate-950">
                      <button
                        type="button"
                        onClick={() => {
                          if (currentUser?.user) setProfileForm(profileFormFromUser(currentUser.user));
                          setProfileModalOpen(true);
                          setOpenMenu(false);
                        }}
                        className="block w-full rounded-md px-4 py-3 text-left text-sm font-medium text-[#344054] dark:text-slate-200 hover:bg-[#F9FAFB] dark:text-slate-200 dark:hover:bg-slate-900"
                      >
                        User Profile
                      </button>
                      <button onClick={() => { navigate(getSettingsRouteForPortal(portal)); setOpenMenu(false); }} className="block w-full rounded-md px-4 py-3 text-left text-sm font-medium text-[#344054] dark:text-slate-200 hover:bg-[#F9FAFB] dark:text-slate-200 dark:hover:bg-slate-900">Settings</button>
                      <button onClick={handleLogout} className="flex w-full items-center gap-2 rounded-md px-4 py-3 text-left text-sm font-medium text-[#AF1512] hover:bg-[#FFF4F4]">
                        <LogOut className="h-4 w-4" /> Logout
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </header>

          <main className="bg-[#FDFDFD] px-4 py-6 sm:px-6 md:px-8 md:py-8 dark:bg-transparent">
            <div className="page-container space-y-6">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      {portal === 'institution' ? <InstitutionLicensingTermsGate /> : null}

      {profileModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-950 p-6 shadow-2xl dark:border dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-[#2B2B2D] dark:text-slate-100 dark:text-slate-100">Edit profile</h2>
                <p className="mt-1 text-sm text-[#6B788E] dark:text-slate-300 dark:text-slate-400">Update your basic account details.</p>
              </div>
              <button onClick={() => setProfileModalOpen(false)} className="text-sm font-medium text-[#6B788E] dark:text-slate-300 hover:text-[#2B2B2D] dark:text-slate-100">Close</button>
            </div>
            <form
              className="mt-6 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                updateProfileMutation.mutate(profileForm);
              }}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#344054] dark:text-slate-200 dark:text-slate-200">First name<span className="ml-1 text-red-600 dark:text-red-400">*</span></label>
                  <input
                    value={profileForm.first_name ?? ''}
                    onChange={(event) => setProfileForm((current) => ({ ...current, first_name: event.target.value }))}
                    className="h-11 w-full rounded-md border border-[#D0D5DD] bg-white dark:bg-slate-950 px-3 text-sm text-[#1E2024] dark:text-slate-100 outline-none focus:border-[#AF1512] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#344054] dark:text-slate-200 dark:text-slate-200">Last name<span className="ml-1 text-red-600 dark:text-red-400">*</span></label>
                  <input
                    value={profileForm.last_name ?? ''}
                    onChange={(event) => setProfileForm((current) => ({ ...current, last_name: event.target.value }))}
                    className="h-11 w-full rounded-md border border-[#D0D5DD] bg-white dark:bg-slate-950 px-3 text-sm text-[#1E2024] dark:text-slate-100 outline-none focus:border-[#AF1512] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[#344054] dark:text-slate-200 dark:text-slate-200">Phone</label>
                <input
                  value={profileForm.phone ?? ''}
                  onChange={(event) => setProfileForm((current) => ({ ...current, phone: event.target.value }))}
                  className="h-11 w-full rounded-md border border-[#D0D5DD] bg-white dark:bg-slate-950 px-3 text-sm text-[#1E2024] dark:text-slate-100 outline-none focus:border-[#AF1512] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setProfileModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-[#AF1512] hover:bg-[#8E100D]" disabled={updateProfileMutation.isPending}>
                  {updateProfileMutation.isPending ? 'Saving...' : 'Save changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}