import { z } from 'zod';
import {
  ARTIST_CATEGORY_OPTIONS,
  AUTHOR_CATEGORY_OPTIONS,
  MEMBER_APPLICANT_TYPES,
} from '@/features/membership/applicantAssociations';

const applicantTypes = MEMBER_APPLICANT_TYPES;

const authorCategoryValues = AUTHOR_CATEGORY_OPTIONS.map((o) => o.value);
const artistCategoryValues = ARTIST_CATEGORY_OPTIONS.map((o) => o.value);

export const memberApplicationSchema = z.object({
  first_name: z.string().min(1, 'First name is required.').max(100),
  last_name: z.string().min(1, 'Last name is required.').max(100),
  association_id: z.number().min(1, 'Association is required.'),
  applicant_type: z.enum(applicantTypes),
  member_author_type: z.enum(['individual', 'corporate', 'agent']).optional().or(z.literal('')),
  member_author_category: z.string().optional().or(z.literal('')),
  nationality: z.string().min(2, 'Nationality is required.').max(100),
  country_of_residence: z.string().min(2, 'Country of residence is required.'),
  is_diaspora: z.boolean(),
  bank_name: z.string().min(2, 'Bank name is required.'),
  bank_account_number: z.string().min(4, 'Bank account number is required.'),
  bank_account_owner_name: z.string().min(2, 'Account owner name is required.'),
  next_of_kin_name: z.string().optional().or(z.literal('')),
  next_of_kin_phone: z.string().optional().or(z.literal('')),
  publisher_organisation_name: z.string().optional().or(z.literal('')),
  publisher_tin: z.string().optional().or(z.literal('')),
  publisher_location_address: z.string().optional().or(z.literal('')),
  publisher_postal_address: z.string().optional().or(z.literal('')),
  publisher_email: z.string().email('Enter a valid organization email.').optional().or(z.literal('')),
  publisher_phone: z.string().optional().or(z.literal('')),
  consent_accepted: z.boolean().refine((value) => value === true, 'Consent is required.'),
  consent_date: z.string().min(1, 'Consent date is required.'),
  notes: z.string().max(1000).optional().or(z.literal('')),
  member_provided_id: z.string().max(100).optional().or(z.literal('')),
}).superRefine((values, ctx) => {
  if (values.applicant_type === 'author' || values.applicant_type === 'artist') {
    const typeLabel = values.applicant_type === 'artist' ? 'Artist' : 'Author';
    if (!values.member_author_type) {
      ctx.addIssue({ code: 'custom', path: ['member_author_type'], message: `${typeLabel} type is required.` });
    }
    if (!values.member_author_category) {
      ctx.addIssue({ code: 'custom', path: ['member_author_category'], message: 'Category is required.' });
    }
    if (values.member_author_category) {
      const allowed = values.applicant_type === 'artist' ? artistCategoryValues : authorCategoryValues;
      if (!(allowed as readonly string[]).includes(values.member_author_category)) {
        ctx.addIssue({
          code: 'custom',
          path: ['member_author_category'],
          message: values.applicant_type === 'artist' ? 'Select a valid artist category.' : 'Select a valid author category.',
        });
      }
    }
    if (!values.next_of_kin_name) {
      ctx.addIssue({ code: 'custom', path: ['next_of_kin_name'], message: 'Next of kin name is required.' });
    }
    if (!values.next_of_kin_phone) {
      ctx.addIssue({ code: 'custom', path: ['next_of_kin_phone'], message: 'Next of kin contact number is required.' });
    }
  }

  if (values.applicant_type === 'publisher') {
    if (!values.publisher_organisation_name) {
      ctx.addIssue({ code: 'custom', path: ['publisher_organisation_name'], message: 'Organization name is required.' });
    }
    if (!values.publisher_tin) {
      ctx.addIssue({ code: 'custom', path: ['publisher_tin'], message: 'Tax Identification Number is required.' });
    }
    if (!values.publisher_location_address) {
      ctx.addIssue({ code: 'custom', path: ['publisher_location_address'], message: 'Location address is required.' });
    }
    if (!values.publisher_postal_address) {
      ctx.addIssue({ code: 'custom', path: ['publisher_postal_address'], message: 'Postal address is required.' });
    }
    if (!values.publisher_email) {
      ctx.addIssue({ code: 'custom', path: ['publisher_email'], message: 'Organization email is required.' });
    }
    if (!values.publisher_phone) {
      ctx.addIssue({ code: 'custom', path: ['publisher_phone'], message: 'Organization phone number is required.' });
    }
  }
});

export type MemberApplicationFormValues = z.infer<typeof memberApplicationSchema>;

export const memberApplicationDocumentSchema = z.object({
  document_type: z.enum(['proof_of_id', 'proof_of_address']),
  file: z.instanceof(File, { message: 'A file is required.' }),
});

export type MemberApplicationDocumentFormValues = z.infer<typeof memberApplicationDocumentSchema>;
