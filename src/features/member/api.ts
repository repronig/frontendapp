import { deleteSuccess, getPaginated, getSuccess, patchSuccess, postSuccess, uploadSuccess } from '@/api/http';
import { apiClient } from '@/api/client';
import type { ListParams } from '@/types/api';
import type {
  MemberApplicationDocumentResource,
  MemberApplicationResource,
  MemberProfileResource,
  WorkContributorResource,
  WorkFileResource,
  WorkResource,
} from '@/types/domain';
export interface MemberApplicationPayload {
  first_name: string;
  last_name: string;
  association_id: number;
  applicant_type: 'author' | 'publisher' | 'artist';
  member_author_type?: 'individual' | 'corporate' | 'agent' | '';
  member_author_category?: string;
  nationality?: string;
  country_of_residence: string;
  is_diaspora: boolean;
  bank_name: string;
  bank_account_number: string;
  bank_account_owner_name: string;
  next_of_kin_name?: string;
  next_of_kin_phone?: string;
  publisher_organisation_name?: string;
  publisher_tin?: string;
  publisher_location_address?: string;
  publisher_postal_address?: string;
  publisher_email?: string;
  publisher_phone?: string;
  consent_accepted: boolean;
  consent_date: string;
  notes?: string;
  member_provided_id?: string | null;
}

export interface UpdateMemberProfilePayload {
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  occupation?: string;
  residential_address_line_1?: string;
  residential_address_line_2?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  publisher_name?: string;
  corporate_name?: string;
  member_provided_id?: string | null;
}

export interface WorkPayload {
  type_of_work: string;
  title: string;
  subtitle?: string;
  publication_year?: number;
  synopsis?: string;
  primary_language?: string;
  work_format?: string;
  identifier_type?: string;
  identifier_value?: string;
  doi?: string;
  publisher_name?: string;
  target_market?: string;
  target_market_other?: string;
  production_status?: 'yes' | 'no';
  agreement_accepted?: boolean;
  date_of_consent?: string;
  other_work_type?: string;
  notes?: string;
}

export interface WorkContributorPayload {
  member_id?: number;
  contributor_name: string;
  contributor_role: string;
  right_type: 'exclusive' | 'non_exclusive';
  ownership_percentage: number;
  territory_scope?: string;
}

export interface WorkListParams extends ListParams {}

export async function getMyMemberApplication() {
  return getSuccess<MemberApplicationResource | null>('/member-applications/me');
}

export async function createMemberApplication(payload: MemberApplicationPayload) {
  return postSuccess<MemberApplicationResource>('/member-applications', payload);
}

export async function getMemberApplication(memberApplicationId: number) {
  return getSuccess<MemberApplicationResource>(`/member-applications/${memberApplicationId}`);
}

export async function updateMemberApplication(memberApplicationId: number, payload: Partial<MemberApplicationPayload>) {
  const { applicant_type: _applicantType, association_id: _associationId, ...mutable } = payload;
  return patchSuccess<MemberApplicationResource>(`/member-applications/${memberApplicationId}`, mutable);
}

export async function submitMemberApplication(memberApplicationId: number) {
  return postSuccess<MemberApplicationResource>(`/member-applications/${memberApplicationId}/submit`);
}

export async function downloadMemberApplicationMandate(memberApplicationId: number) {
  return apiClient.get<Blob>(`/member-applications/${memberApplicationId}/mandate`, {
    responseType: 'blob',
    headers: { Accept: 'application/pdf' },
  });
}

export async function uploadMemberApplicationDocument(memberApplicationId: number, payload: { document_type: string; file: File }) {
  const formData = new FormData();
  formData.append('document_type', payload.document_type);
  formData.append('file', payload.file);
  return uploadSuccess<MemberApplicationDocumentResource>(`/member-applications/${memberApplicationId}/documents`, formData);
}

export async function deleteMemberApplicationDocument(memberApplicationId: number, documentId: number) {
  return deleteSuccess<null>(`/member-applications/${memberApplicationId}/documents/${documentId}`);
}

export async function getMemberProfile() {
  return getSuccess<MemberProfileResource | null>('/member/profile');
}

export async function updateMemberProfile(payload: UpdateMemberProfilePayload) {
  return patchSuccess<MemberProfileResource>('/member/profile', payload);
}

export async function listWorks(params: WorkListParams) {
  return getPaginated<WorkResource>('/works', params);
}

export async function createWork(payload: WorkPayload) {
  return postSuccess<WorkResource>('/works', payload);
}

export async function getWork(workId: number) {
  return getSuccess<WorkResource>(`/works/${workId}`);
}

export async function updateWork(workId: number, payload: Partial<WorkPayload>) {
  return patchSuccess<WorkResource>(`/works/${workId}`, payload);
}

export async function submitWork(workId: number) {
  return postSuccess<WorkResource>(`/works/${workId}/submit`);
}

export async function deleteWork(workId: number) {
  return deleteSuccess<null>(`/works/${workId}`);
}

export async function requestWorkUpdate(workId: number, payload: { note?: string } = {}) {
  return postSuccess<WorkResource>(`/works/${workId}/request-update`, payload);
}

export async function addWorkContributor(workId: number, payload: WorkContributorPayload) {
  return postSuccess<WorkContributorResource>(`/works/${workId}/contributors`, payload);
}

export async function updateWorkContributor(workId: number, contributorId: number, payload: Partial<WorkContributorPayload>) {
  return patchSuccess<WorkContributorResource>(`/works/${workId}/contributors/${contributorId}`, payload);
}

export async function deleteWorkContributor(workId: number, contributorId: number) {
  return deleteSuccess<null>(`/works/${workId}/contributors/${contributorId}`);
}

export async function uploadWorkFile(workId: number, payload: { file_type: string; file: File }) {
  const formData = new FormData();
  formData.append('file_type', payload.file_type);
  formData.append('file', payload.file);
  return uploadSuccess<WorkFileResource>(`/works/${workId}/files`, formData);
}

export async function deleteWorkFile(workId: number, fileId: number) {
  return deleteSuccess<null>(`/works/${workId}/files/${fileId}`);
}
