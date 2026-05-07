import type { CityResource, ProfileCompletenessResource, StateResource } from './common';
import type { InstitutionDocumentResource } from './institution';

export interface AssociationResource {
  id: number;
  name: string;
  code: string;
  type: string | null;
  type_label?: string | null;
  description: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  status: string;
  status_label?: string | null;
  enabled_status?: string | null;
  enabled_label?: string | null;
  is_enabled: boolean;
  disabled_at: string | null;
  disable_reason: string | null;
  address: {
    address_line_1: string | null;
    address_line_2: string | null;
    postal_code: string | null;
    country: string | null;
    state_id?: number | null;
    city_id?: number | null;
    state_name?: string | null;
    city_name?: string | null;
  };
  location?: {
    state_id: number | null;
    city_id: number | null;
    state_name: string | null;
    city_name: string | null;
  } | null;
  state?: StateResource;
  city?: CityResource;
  logo_url: string | null;
  logo_thumb_url: string | null;
  logo_medium_url: string | null;
  profile_completeness?: ProfileCompletenessResource | null;
  kyc_readiness?: {
    required_documents: string[];
    submitted_documents: string[];
    missing_documents: string[];
    is_complete: boolean;
  } | null;
  kyc_documents?: InstitutionDocumentResource[];
}
