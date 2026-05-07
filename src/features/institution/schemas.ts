import { z } from 'zod';

const fileRequired = z.instanceof(File, { message: 'A file is required.' });
const academicInstitutionTypes = ['university', 'polytechnic', 'college_of_education', 'research_institute'] as const;

const optionalNumber = z.preprocess((value) => {
  if (value === '' || value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}, z.number().int().min(0).optional());

export const institutionProfileSchema = z.object({
  contact_person_name: z.string().min(1, 'Contact person name is required.'),
  contact_person_title: z.string().optional().or(z.literal('')),
  phone: z.string().min(1, 'Phone is required.'),
  address_line_1: z.string().min(1, 'Address line 1 is required.'),
  address_line_2: z.string().optional().or(z.literal('')),
  city: z.string().min(1, 'City is required.'),
  state: z.string().min(1, 'State is required.'),
  country: z.string().min(1, 'Country is required.'),
  postal_code: z.string().optional().or(z.literal('')),
  year_established: z.coerce.number().int().min(1800).max(new Date().getFullYear()),
  faculties_count: optionalNumber,
  member_count: optionalNumber,
  branches_count: optionalNumber,
  institution_type: z.enum([
    'university',
    'polytechnic',
    'college_of_education',
    'professional_body',
    'religious_organization',
    'corporate_organization',
    'government_agency',
    'ngo',
    'research_institute',
    'library',
    'other',
  ]),
  academic_staff_count: optionalNumber,
  administrative_staff_count: optionalNumber,
  campuses_count: optionalNumber,
}).superRefine((values, ctx) => {
  const usesAcademicMetrics = (academicInstitutionTypes as readonly string[]).includes(values.institution_type);
  const requiredFields = usesAcademicMetrics
    ? ['faculties_count', 'academic_staff_count', 'administrative_staff_count', 'campuses_count'] as const
    : ['member_count', 'branches_count'] as const;

  requiredFields.forEach((field) => {
    if (values[field] === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [field],
        message: usesAcademicMetrics
          ? 'This field is required for universities, polytechnics, colleges of education, and research institutes.'
          : 'This field is required for this institution type.',
      });
    }
  });
});

export type InstitutionProfileFormValues = z.infer<typeof institutionProfileSchema>;

export const institutionLogoSchema = z.object({
  file: fileRequired,
});
export type InstitutionLogoFormValues = z.infer<typeof institutionLogoSchema>;

export const institutionDocumentUploadSchema = z.object({
  document_type: z.string().min(1, 'Document type is required.'),
  file: fileRequired,
});
export type InstitutionDocumentUploadFormValues = z.infer<typeof institutionDocumentUploadSchema>;

export const documentRecordSchema = z.object({
  category: z.string().min(1, 'Category is required.'),
  title: z.string().min(1, 'Title is required.'),
  document_type: z.string().optional().or(z.literal('')),
  visibility: z.enum(['private', 'restricted', 'internal']).default('private'),
  description: z.string().optional().or(z.literal('')),
  file: fileRequired,
});
export type DocumentRecordFormValues = z.infer<typeof documentRecordSchema>;

export const declarationFacultySchema = z.object({
  faculty_name: z.string().min(1, 'Faculty name is required.'),
  student_count: z.coerce.number().int().min(0),
});

export const institutionDeclarationSchema = z.object({
  licensing_year: z.coerce.number().int().min(2000),
  declared_students_count: optionalNumber,
  declared_members_count: optionalNumber,
  declared_branches_count: optionalNumber,
  faculties: z.array(declarationFacultySchema).default([]),
  supporting_document: z.instanceof(File).optional(),
});
export type InstitutionDeclarationFormValues = z.infer<typeof institutionDeclarationSchema>;

export const licencePaymentSchema = z.object({
  gateway_name: z.enum(['paystack', 'flutterwave']),
  callback_url: z.string().url('Provide a valid callback URL.').optional().or(z.literal('')),
  amount: z.coerce.number().positive('Amount must be greater than zero.'),
});
export type LicencePaymentFormValues = z.infer<typeof licencePaymentSchema>;

export const invoicePaymentSchema = z.object({
  gateway_name: z.enum(['paystack', 'flutterwave']).default('paystack'),
  callback_url: z.string().url('Provide a valid callback URL.').optional().or(z.literal('')),
  amount: z.coerce.number().positive('Amount must be greater than zero.'),
});
export type InvoicePaymentFormValues = z.infer<typeof invoicePaymentSchema>;

export const offlineInvoicePaymentSchema = z.object({
  amount: z.coerce.number().positive('Amount must be greater than zero.'),
  paid_in_full: z.boolean().optional(),
  institution_note: z.string().max(2000).optional().or(z.literal('')),
  receipt: z.instanceof(File, { message: 'Upload a payment receipt or teller (PDF or image).' }),
});
export type OfflineInvoicePaymentFormValues = z.infer<typeof offlineInvoicePaymentSchema>;

export const usageDeclarationSchema = z.object({
  licence_id: z.coerce.number().int().positive('Select a licence.'),
  reporting_year: z.coerce.number().int().min(2000),
  declared_student_population: optionalNumber,
  declared_academic_staff_count: optionalNumber,
  declared_administrative_staff_count: optionalNumber,
  declared_campuses_count: optionalNumber,
  declared_library_capacity: optionalNumber,
  declaration_notes: z.string().max(2000).optional().or(z.literal('')),
});
export type UsageDeclarationFormValues = z.infer<typeof usageDeclarationSchema>;
