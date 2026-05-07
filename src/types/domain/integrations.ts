export type IntegrationProviderKey = 'wipo_connect';

export type IntegrationEnvironmentKey = 'sandbox' | 'production';

export interface SuperIntegrationConfigPublic {
  api_base_url?: string;
  realm?: string;
  tenant_id?: string;
  sync_path?: string;
  sync_http_method?: string;
}

export interface ExternalIntegrationResource {
  id: number;
  provider: IntegrationProviderKey | string;
  environment: IntegrationEnvironmentKey | string;
  is_enabled: boolean;
  config: SuperIntegrationConfigPublic;
  created_at: string | null;
  updated_at: string | null;
}

export interface IntegrationOutboxEntryResource {
  id: number;
  provider: string;
  operation: string;
  status: string;
  attempts: number;
  last_error: string | null;
  scheduled_at: string | null;
  processed_at: string | null;
  subject_type: string | null;
  subject_id: number | null;
  payload: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
}
