import { z } from 'zod';

export const workTypeValues = [
  'educational_non_fiction_scientific_text',
  'fiction_text',
  'news_articles_journalistic_text',
  'book_content_visual_arts',
  'standalone_visual_works',
  'newspaper_magazines_inserts',
  'song_text',
  'musical_score',
  'other_work_type',
] as const;

export const workSchema = z.object({
  type_of_work: z.enum(workTypeValues),
  title: z.string().min(1, 'Title is required.').max(255),
  subtitle: z.string().max(255).optional().or(z.literal('')),
  publication_year: z.number().int().min(1000).max(9999).optional(),
  synopsis: z.string().trim().min(1, 'Synopsis/Description of work is required.').max(3000),
  primary_language: z.string().min(1, 'Primary language is required.').max(80),
  work_format: z.enum(['digital_copy', 'hard_copy', 'hard_digital_copy', 'audio', 'video', 'other']),
  identifier_type: z.enum(['isbn', 'issn', 'isni', 'iswc', 'url', 'other']),
  identifier_value: z.string().min(1, 'Identifier value/number is required.').max(120),
  doi: z.string().max(255).optional().or(z.literal('')),
  publisher_name: z.string().max(255).optional().or(z.literal('')),
  target_market: z.enum(['school_market', 'tertiary_education_market', 'general_trade_book_market', 'general_public', 'other']),
  target_market_other: z.string().max(180).optional().or(z.literal('')),
  production_status: z.enum(['yes', 'no']),
  agreement_accepted: z.boolean().refine((value) => value === true, 'You must accept the rightsholder affiliation agreement.'),
  date_of_consent: z.string().min(1, 'Agreement date is required.'),
  other_work_type: z.string().max(180).optional().or(z.literal('')),
  notes: z.string().max(3000).optional().or(z.literal('')),
}).superRefine((values, ctx) => {
  if (values.type_of_work === 'other_work_type' && !values.other_work_type?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['other_work_type'], message: 'Please specify the other work type.' });
  }

  if (values.target_market === 'other' && !values.target_market_other?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['target_market_other'], message: 'Please specify the other target market.' });
  }
});

export type WorkFormValues = z.infer<typeof workSchema>;

export const workContributorSchema = z.object({
  member_id: z.number().optional(),
  contributor_name: z.string().min(1, 'Contributor name is required.').max(255),
  contributor_role: z.string().min(1, 'Contributor role is required.').max(100),
  right_type: z.enum(['exclusive', 'non_exclusive']),
  ownership_percentage: z.number().min(0.01).max(100),
  territory_scope: z.string().max(255).optional().or(z.literal('')),
});

export type WorkContributorFormValues = z.infer<typeof workContributorSchema>;

export const workFileSchema = z.object({
  file_type: z.enum(['cover_image', 'copyright_page', 'proof_of_ownership']),
  file: z.instanceof(File, { message: 'A file is required.' }),
});

export type WorkFileFormValues = z.infer<typeof workFileSchema>;
