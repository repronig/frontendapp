import type { PortalKey } from '@/types/domain';

export function inferPortalFromPath(pathname: string): PortalKey | null {
  if (pathname.startsWith('/association')) return 'association';
  if (pathname.startsWith('/institution')) return 'institution';
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/super-admin')) return 'super_admin';
  if (pathname.startsWith('/member')) return 'member';
  return null;
}

export function getPortalLoginPath(portal: PortalKey | null) {
  switch (portal) {
    case 'association':
      return '/association/login';
    case 'institution':
      return '/institution/login';
    case 'admin':
      return '/admin/login';
    case 'super_admin':
      return '/super-admin/login';
    case 'member':
    default:
      return '/member/login';
  }
}
