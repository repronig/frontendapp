import type { SupportTicketPortalContext } from '@/types/domain';

function portalBase(portal: SupportTicketPortalContext): string {
  switch (portal) {
    case 'member':
      return '/member';
    case 'association':
      return '/association';
    case 'institution':
      return '/institution';
    default:
      return '/member';
  }
}

export function supportListPath(portal: SupportTicketPortalContext): string {
  return `${portalBase(portal)}/support`;
}

export function supportNewPath(portal: SupportTicketPortalContext): string {
  return `${portalBase(portal)}/support/new`;
}

export function supportDetailPath(portal: SupportTicketPortalContext, ticketId: number): string {
  return `${portalBase(portal)}/support/${ticketId}`;
}
