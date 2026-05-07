import { apiClient } from '@/api/client';
import type { ApiSuccess, ListParams, PaginatedResponse } from '@/types/api';
import type {
  AssociationResource,
  ExternalIntegrationResource,
  IntegrationOutboxEntryResource,
  PermissionResource,
  RoleResource,
  SettingsPayload,
  TimelineEventResource,
  LanguageResource,
  UserResource,
} from '@/types/domain';

export interface IntegrationOutboxSummary {
  pending_total: number;
  processing_total: number;
  failed_last_24h: number;
  oldest_pending_created_at: string | null;
  oldest_pending_scheduled_at: string | null;
}

export interface SuperLanguagePayload {
  name: string;
  code: string;
  is_active?: boolean;
  sort_order?: number;
}

export interface SuperAssociationPayload {
  name: string;
  code: string;
  type?: string;
  description?: string;
  contact_email?: string;
  contact_phone?: string;
  status: 'active' | 'inactive';
  address_line_1?: string;
  address_line_2?: string;
  state_id?: number;
  city_id?: number;
  country?: string;
  postal_code?: string;
  is_enabled?: boolean;
  disable_reason?: string;
}


export interface UpdateAdminPinPayload {
  admin_pin: string;
  admin_pin_confirmation: string;
}

export interface SuperUserPayload {
  first_name: string;
  last_name?: string;
  email: string;
  phone?: string;
  password?: string;
  account_type: 'member' | 'association_officer' | 'institution_user' | 'admin' | 'super_admin';
  status?: 'active' | 'inactive' | 'suspended';
  roles: string[];
  association_ids?: number[];
  institution_id?: number;
  institution_role_label?: string;
  institution_is_primary?: boolean;
  institution_is_active?: boolean;
}

export async function listSuperAssociations(params: ListParams) {
  const { data } = await apiClient.get<PaginatedResponse<AssociationResource>>('/super/associations', { params });
  return data;
}

export async function getSuperAssociation(id: number) {
  const { data } = await apiClient.get<ApiSuccess<AssociationResource>>(`/super/associations/${id}`);
  return data;
}

export async function createSuperAssociation(payload: SuperAssociationPayload) {
  const { data } = await apiClient.post<ApiSuccess<AssociationResource>>('/super/associations', payload);
  return data;
}

export async function updateSuperAssociation(id: number, payload: Partial<SuperAssociationPayload>) {
  const { data } = await apiClient.patch<ApiSuccess<AssociationResource>>(`/super/associations/${id}`, payload);
  return data;
}

export async function deactivateSuperAssociation(id: number, reason?: string) {
  const { data } = await apiClient.post<ApiSuccess<AssociationResource>>(`/super/associations/${id}/deactivate`, { reason });
  return data;
}

export async function activateSuperAssociation(id: number) {
  const { data } = await apiClient.post<ApiSuccess<AssociationResource>>(`/super/associations/${id}/activate`);
  return data;
}

export async function listSuperUsers(params: ListParams & { role?: string; account_type?: string; institution_id?: number; association_id?: number }) {
  const { data } = await apiClient.get<PaginatedResponse<UserResource>>('/super/users', { params });
  return data;
}

export async function getSuperUser(id: number) {
  const { data } = await apiClient.get<ApiSuccess<UserResource>>(`/super/users/${id}`);
  return data;
}

export async function createSuperUser(payload: SuperUserPayload) {
  const { data } = await apiClient.post<ApiSuccess<UserResource>>('/super/users', payload);
  return data;
}

export async function updateSuperUser(id: number, payload: Partial<SuperUserPayload>) {
  const { data } = await apiClient.patch<ApiSuccess<UserResource>>(`/super/users/${id}`, payload);
  return data;
}

export async function activateSuperUser(id: number, reason?: string) {
  const { data } = await apiClient.post<ApiSuccess<UserResource>>(`/super/users/${id}/activate`, { reason });
  return data;
}

export async function deactivateSuperUser(id: number, reason?: string) {
  const { data } = await apiClient.post<ApiSuccess<UserResource>>(`/super/users/${id}/deactivate`, { reason });
  return data;
}

export async function listSuperRoles() {
  const { data } = await apiClient.get<ApiSuccess<RoleResource[]>>('/super/roles');
  return data;
}

export async function getSuperRole(name: string) {
  const { data } = await apiClient.get<ApiSuccess<RoleResource>>(`/super/roles/${name}`);
  return data;
}

export async function listSuperPermissions() {
  const { data } = await apiClient.get<ApiSuccess<PermissionResource[]>>('/super/permissions');
  return data;
}

export async function syncSuperRolePermissions(name: string, permissions: string[]) {
  const { data } = await apiClient.put<ApiSuccess<RoleResource>>(`/super/roles/${name}/permissions`, { permissions });
  return data;
}

export async function getSuperSettings() {
  const { data } = await apiClient.get<ApiSuccess<SettingsPayload>>('/super/settings');
  return data;
}

export async function updateSuperSettings(payload: Partial<SettingsPayload>) {
  const { data } = await apiClient.put<ApiSuccess<SettingsPayload>>('/super/settings', payload);
  return data;
}

export async function updateSuperAdminPin(payload: UpdateAdminPinPayload) {
  const { data } = await apiClient.put<ApiSuccess<{ configured: boolean; affected_admin_users_count: number }>>('/super/settings/admin-pin', payload);
  return data;
}


export async function listSuperLanguages() {
  const { data } = await apiClient.get<ApiSuccess<LanguageResource[]>>('/super/languages');
  return data;
}

export async function createSuperLanguage(payload: SuperLanguagePayload) {
  const { data } = await apiClient.post<ApiSuccess<LanguageResource>>('/super/languages', payload);
  return data;
}

export async function updateSuperLanguage(id: number, payload: Partial<SuperLanguagePayload>) {
  const { data } = await apiClient.patch<ApiSuccess<LanguageResource>>(`/super/languages/${id}`, payload);
  return data;
}

export async function disableSuperLanguage(id: number) {
  const { data } = await apiClient.delete<ApiSuccess<LanguageResource>>(`/super/languages/${id}`);
  return data;
}

export async function listSuperTimeline(entity: 'association' | 'user', subjectId: number, params: Pick<ListParams, 'page' | 'per_page'> = {}) {
  const { data } = await apiClient.get<PaginatedResponse<TimelineEventResource>>(`/super/timelines/${entity}/${subjectId}`, { params });
  return data;
}

export interface UpsertSuperIntegrationPayload {
  is_enabled?: boolean;
  config?: Record<string, unknown>;
  webhook_secret?: string | null;
}

export async function listSuperIntegrations(params: ListParams = {}) {
  const { data } = await apiClient.get<PaginatedResponse<ExternalIntegrationResource>>('/super/integrations', { params });
  return data;
}

export async function upsertSuperIntegration(provider: string, environment: string, payload: UpsertSuperIntegrationPayload) {
  const { data } = await apiClient.put<ApiSuccess<ExternalIntegrationResource>>(`/super/integrations/${provider}/${environment}`, payload);
  return data;
}

export async function listSuperIntegrationOutbox(params: ListParams & { provider?: string } = {}) {
  const { data } = await apiClient.get<PaginatedResponse<IntegrationOutboxEntryResource>>('/super/integrations/outbox', { params });
  return data;
}

export async function getSuperIntegrationOutboxSummary() {
  const { data } = await apiClient.get<ApiSuccess<IntegrationOutboxSummary>>('/super/integrations/outbox/summary');
  return data;
}

export async function requeueSuperIntegrationOutbox(outboxId: number) {
  const { data } = await apiClient.post<ApiSuccess<IntegrationOutboxEntryResource>>(`/super/integrations/outbox/${outboxId}/requeue`, {});
  return data;
}

export async function enqueueSuperWipoConnectOutbox(workId: number, payload: { operation?: string; environment?: string; payload?: Record<string, unknown> } = {}) {
  const { data } = await apiClient.post<ApiSuccess<IntegrationOutboxEntryResource>>(`/super/works/${workId}/wipo-connect/outbox`, payload);
  return data;
}
