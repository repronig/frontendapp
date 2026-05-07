import { z } from 'zod';

function hasVisibleTextFromHtml(html: string) {
  const stripped = html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
  return stripped.length > 0;
}

/** Admin terms & conditions create/update (aligned with `TermsAndConditionPayload`). */
export const termsAndConditionUpsertSchema = z
  .object({
    title: z.string().min(1, 'Title is required.'),
    version: z.string().min(1, 'Version is required.'),
    audience: z.enum(['all', 'member', 'institution']),
    content: z.string(),
    is_active: z.boolean().optional(),
  })
  .refine((value) => hasVisibleTextFromHtml(value.content), {
    message: 'Content is required.',
    path: ['content'],
  });

export type TermsAndConditionUpsertFormValues = z.infer<typeof termsAndConditionUpsertSchema>;
