import { z } from 'zod';
import { INSTITUTION_REGISTER_TYPES, type InstitutionRegisterType } from '@/features/auth/institutionTypes';

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

export const twoFactorSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code.'),
});

export const memberOtpSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit OTP.'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
});

export const resetPasswordSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  token: z.string().min(1, 'Reset token is required.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  password_confirmation: z.string().min(8, 'Confirm your password.'),
}).refine((value) => value.password === value.password_confirmation, {
  message: 'Passwords do not match.',
  path: ['password_confirmation'],
});

export const memberRegisterSchema = z.object({
  first_name: z.string().min(1, 'First name is required.'),
  last_name: z.string().min(1, 'Last name is required.'),
  email: z.string().email('Enter a valid email address.'),
  phone: z.string().min(1, 'Phone is required.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  password_confirmation: z.string().min(8, 'Confirm your password.'),
  applicant_type: z.enum(['author', 'publisher']),
  association_id: z.coerce.number().int().positive('Select an association.'),
  accepted_terms: z.boolean().refine((value) => value === true, 'You must agree to the REPRONIG terms and conditions.'),
}).refine((value) => value.password === value.password_confirmation, {
  message: 'Passwords do not match.',
  path: ['password_confirmation'],
});

const institutionTypeField = z.preprocess(
  (v) => (v === undefined || v === null ? '' : v),
  z
    .string()
    .min(1, 'Select institution type')
    .refine((s): s is InstitutionRegisterType => (INSTITUTION_REGISTER_TYPES as readonly string[]).includes(s), {
      message: 'Select institution type',
    }),
);

export const institutionRegisterSchema = z.object({
  organisation_name: z.string().min(1, 'Organisation name is required.'),
  institution_type: institutionTypeField,
  registration_number: z.string().optional(),
  contact_person_name: z.string().min(1, 'Contact person name is required.'),
  contact_person_title: z.string().optional(),
  email: z.string().email('Enter a valid email address.'),
  phone: z.string().min(1, 'Phone is required.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  password_confirmation: z.string().min(8, 'Confirm your password.'),
  address_line_1: z.string().min(1, 'Address line 1 is required.'),
  address_line_2: z.string().optional(),
  city: z.string().min(1, 'City is required.'),
  state: z.string().min(1, 'State is required.'),
  country: z.string().min(1, 'Country is required.'),
  postal_code: z.string().optional(),
  year_established: z.coerce.number().int().min(1800).max(new Date().getFullYear()),
  academic_staff_count: z.coerce.number().int().min(0).optional(),
  administrative_staff_count: z.coerce.number().int().min(0).optional(),
  campuses_count: z.coerce.number().int().min(0).optional(),
  branches_count: z.coerce.number().int().min(0).optional(),
  member_count: z.coerce.number().int().min(0).optional(),
  licensing_year: z.coerce.number().int().optional(),
  declared_students_count: z.coerce.number().int().min(0).optional(),
  declared_members_count: z.coerce.number().int().min(0).optional(),
  declared_branches_count: z.coerce.number().int().min(0).optional(),
  accepted_terms: z.boolean().refine((value) => value === true, 'You must agree to the REPRONIG terms and conditions.'),
}).superRefine((value, ctx) => {
  if (value.password !== value.password_confirmation) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['password_confirmation'], message: 'Passwords do not match.' });
  }

  if (value.institution_type === 'professional_body' && value.declared_members_count === undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['declared_members_count'], message: 'Declared member count is required for professional bodies.' });
  }

  if (value.institution_type === 'religious_organization' && value.declared_branches_count === undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['declared_branches_count'], message: 'Declared branches count is required for religious organizations.' });
  }
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type TwoFactorFormValues = z.infer<typeof twoFactorSchema>;
export type MemberOtpFormValues = z.infer<typeof memberOtpSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
export type MemberRegisterFormValues = z.infer<typeof memberRegisterSchema>;
export type InstitutionRegisterFormValues = z.infer<typeof institutionRegisterSchema>;
