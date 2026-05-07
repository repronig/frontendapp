import type { CurrentUserContext, PortalKey } from '@/types/domain';

const portalPathMap: Record<PortalKey, string> = {
  member: '/member',
  association: '/association',
  institution: '/institution',
  admin: '/admin',
  super_admin: '/super-admin',
};

export function isPortalAllowed(context: CurrentUserContext, portal: PortalKey) {
  if (portal === 'admin') {
    return context.portal_access.admin || context.portal_access.super_admin;
  }

  const key = portal === 'super_admin' ? 'super_admin' : portal;
  return context.portal_access[key];
}

export function getPortalHomePath(context: CurrentUserContext): string {
  if (context.portal_access.member) {
    if (
      context.onboarding_status.member_application_exists &&
      context.onboarding_status.member_can_edit_application
    ) {
      return '/member/onboarding';
    }

    return portalPathMap.member;
  }

  if (context.portal_access.association) return portalPathMap.association;

  if (context.portal_access.institution) {
    if (!context.onboarding_status.institution_is_fully_onboarded) {
      return '/institution/onboarding';
    }

    return portalPathMap.institution;
  }

  if (context.portal_access.admin) return portalPathMap.admin;
  if (context.portal_access.super_admin) return portalPathMap.super_admin;

  return '/unauthorized';
}

export function getPortalPath(portal: PortalKey) {
  return portalPathMap[portal];
}
