import type { CurrentUserContext } from '@/types/domain';
import type { PortalKey } from '@/types/domain';

export function getPortalLabel(portal: PortalKey) {
  switch (portal) {
    case 'member':
      return 'Member';
    case 'association':
      return 'Association';
    case 'institution':
      return 'Institution';
    case 'admin':
      return 'Admin';
    case 'super_admin':
      return 'Super Admin';
  }
}

export function getOnboardingPath(context: CurrentUserContext, portal: PortalKey): string | null {
  if (portal === 'member' && context.portal_access.member) {
    if (
      context.onboarding_status.member_application_exists &&
      context.onboarding_status.member_can_edit_application
    ) {
      return '/member/onboarding';
    }
  }

  if (portal === 'institution' && context.portal_access.institution) {
    if (!context.onboarding_status.institution_is_fully_onboarded) {
      return '/institution/onboarding';
    }
  }

  return null;
}
