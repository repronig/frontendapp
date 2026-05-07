import { apiClient } from '@/api/client';
import type { ApiSuccess, ListParams, PaginatedResponse } from '@/types/api';
import type {
  AssociationResource,
  CityResource,
  InstitutionLicensingSummary,
  LanguageResource,
  PaymentInitiationResult,
  StateResource,
} from '@/types/domain';

export async function getPublicAssociations(params: ListParams = {}) {
  const { data } = await apiClient.get<PaginatedResponse<AssociationResource>>('/associations', { params });
  return data;
}

export async function getPublicAssociation(id: number | string) {
  const { data } = await apiClient.get<{ message: string; data: AssociationResource }>(`/associations/${id}`);
  return data;
}

export async function getStates(perPage = 100) {
  const { data } = await apiClient.get<PaginatedResponse<StateResource>>('/locations/states', {
    params: { per_page: perPage },
  });
  return data;
}

export async function getCities(stateId: number | string, perPage = 200) {
  const { data } = await apiClient.get<PaginatedResponse<CityResource>>(`/locations/states/${stateId}/cities`, {
    params: { per_page: perPage },
  });
  return data;
}

export async function lookupLicence(licenceId: string) {
  const { data } = await apiClient.get<{ message: string; data: InstitutionLicensingSummary }>(`/licensing/lookup/${licenceId}`);
  return data;
}

export async function initializePublicLicencePayment(payload: {
  gateway_name: 'paystack' | 'flutterwave';
  callback_url?: string;
  amount: number;
  licensing_year?: number;
  licence_id?: string;
}) {
  const { data } = await apiClient.post<{ message: string; data: PaymentInitiationResult }>('/licensing/payments/initialize', payload);
  return data;
}

export interface PublicTermsResource {
  id: number;
  title: string;
  version: string;
  audience: string;
  content: string;
  is_active: boolean;
  published_at: string | null;
}

export interface PublicPlatformSettings {
  licensing: {
    default_currency: string;
    paystack_enabled: boolean;
    flutterwave_enabled: boolean;
    offline_payment_enabled: boolean;
    enabled_online_gateways: Array<'paystack' | 'flutterwave'>;
    default_online_gateway: 'paystack' | 'flutterwave' | null;
    repronig_bank: {
      account_name: string;
      bank_name: string;
      account_number: string;
      reference_note: string;
    };
    institution_licensing_terms: {
      version: string;
      title: string;
      body: string;
    };
  };
}

export async function getActiveTerms(audience: 'all' | 'member' | 'institution' = 'all') {
  const { data } = await apiClient.get<ApiSuccess<PublicTermsResource | null>>('/terms-and-conditions/active', { params: { audience } });
  return data;
}

export async function getPublicPlatformSettings() {
  const { data } = await apiClient.get<ApiSuccess<PublicPlatformSettings>>('/platform-settings');
  return data;
}


export async function getPublicLanguages() {
  const { data } = await apiClient.get<ApiSuccess<LanguageResource[]>>('/languages');
  return data;
}
