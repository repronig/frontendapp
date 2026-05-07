import { apiClient } from '@/api/client';
import type { ApiSuccess, ListParams, PaginatedResponse } from '@/types/api';
import type { AssociationResource, MemberApplicationResource } from '@/types/domain';

export interface AssociationApplicationListParams extends ListParams {}

export interface UpdateAssociationProfilePayload {
  name?: string;
  type?: string;
  description?: string;
  contact_email?: string;
  contact_phone?: string;
  address_line_1?: string;
  address_line_2?: string;
  state_id?: number | null;
  city_id?: number | null;
  country?: string;
  postal_code?: string;
}

export async function getAssociationProfile() {
  const { data } = await apiClient.get<ApiSuccess<AssociationResource>>('/association/profile');
  return data;
}

export async function updateAssociationProfile(payload: UpdateAssociationProfilePayload) {
  const { data } = await apiClient.patch<ApiSuccess<AssociationResource>>('/association/profile', payload);
  return data;
}

export async function uploadAssociationLogo(file: File) {
  const formData = new FormData();
  formData.append('logo', file);
  const { data } = await apiClient.post<ApiSuccess<AssociationResource>>('/association/logo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function removeAssociationLogo() {
  const { data } = await apiClient.delete<ApiSuccess<AssociationResource>>('/association/logo');
  return data;
}

export async function listAssociationApplications(params: AssociationApplicationListParams) {
  const { data } = await apiClient.get<PaginatedResponse<MemberApplicationResource>>('/association/applications', { params });
  return data;
}

export async function getAssociationApplication(applicationId: number) {
  const { data } = await apiClient.get<ApiSuccess<MemberApplicationResource>>(`/association/applications/${applicationId}`);
  return data;
}

export async function approveAssociationApplication(applicationId: number, comment?: string) {
  const { data } = await apiClient.post<ApiSuccess<MemberApplicationResource>>(`/association/applications/${applicationId}/approve`, {
    comment,
  });
  return data;
}

export async function rejectAssociationApplication(applicationId: number, reason: string) {
  const { data } = await apiClient.post<ApiSuccess<MemberApplicationResource>>(`/association/applications/${applicationId}/reject`, {
    reason,
  });
  return data;
}

export async function requestChangesAssociationApplication(applicationId: number, comment: string) {
  const { data } = await apiClient.post<ApiSuccess<MemberApplicationResource>>(`/association/applications/${applicationId}/request-changes`, {
    comment,
  });
  return data;
}
