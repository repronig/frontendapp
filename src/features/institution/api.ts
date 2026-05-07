import { apiClient } from '@/api/client';
import { postSuccess } from '@/api/http';
import type { ApiSuccess, ListParams, PaginatedResponse } from '@/types/api';
import type {
  InstitutionAnnualDeclarationResource,
  InstitutionDocumentResource,
  InstitutionProfileResource,
  InvoiceResource,
  LicencePaymentResource,
  LicenceResource,
  PaymentInitiationResult,
  UsageDeclarationResource,
} from '@/types/domain';

export interface UpdateInstitutionProfilePayload {
  contact_person_name?: string;
  contact_person_title?: string;
  phone?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  year_established?: number;
  faculties_count?: number;
  member_count?: number;
  branches_count?: number;
  institution_type?:
    | 'university'
    | 'polytechnic'
    | 'college_of_education'
    | 'professional_body'
    | 'religious_organization'
    | 'corporate_organization'
    | 'government_agency'
    | 'ngo'
    | 'research_institute'
    | 'library'
    | 'other';
  academic_staff_count?: number;
  administrative_staff_count?: number;
  campuses_count?: number;
}

export interface InstitutionDocumentUploadPayload {
  document_type: string;
  file: File;
}

export interface DeclarationFacultyPayload {
  faculty_name: string;
  student_count: number;
}

export interface InstitutionDeclarationPayload {
  licensing_year: number;
  declared_students_count?: number;
  declared_members_count?: number;
  declared_branches_count?: number;
  faculties?: DeclarationFacultyPayload[];
  metadata_json?: Record<string, unknown>;
  supporting_document?: File;
}

function buildInstitutionDeclarationFormData(payload: InstitutionDeclarationPayload) {
  const formData = new FormData();
  formData.append('licensing_year', String(payload.licensing_year));
  if (payload.declared_students_count !== undefined) formData.append('declared_students_count', String(payload.declared_students_count));
  if (payload.declared_members_count !== undefined) formData.append('declared_members_count', String(payload.declared_members_count));
  if (payload.declared_branches_count !== undefined) formData.append('declared_branches_count', String(payload.declared_branches_count));
  (payload.faculties ?? []).forEach((faculty, index) => {
    formData.append(`faculties[${index}][faculty_name]`, faculty.faculty_name);
    formData.append(`faculties[${index}][student_count]`, String(faculty.student_count));
  });
  if (payload.metadata_json) formData.append('metadata_json', JSON.stringify(payload.metadata_json));
  if (payload.supporting_document) formData.append('supporting_document', payload.supporting_document);
  return formData;
}

export interface InitiateLicencePaymentPayload {
  gateway_name: 'paystack' | 'flutterwave';
  callback_url?: string;
  amount: number;
  licensing_year?: number;
  licence_id?: string;
}

export interface InitiateInvoicePaymentPayload {
  gateway_name?: 'paystack' | 'flutterwave';
  callback_url?: string;
  amount: number;
}

export interface UsageDeclarationPayload {
  reporting_year: number;
  declared_student_population?: number;
  declared_academic_staff_count?: number;
  declared_administrative_staff_count?: number;
  declared_campuses_count?: number;
  declared_library_capacity?: number;
  declaration_notes?: string;
}

export async function getInstitutionProfile() {
  const { data } = await apiClient.get<ApiSuccess<InstitutionProfileResource>>('/institution/profile');
  return data;
}

export async function updateInstitutionProfile(payload: UpdateInstitutionProfilePayload) {
  const { data } = await apiClient.patch<ApiSuccess<InstitutionProfileResource>>('/institution/profile', payload);
  return data;
}

export async function uploadInstitutionLogo(file: File) {
  const formData = new FormData();
  formData.append('logo', file);
  const { data } = await apiClient.post<ApiSuccess<InstitutionProfileResource>>('/institution/logo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function removeInstitutionLogo() {
  const { data } = await apiClient.delete<ApiSuccess<InstitutionProfileResource>>('/institution/logo');
  return data;
}

export async function uploadInstitutionDocument(payload: InstitutionDocumentUploadPayload) {
  const formData = new FormData();
  formData.append('document_type', payload.document_type);
  formData.append('file', payload.file);
  const { data } = await apiClient.post<ApiSuccess<InstitutionDocumentResource>>('/institution/documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function listInstitutionDeclarations(params: ListParams) {
  const { data } = await apiClient.get<PaginatedResponse<InstitutionAnnualDeclarationResource>>('/institution/declarations', { params });
  return data;
}

export async function createInstitutionDeclaration(payload: InstitutionDeclarationPayload) {
  const { data } = await apiClient.post<ApiSuccess<InstitutionAnnualDeclarationResource>>(
    '/institution/declarations',
    buildInstitutionDeclarationFormData(payload),
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data;
}

export async function getInstitutionDeclaration(declarationId: number) {
  const { data } = await apiClient.get<ApiSuccess<InstitutionAnnualDeclarationResource>>(`/institution/declarations/${declarationId}`);
  return data;
}

export async function updateInstitutionDeclaration(declarationId: number, payload: InstitutionDeclarationPayload) {
  const formData = buildInstitutionDeclarationFormData(payload);
  formData.append('_method', 'PATCH');
  const { data } = await apiClient.post<ApiSuccess<InstitutionAnnualDeclarationResource>>(
    `/institution/declarations/${declarationId}`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data;
}

export async function submitInstitutionDeclaration(declarationId: number) {
  const { data } = await apiClient.post<ApiSuccess<InstitutionAnnualDeclarationResource>>(`/institution/declarations/${declarationId}/submit`);
  return data;
}

export async function listInstitutionLicences(params: ListParams) {
  const { data } = await apiClient.get<PaginatedResponse<LicenceResource>>('/institution/licences', { params });
  return data;
}

export async function getInstitutionLicence(licenceId: number) {
  const { data } = await apiClient.get<ApiSuccess<LicenceResource>>(`/institution/licences/${licenceId}`);
  return data;
}

export async function initiateInstitutionLicencePayment(licenceId: number, payload: InitiateLicencePaymentPayload) {
  const { data } = await apiClient.post<ApiSuccess<PaymentInitiationResult>>(`/institution/licences/${licenceId}/payments/initiate`, payload);
  return data;
}

export async function listInstitutionLicencePayments(licenceId: number) {
  const { data } = await apiClient.get<ApiSuccess<LicencePaymentResource[]>>(`/institution/licences/${licenceId}/payments`);
  return data;
}

export async function verifyInstitutionPayment(paymentId: number) {
  const { data } = await apiClient.post<ApiSuccess<LicencePaymentResource>>(`/institution/payments/${paymentId}/verify`);
  return data;
}

export async function downloadInstitutionLicenceCertificate(licenceId: number): Promise<Blob> {
  const { data } = await apiClient.get(`/institution/licences/${licenceId}/certificate`, {
    responseType: 'blob',
    headers: { Accept: 'application/pdf' },
  });
  return data as Blob;
}

export async function downloadInstitutionPaymentReceipt(paymentId: number): Promise<Blob> {
  const { data } = await apiClient.get(`/institution/payments/${paymentId}/receipt`, {
    responseType: 'blob',
    headers: { Accept: 'application/pdf' },
  });
  return data as Blob;
}

export async function listInstitutionInvoices(params: ListParams) {
  const { data } = await apiClient.get<PaginatedResponse<InvoiceResource>>('/institution/invoices', { params });
  return data;
}

export async function getInstitutionInvoice(invoiceId: number) {
  const { data } = await apiClient.get<ApiSuccess<InvoiceResource>>(`/institution/invoices/${invoiceId}`);
  return data;
}

export async function initiateInstitutionInvoicePayment(invoiceId: number, payload: InitiateInvoicePaymentPayload) {
  const { data } = await apiClient.post<ApiSuccess<PaymentInitiationResult>>(`/institution/invoices/${invoiceId}/payments/initiate`, payload);
  return data;
}

export async function submitOfflineInstitutionInvoicePayment(invoiceId: number, formData: FormData) {
  const { data } = await apiClient.post<ApiSuccess<LicencePaymentResource>>(`/institution/invoices/${invoiceId}/offline-payments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function listUsageDeclarations(params: ListParams) {
  const { data } = await apiClient.get<PaginatedResponse<UsageDeclarationResource>>('/institution/usage-declarations', { params });
  return data;
}

export async function getUsageDeclaration(usageDeclarationId: number) {
  const { data } = await apiClient.get<ApiSuccess<UsageDeclarationResource>>(`/institution/usage-declarations/${usageDeclarationId}`);
  return data;
}

export async function createUsageDeclaration(licenceId: number, payload: UsageDeclarationPayload) {
  const { data } = await apiClient.post<ApiSuccess<UsageDeclarationResource>>(`/institution/licences/${licenceId}/usage-declarations`, payload);
  return data;
}

export interface AcceptInstitutionLicensingTermsPayload {
  terms_version: string;
  acknowledged_on: string;
  confirm_accepted: boolean;
}

export async function acceptInstitutionLicensingTerms(payload: AcceptInstitutionLicensingTermsPayload) {
  return postSuccess<InstitutionProfileResource>('/institution/licensing-terms/acceptance', payload);
}
