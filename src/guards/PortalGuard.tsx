import { Navigate, Outlet } from 'react-router-dom';
import { isPortalAllowed } from '@/features/me/portal';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuthStore } from '@/store/auth.store';
import type { PortalKey } from '@/types/domain';
import { LoadingState } from '@/components/shared/LoadingState';

export function PortalGuard({ portal, requiresVerified = true }: { portal: PortalKey; requiresVerified?: boolean }) {
  const token = useAuthStore((state) => state.token);
  // Always refetch `/me` when a token exists so the store is not stuck on an old persisted
  // snapshot (e.g. missing `first_name` / `last_name`). Do not block the shell if we already
  // have persisted context—only gate on loading when there is nothing to render yet.
  const { isLoading } = useCurrentUser(Boolean(token));
  const resolvedContext = useAuthStore((state) => state.currentUser);

  if (!token) {
    return <Navigate to={`/${portal === 'super_admin' ? 'super-admin' : portal}/login`} replace />;
  }

  if (!resolvedContext && isLoading) {
    return <LoadingState label="Loading portal..." />;
  }

  if (!resolvedContext) {
    return <Navigate to={`/${portal === 'super_admin' ? 'super-admin' : portal}/login`} replace />;
  }

  if (!isPortalAllowed(resolvedContext, portal)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (requiresVerified && !resolvedContext.security.email_verified) {
    return <Navigate to="/verify-email" replace />;
  }

  return <Outlet />;
}
