import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { getPortalLoginPath, inferPortalFromPath } from '@/features/me/route';
import { useAuthStore } from '@/store/auth.store';

export function AuthGuard() {
  const token = useAuthStore((state) => state.token);
  const location = useLocation();

  if (!token) {
    return <Navigate to={getPortalLoginPath(inferPortalFromPath(location.pathname))} replace state={{ from: location }} />;
  }

  return <Outlet />;
}
