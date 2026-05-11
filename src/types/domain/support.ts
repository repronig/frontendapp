export type SupportTicketPortalContext = 'member' | 'association' | 'institution';

export type SupportTicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export type SupportTicketCategory =
  | 'technical_issue_or_error'
  | 'information_required'
  | 'licensing'
  | 'access_or_account'
  | 'other';

export interface SupportTicketUserSnippet {
  id: number;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
}

export interface SupportTicketReplyResource {
  id: number;
  body: string;
  is_staff: boolean;
  created_at: string;
  updated_at: string;
  user?: SupportTicketUserSnippet | null;
}

export interface SupportTicketInternalNoteResource {
  id: number;
  body: string;
  created_at: string;
  updated_at: string;
  user?: SupportTicketUserSnippet | null;
}

export interface SupportTicketResource {
  id: number;
  subject: string;
  body: string;
  category: SupportTicketCategory;
  status: SupportTicketStatus;
  portal_context: SupportTicketPortalContext;
  created_at: string;
  updated_at: string;
  user?: SupportTicketUserSnippet | null;
  replies?: SupportTicketReplyResource[];
  internal_notes?: SupportTicketInternalNoteResource[];
}
