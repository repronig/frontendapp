import { apiClient } from '@/api/client';
import type { ApiSuccess, PaginatedResponse } from '@/types/api';

export async function getSuccess<T>(url: string, params?: object) {
  const { data } = await apiClient.get<ApiSuccess<T>>(url, params ? { params } : undefined);
  return data;
}

export async function getPaginated<T>(url: string, params?: object) {
  const { data } = await apiClient.get<PaginatedResponse<T>>(url, params ? { params } : undefined);
  return data;
}

export async function postSuccess<T>(url: string, payload?: unknown) {
  const { data } = await apiClient.post<ApiSuccess<T>>(url, payload);
  return data;
}

export async function patchSuccess<T>(url: string, payload?: unknown) {
  const { data } = await apiClient.patch<ApiSuccess<T>>(url, payload);
  return data;
}

export async function putSuccess<T>(url: string, payload?: unknown) {
  const { data } = await apiClient.put<ApiSuccess<T>>(url, payload);
  return data;
}

export async function deleteSuccess<T>(url: string) {
  const { data } = await apiClient.delete<ApiSuccess<T>>(url);
  return data;
}

export async function uploadSuccess<T>(url: string, formData: FormData) {
  const { data } = await apiClient.post<ApiSuccess<T>>(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}
