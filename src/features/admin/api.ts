import { apiClient } from '@/api/client';
import type { ApiSuccess, ListParams, PaginatedResponse } from '@/types/api';
import type {
  AdminBoardSummary,
  AdminCompletenessReport,
  AdminMemberReport,
  AdminWorkReport,
  AuditLogResource,
  ImportBatchResource,
  InstitutionAnnualDeclarationResource,
  InstitutionLicensingSummary,
  InstitutionProfileResource,
  InvoiceResource,
  LicencePaymentResource,
  LicenceResource,
  LicensingFeePlanResource,
  MemberApplicationResource,
  MemberProfileResource,
  TimelineEventResource,
  AssociationResource,
  UsageDeclarationResource,
  WorkContributorResource,
  WorkResource,
  DocumentResource,
  IntegrationOutboxEntryResource,
} from '@/types/domain';

export interface ReviewWorkPayload {
  decision: 'verified' | 'approved' | 'rejected' | 'changes_requested' | 'restricted' | 'disputed';
  reason_code?: string;
  review_note?: string;
  evidence_requested?: boolean;
}

export interface ReviewWorkUpdateRequestPayload {
  decision: 'approved' | 'rejected';
  review_note?: string;
}

export interface DisputeContributorPayload {
  reason_code?: string;
  reason?: string;
}

export interface MoveDeclarationToReviewPayload {
  note?: string;
}

export interface RejectDeclarationPayload {
  reason?: string;
}

export interface CreateFeePlanPayload {
  institution_type: string;
  basis_type: 'per_student' | 'per_member' | 'per_branch' | 'flat_rate';
  unit_cost?: number;
  flat_amount?: number;
  effective_from_year: number;
  effective_to_year?: number;
  is_active?: boolean;
  description?: string;
  metadata_json?: Record<string, unknown>;
}

export interface CreateAdjustmentPayload {
  adjustment_type: 'credit_note' | 'manual_adjustment';
  amount: number;
  reason_code: string;
  reason: string;
}

export interface CreateImportPayload {
  import_type: 'members' | 'works' | 'institutions';
  file: File;
}

export interface SendAdminPushNotificationPayload {
  audience?: 'all_members' | 'member_ids';
  member_ids?: number[];
  title: string;
  message: string;
  deep_link?: string;
}

export interface AdminPushNotificationSendResult {
  notification_id: string | null;
  recipients: number;
  audience: string;
  targeted_users_count: number;
  targeted_aliases: string[];
  provider_errors: string[];
  warnings: string[];
}

export async function listAdminMemberApplications(params: ListParams & { association_id?: number }) {
  const { data } = await apiClient.get<PaginatedResponse<MemberApplicationResource>>('/admin/member-applications', { params });
  return data;
}

export async function getAdminMemberApplication(id: number) {
  const { data } = await apiClient.get<ApiSuccess<MemberApplicationResource>>(`/admin/member-applications/${id}`);
  return data;
}

export async function listAdminMembers(params: ListParams & { member_type?: string; approval_status?: string; association_id?: number }) {
  const { data } = await apiClient.get<PaginatedResponse<MemberProfileResource>>('/admin/members', { params });
  return data;
}

export async function getAdminMember(id: number) {
  const { data } = await apiClient.get<ApiSuccess<MemberProfileResource>>(`/admin/members/${id}`);
  return data;
}

export async function listAdminWorks(params: ListParams & { verification_status?: string; work_status?: string; member_id?: number }) {
  const { data } = await apiClient.get<PaginatedResponse<WorkResource>>('/admin/works', { params });
  return data;
}

export async function getAdminWork(id: number) {
  const { data } = await apiClient.get<ApiSuccess<WorkResource>>(`/admin/works/${id}`);
  return data;
}

export async function listAdminWorkWipoOutbox(workId: number, params: ListParams = {}) {
  const { data } = await apiClient.get<PaginatedResponse<IntegrationOutboxEntryResource>>(`/admin/works/${workId}/wipo-connect/outbox`, { params });
  return data;
}

export async function enqueueAdminWorkWipoOutbox(workId: number, payload: { environment?: string; payload?: Record<string, unknown> } = {}) {
  const { data } = await apiClient.post<ApiSuccess<IntegrationOutboxEntryResource>>(`/admin/works/${workId}/wipo-connect/outbox`, payload);
  return data;
}

export async function listAdminInstitutionWipoOutbox(institutionId: number, params: ListParams = {}) {
  const { data } = await apiClient.get<PaginatedResponse<IntegrationOutboxEntryResource>>(`/admin/institutions/${institutionId}/wipo-connect/outbox`, { params });
  return data;
}

export async function enqueueAdminInstitutionWipoOutbox(institutionId: number, payload: { environment?: string; payload?: Record<string, unknown> } = {}) {
  const { data } = await apiClient.post<ApiSuccess<IntegrationOutboxEntryResource>>(`/admin/institutions/${institutionId}/wipo-connect/outbox`, payload);
  return data;
}

export async function listAdminMemberWipoOutbox(memberId: number, params: ListParams = {}) {
  const { data } = await apiClient.get<PaginatedResponse<IntegrationOutboxEntryResource>>(`/admin/members/${memberId}/wipo-connect/outbox`, { params });
  return data;
}

export async function enqueueAdminMemberWipoOutbox(memberId: number, payload: { environment?: string; payload?: Record<string, unknown> } = {}) {
  const { data } = await apiClient.post<ApiSuccess<IntegrationOutboxEntryResource>>(`/admin/members/${memberId}/wipo-connect/outbox`, payload);
  return data;
}

export async function listAdminLicenceWipoOutbox(licenceId: number, params: ListParams = {}) {
  const { data } = await apiClient.get<PaginatedResponse<IntegrationOutboxEntryResource>>(`/admin/licences/${licenceId}/wipo-connect/outbox`, { params });
  return data;
}

export async function enqueueAdminLicenceWipoOutbox(licenceId: number, payload: { environment?: string; payload?: Record<string, unknown> } = {}) {
  const { data } = await apiClient.post<ApiSuccess<IntegrationOutboxEntryResource>>(`/admin/licences/${licenceId}/wipo-connect/outbox`, payload);
  return data;
}

export async function reviewAdminWork(id: number, payload: ReviewWorkPayload) {
  const { data } = await apiClient.post<ApiSuccess<WorkResource>>(`/admin/works/${id}/review`, payload);
  return data;
}

export async function reviewAdminWorkUpdateRequest(id: number, payload: ReviewWorkUpdateRequestPayload) {
  const { data } = await apiClient.post<ApiSuccess<WorkResource>>(`/admin/works/${id}/update-request/review`, payload);
  return data;
}

export async function disputeAdminContributor(workId: number, contributorId: number, payload: DisputeContributorPayload) {
  const { data } = await apiClient.post<ApiSuccess<WorkContributorResource>>(`/admin/works/${workId}/contributors/${contributorId}/dispute`, payload);
  return data;
}

export async function listAdminInstitutions(params: ListParams & { institution_type?: string; account_status?: string; onboarding_status?: string }) {
  const { data } = await apiClient.get<PaginatedResponse<InstitutionProfileResource>>('/admin/institutions', { params });
  return data;
}

export async function getAdminInstitution(id: number) {
  const { data } = await apiClient.get<ApiSuccess<InstitutionProfileResource>>(`/admin/institutions/${id}`);
  return data;
}

export async function approveAdminInstitution(id: number) {
  const { data } = await apiClient.post<ApiSuccess<InstitutionProfileResource>>(`/admin/institutions/${id}/approve`);
  return data;
}

export async function listAdminDeclarations(params: ListParams & { institution_id?: number; licensing_year?: number; declaration_status?: string }) {
  const { data } = await apiClient.get<PaginatedResponse<InstitutionAnnualDeclarationResource>>('/admin/institution-declarations', { params });
  return data;
}

export async function getAdminDeclaration(id: number) {
  const { data } = await apiClient.get<ApiSuccess<InstitutionAnnualDeclarationResource>>(`/admin/institution-declarations/${id}`);
  return data;
}

export async function moveAdminDeclarationToReview(id: number, payload: MoveDeclarationToReviewPayload) {
  const { data } = await apiClient.post<ApiSuccess<InstitutionAnnualDeclarationResource>>(`/admin/institution-declarations/${id}/review`, payload);
  return data;
}

export async function approveAdminDeclaration(id: number) {
  const { data } = await apiClient.post<ApiSuccess<InstitutionAnnualDeclarationResource>>(`/admin/institution-declarations/${id}/approve`);
  return data;
}

export async function rejectAdminDeclaration(id: number, payload: RejectDeclarationPayload) {
  const { data } = await apiClient.post<ApiSuccess<InstitutionAnnualDeclarationResource>>(`/admin/institution-declarations/${id}/reject`, payload);
  return data;
}

export async function listAdminFeePlans(params: Pick<ListParams, 'page' | 'per_page'> = {}) {
  const { data } = await apiClient.get<PaginatedResponse<LicensingFeePlanResource>>('/admin/licensing/fee-plans', { params });
  return data;
}

export async function createAdminFeePlan(payload: CreateFeePlanPayload) {
  const { data } = await apiClient.post<ApiSuccess<LicensingFeePlanResource>>('/admin/licensing/fee-plans', payload);
  return data;
}

export async function updateAdminFeePlan(id: number, payload: CreateFeePlanPayload) {
  const { data } = await apiClient.patch<ApiSuccess<LicensingFeePlanResource>>(`/admin/licensing/fee-plans/${id}`, payload);
  return data;
}

export async function listAdminLicences(params: ListParams & { licence_status?: string; payment_status?: string }) {
  const { data } = await apiClient.get<PaginatedResponse<LicenceResource>>('/admin/licences', { params });
  return data;
}

export async function getAdminLicence(id: number) {
  const { data } = await apiClient.get<ApiSuccess<LicenceResource>>(`/admin/licences/${id}`);
  return data;
}

export async function listAdminPayments(params: ListParams & { payment_status?: string; gateway_name?: string }) {
  const { data } = await apiClient.get<PaginatedResponse<LicencePaymentResource>>('/admin/payments', { params });
  return data;
}

export async function getAdminPayment(id: number) {
  const { data } = await apiClient.get<ApiSuccess<LicencePaymentResource>>(`/admin/payments/${id}`);
  return data;
}

export async function confirmAdminOfflinePayment(paymentId: number, payload?: { note?: string }) {
  const { data } = await apiClient.post<ApiSuccess<LicencePaymentResource>>(`/admin/payments/${paymentId}/offline/confirm`, payload ?? {});
  return data;
}

export async function rejectAdminOfflinePayment(paymentId: number, payload: { reason: string }) {
  const { data } = await apiClient.post<ApiSuccess<LicencePaymentResource>>(`/admin/payments/${paymentId}/offline/reject`, payload);
  return data;
}

export async function downloadAdminOfflinePaymentProof(paymentId: number) {
  return apiClient.get<Blob>(`/admin/payments/${paymentId}/offline-proof`, { responseType: 'blob' });
}

export async function listAdminInvoices(params: ListParams & { invoice_type?: string; billing_year?: number; status?: string; date_from?: string; date_to?: string; institution_id?: number }) {
  const { data } = await apiClient.get<PaginatedResponse<InvoiceResource>>('/admin/invoices', { params });
  return data;
}

export async function getAdminInvoice(id: number) {
  const { data } = await apiClient.get<ApiSuccess<InvoiceResource>>(`/admin/invoices/${id}`);
  return data;
}

export async function sendAdminPushNotification(payload: SendAdminPushNotificationPayload) {
  const { data } = await apiClient.post<ApiSuccess<AdminPushNotificationSendResult>>('/admin/notifications/push', payload);
  return data;
}

export async function createAdminInvoiceAdjustment(id: number, payload: CreateAdjustmentPayload) {
  const { data } = await apiClient.post<ApiSuccess<InvoiceResource>>(`/admin/invoices/${id}/adjustments`, payload);
  return data;
}

export async function listAdminUsageDeclarations(params: ListParams & { licence_id?: number; declaration_status?: string }) {
  const { data } = await apiClient.get<PaginatedResponse<UsageDeclarationResource>>('/admin/usage-declarations', { params });
  return data;
}

export async function getAdminUsageDeclaration(id: number) {
  const { data } = await apiClient.get<ApiSuccess<UsageDeclarationResource>>(`/admin/usage-declarations/${id}`);
  return data;
}

export async function getAdminMemberReport() {
  const { data } = await apiClient.get<ApiSuccess<AdminMemberReport>>('/admin/reports/members');
  return data;
}

export async function getAdminWorkReport() {
  const { data } = await apiClient.get<ApiSuccess<AdminWorkReport>>('/admin/reports/works');
  return data;
}

export async function listAdminLicenceReports(params: ListParams & { licensing_year?: number; institution_type?: string }) {
  const { data } = await apiClient.get<PaginatedResponse<InstitutionLicensingSummary>>('/admin/reports/licences', { params });
  return data;
}

export async function getAdminCompletenessReport() {
  const { data } = await apiClient.get<ApiSuccess<AdminCompletenessReport>>('/admin/reports/completeness');
  return data;
}

export async function getAdminBoardSummary() {
  const { data } = await apiClient.get<ApiSuccess<AdminBoardSummary>>('/admin/reports/board-summary');
  return data;
}

export async function listAdminAuditLogs(params: ListParams) {
  const { data } = await apiClient.get<PaginatedResponse<AuditLogResource>>('/admin/audit-logs', { params });
  return data;
}

export async function getAdminAuditLog(id: number) {
  const { data } = await apiClient.get<ApiSuccess<AuditLogResource>>(`/admin/audit-logs/${id}`);
  return data;
}

export async function listAdminImports(params: ListParams) {
  const { data } = await apiClient.get<PaginatedResponse<ImportBatchResource>>('/admin/imports', { params });
  return data;
}

export async function createAdminImport(payload: CreateImportPayload) {
  const formData = new FormData();
  formData.append('import_type', payload.import_type);
  formData.append('file', payload.file);
  const { data } = await apiClient.post<ApiSuccess<ImportBatchResource>>('/admin/imports', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function processAdminImport(id: number) {
  const { data } = await apiClient.post<ApiSuccess<ImportBatchResource>>(`/admin/imports/${id}/process`);
  return data;
}


export interface ToggleAdminAssociationPayload {
  reason?: string;
}

export interface UploadAdminAssociationLogoPayload {
  logo: File;
}

export interface CreateAdminDocumentPayload {
  target_type: 'member' | 'institution' | 'association' | 'work';
  target_id: number;
  category: string;
  title: string;
  document_type?: string;
  visibility?: 'private' | 'restricted' | 'internal';
  description?: string;
  file: File;
}

export async function disableAdminAssociation(id: number, payload: ToggleAdminAssociationPayload = {}) {
  const { data } = await apiClient.post<ApiSuccess<any>>(`/admin/associations/${id}/disable`, payload);
  return data;
}

export async function enableAdminAssociation(id: number) {
  const { data } = await apiClient.post<ApiSuccess<any>>(`/admin/associations/${id}/enable`);
  return data;
}

export async function uploadAdminAssociationLogo(id: number, payload: UploadAdminAssociationLogoPayload) {
  const formData = new FormData();
  formData.append('logo', payload.logo);
  const { data } = await apiClient.post<ApiSuccess<any>>(`/admin/associations/${id}/logo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function listAdminDocuments(params: ListParams & { category?: string; target_type?: string } = {}) {
  const { data } = await apiClient.get<PaginatedResponse<DocumentResource>>('/admin/documents', { params });
  return data;
}

export async function deleteAdminDocument(documentId: number) {
  const { data } = await apiClient.delete<ApiSuccess<null>>(`/admin/documents/${documentId}`);
  return data;
}

export async function createAdminDocument(payload: CreateAdminDocumentPayload) {
  const formData = new FormData();
  formData.append('target_type', payload.target_type);
  formData.append('target_id', String(payload.target_id));
  formData.append('category', payload.category);
  formData.append('title', payload.title);
  if (payload.document_type) formData.append('document_type', payload.document_type);
  if (payload.visibility) formData.append('visibility', payload.visibility);
  if (payload.description) formData.append('description', payload.description);
  formData.append('file', payload.file);
  const { data } = await apiClient.post<ApiSuccess<any>>('/admin/documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

async function downloadAdminExport(path: string, params: Record<string, unknown> = {}) {
  const response = await apiClient.get(path, { params, responseType: 'blob' });
  const disposition = String(response.headers['content-disposition'] ?? '');
  const match = disposition.match(/filename="?([^";]+)"?/i);
  return { blob: response.data as Blob, filename: match?.[1] ?? 'export.csv' };
}

export async function downloadAdminMembersExport(params: Record<string, unknown> = {}) {
  return downloadAdminExport('/admin/members/export', params);
}

export async function downloadAdminInstitutionsExport(params: Record<string, unknown> = {}) {
  return downloadAdminExport('/admin/institutions/export', params);
}

export async function downloadAdminLicencesExport(params: Record<string, unknown> = {}) {
  return downloadAdminExport('/admin/licences/export', params);
}

export async function downloadAdminPaymentsExport(params: Record<string, unknown> = {}) {
  return downloadAdminExport('/admin/payments/export', params);
}

export async function downloadAdminAssociationsExport(params: Record<string, unknown> = {}) {
  return downloadAdminExport('/admin/associations/export', params);
}

export async function downloadAdminDeclarationsExport(params: Record<string, unknown> = {}) {
  return downloadAdminExport('/admin/institution-declarations/export', params);
}

export async function downloadAdminWorksExport(params: Record<string, unknown> = {}) {
  return downloadAdminExport('/admin/works/export', params);
}

export async function listAdminTimeline(entity: 'member' | 'association' | 'institution' | 'declaration' | 'licence' | 'payment' | 'invoice', subjectId: number, params: Pick<ListParams, 'page' | 'per_page'> = {}) {
  const { data } = await apiClient.get<PaginatedResponse<TimelineEventResource>>(`/admin/timelines/${entity}/${subjectId}`, { params });
  return data;
}

export async function rejectAdminInstitution(id: number, payload: RejectDeclarationPayload) {
  const { data } = await apiClient.post<ApiSuccess<InstitutionProfileResource>>(`/admin/institutions/${id}/reject`, payload);
  return data;
}

export async function deactivateAdminInstitution(id: number, payload: RejectDeclarationPayload) {
  const { data } = await apiClient.post<ApiSuccess<InstitutionProfileResource>>(`/admin/institutions/${id}/deactivate`, payload);
  return data;
}

export async function reactivateAdminInstitution(id: number, payload: RejectDeclarationPayload = {}) {
  const { data } = await apiClient.post<ApiSuccess<InstitutionProfileResource>>(`/admin/institutions/${id}/reactivate`, payload);
  return data;
}

export async function listAdminAssociations(params: ListParams = {}) {
  const { data } = await apiClient.get<PaginatedResponse<AssociationResource>>('/admin/associations', { params });
  return data;
}

export async function getAdminAssociation(id: number) {
  const { data } = await apiClient.get<ApiSuccess<AssociationResource>>(`/admin/associations/${id}`);
  return data;
}

export interface TermsAndConditionResource {
  id: number;
  title: string;
  version: string;
  audience: 'all' | 'member' | 'institution';
  content: string;
  is_active: boolean;
  published_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface TermsAndConditionPayload {
  title: string;
  version: string;
  audience: 'all' | 'member' | 'institution';
  content: string;
  is_active?: boolean;
}

export async function listTermsAndConditions(params: ListParams = {}) {
  const { data } = await apiClient.get<PaginatedResponse<TermsAndConditionResource>>('/admin/terms-and-conditions', { params });
  return data;
}

export async function createTermsAndCondition(payload: TermsAndConditionPayload) {
  const { data } = await apiClient.post<ApiSuccess<TermsAndConditionResource>>('/admin/terms-and-conditions', payload);
  return data;
}

export async function updateTermsAndCondition(id: number, payload: Partial<TermsAndConditionPayload>) {
  const { data } = await apiClient.patch<ApiSuccess<TermsAndConditionResource>>(`/admin/terms-and-conditions/${id}`, payload);
  return data;
}
