import { z } from 'zod';

export const approveAssociationApplicationSchema = z.object({
  comment: z.string().max(1000).optional().or(z.literal('')),
});

export const rejectAssociationApplicationSchema = z.object({
  reason: z.string().min(3, 'Reason is required.').max(1000),
});

export const requestChangesAssociationApplicationSchema = z.object({
  comment: z.string().min(3, 'Comment is required.').max(1000),
});

export type ApproveAssociationApplicationFormValues = z.infer<typeof approveAssociationApplicationSchema>;
export type RejectAssociationApplicationFormValues = z.infer<typeof rejectAssociationApplicationSchema>;
export type RequestChangesAssociationApplicationFormValues = z.infer<typeof requestChangesAssociationApplicationSchema>;
