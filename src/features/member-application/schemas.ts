import { z } from 'zod';
import {
  categoryOptionsFor,
  isIndividualMemberType,
  isOrgMemberType,
  memberTypeLabel,
  MEMBER_APPLICANT_TYPES,
  normalizeApplicantTypeForForm,
} from '@/features/membership/applicantAssociations';

const applicantTypes = MEMBER_APPLICANT_TYPES;

export const memberApplicationSchema = z.object({
  first_name: z.string().min(1, 'First name is required.').max(100),
  last_name: z.string().min(1, 'Last name is required.').max(100),
  association_id: z.number().min(1, 'Association is required.'),
  applicant_type: z.enum(applicantTypes),
  member_author_type: z.enum(['individual', 'corporate', 'agent']).optional().or(z.literal('')),
  member_author_category: z.string().optional().or(z.literal('')),
  nationality: z.string().max(100).optional().or(z.literal('')),
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
  publisher_email: z.string().optional().or(z.literal('')),
  publisher_phone: z.string().optional().or(z.literal('')),
  consent_accepted: z.boolean().refine((value) => value === true, 'Consent is required.'),
  consent_date: z.string().min(1, 'Consent date is required.'),
  notes: z.string().max(1000).optional().or(z.literal('')),
  member_provided_id: z.string().max(100).optional().or(z.literal('')),
}).superRefine((values, ctx) => {
  const applicantType = normalizeApplicantTypeForForm(values.applicant_type);
  const memberAuthorType = values.member_author_type || undefined;

  if (!memberAuthorType) {
    ctx.addIssue({
      code: 'custom',
      path: ['member_author_type'],
      message: `${memberTypeLabel(applicantType)} is required.`,
    });
  }

  if (!values.member_author_category) {
    ctx.addIssue({ code: 'custom', path: ['member_author_category'], message: 'Category is required.' });
  } else {
    const allowed: string[] = categoryOptionsFor(applicantType).map((o) => o.value);
    if (!allowed.includes(values.member_author_category)) {
      ctx.addIssue({
        code: 'custom',
        path: ['member_author_category'],
        message: 'Select a valid category for your applicant type.',
      });
    }
  }

  if (isIndividualMemberType(memberAuthorType)) {
    if (!values.nationality || values.nationality.trim().length < 2) {
      ctx.addIssue({ code: 'custom', path: ['nationality'], message: 'Nationality is required.' });
    }
    if (!values.next_of_kin_name?.trim()) {
      ctx.addIssue({ code: 'custom', path: ['next_of_kin_name'], message: 'Next of kin name is required.' });
    }
    if (!values.next_of_kin_phone?.trim()) {
      ctx.addIssue({ code: 'custom', path: ['next_of_kin_phone'], message: 'Next of kin contact number is required.' });
    }
  }

  if (isOrgMemberType(memberAuthorType)) {
    if (!values.publisher_organisation_name?.trim()) {
      ctx.addIssue({ code: 'custom', path: ['publisher_organisation_name'], message: 'Organization name is required.' });
    }
    if (!values.publisher_location_address?.trim()) {
      ctx.addIssue({ code: 'custom', path: ['publisher_location_address'], message: 'Location address is required.' });
    }
    if (!values.publisher_postal_address?.trim()) {
      ctx.addIssue({ code: 'custom', path: ['publisher_postal_address'], message: 'Postal address is required.' });
    }
    const email = values.publisher_email?.trim() ?? '';
    if (!email) {
      ctx.addIssue({ code: 'custom', path: ['publisher_email'], message: 'Organization email is required.' });
    } else if (!z.string().email().safeParse(email).success) {
      ctx.addIssue({ code: 'custom', path: ['publisher_email'], message: 'Enter a valid organization email.' });
    }
    if (!values.publisher_phone?.trim()) {
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
