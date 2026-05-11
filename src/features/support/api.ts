import { getPaginated, getSuccess, postSuccess } from '@/api/http';
import type { ListParams } from '@/types/api';
import type { SupportTicketReplyResource, SupportTicketResource } from '@/types/domain';

export interface CreateSupportTicketPayload {
  portal_context: string;
  subject: string;
  body: string;
  category: string;
}

export async function listPortalSupportTickets(params: ListParams = {}) {
  return getPaginated<SupportTicketResource>('/support-tickets', params);
}

export async function getPortalSupportTicket(id: number) {
  return getSuccess<SupportTicketResource>(`/support-tickets/${id}`);
}

export async function createPortalSupportTicket(payload: CreateSupportTicketPayload) {
  return postSuccess<SupportTicketResource>('/support-tickets', payload);
}

export async function postPortalSupportTicketReply(id: number, body: string) {
  return postSuccess<SupportTicketReplyResource>(`/support-tickets/${id}/replies`, { body });
}
