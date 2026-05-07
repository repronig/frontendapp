import { Navigate, Outlet } from 'react-router-dom';
import { getPortalHomePath } from '@/features/me/portal';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuthStore } from '@/store/auth.store';
import { LoadingState } from '@/components/shared/LoadingState';

export function GuestGuard() {
  const token = useAuthStore((state) => state.token);
  const currentUser = useAuthStore((state) => state.currentUser);
  const { isLoading } = useCurrentUser(Boolean(token));
  const resolvedCurrentUser = useAuthStore((state) => state.currentUser);

  if (token && isLoading && !resolvedCurrentUser) {
    return <LoadingState label="Restoring your session..." />;
  }

  if (token && resolvedCurrentUser) {
    return <Navigate to={getPortalHomePath(resolvedCurrentUser)} replace />;
  }

  return <Outlet />;
}
