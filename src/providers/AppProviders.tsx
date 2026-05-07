import { lazy, PropsWithChildren, Suspense, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CheckCircle2, CircleAlert, Info, XCircle } from 'lucide-react';
import { Toaster } from 'sonner';
import { useAuthStore } from '@/store/auth.store';

const AdminSensitiveActionDialogHost = lazy(() =>
  import('@/features/admin/SensitiveActionDialogHost').then((module) => ({ default: module.AdminSensitiveActionDialogHost })),
);

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  );

  const currentUser = useAuthStore((state) => state.currentUser);
  const shouldMountAdminSecurityHost = useMemo(
    () => Boolean(currentUser?.role_summary?.is_admin || currentUser?.role_summary?.is_super_admin),
    [currentUser?.role_summary?.is_admin, currentUser?.role_summary?.is_super_admin],
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {shouldMountAdminSecurityHost ? (
        <Suspense fallback={null}>
          <AdminSensitiveActionDialogHost />
        </Suspense>
      ) : null}
      <Toaster
        position="top-right"
        richColors
        closeButton
        expand
        duration={4000}
        visibleToasts={4}
        icons={{
          success: <CheckCircle2 className="h-5 w-5" />,
          error: <XCircle className="h-5 w-5" />,
          warning: <CircleAlert className="h-5 w-5" />,
          info: <Info className="h-5 w-5" />,
        }}
        toastOptions={{
          classNames: {
            toast:
              'group rounded-2xl border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-4 text-[#0F172A] dark:text-slate-50 shadow-[0_22px_60px_rgba(15,23,42,0.16)]',
            title: 'text-sm font-semibold text-[#0F172A] dark:text-slate-50',
            description: 'mt-1 text-sm leading-6 text-[#475569]',
            actionButton: 'rounded-xl bg-[#2563EB] px-3 py-2 text-sm font-semibold text-white',
            cancelButton: 'rounded-xl border border-[#CBD5E1] bg-white dark:bg-slate-950 px-3 py-2 text-sm font-semibold text-[#334155]',
            closeButton: 'border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-950 text-[#64748B] hover:text-[#0F172A] dark:text-slate-50',
            success: 'border-[#CDE7D8]',
            error: 'border-[#F7D4D2]',
            warning: 'border-[#F5E2B8]',
            info: 'border-[#D6E6FF]',
          },
        }}
      />
    </QueryClientProvider>
  );
}
