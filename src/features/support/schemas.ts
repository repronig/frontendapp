import { z } from 'zod';

const categoryValues = [
  'technical_issue_or_error',
  'information_required',
  'licensing',
  'access_or_account',
  'other',
] as const;

export const createSupportTicketSchema = z.object({
  subject: z.string().trim().min(3, 'Subject must be at least 3 characters.').max(500),
  body: z.string().trim().min(10, 'Please add a bit more detail (at least 10 characters).').max(20_000),
  category: z.enum(categoryValues),
});

export type CreateSupportTicketFormValues = z.infer<typeof createSupportTicketSchema>;
