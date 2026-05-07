export interface UserNotificationResource {
  id: string;
  type: string;
  category?: string;
  title: string;
  message: string | null;
  severity: 'success' | 'info' | 'warning' | 'error' | string;
  channel: string;
  read_at: string | null;
  created_at: string | null;
  action_url: string | null;
  meta: Record<string, unknown>;
}

export interface SecurityActivityRecord {
  id: number;
  action: string;
  label: string;
  category?: string | null;
  ip_address: string | null;
  user_agent: string | null;
  device_label?: string | null;
  browser_name?: string | null;
  operating_system?: string | null;
  device_type?: 'desktop' | 'mobile' | 'unknown' | string | null;
  is_current_context?: boolean;
  anomaly_level?: 'none' | 'notice' | 'warning' | string | null;
  anomaly_message?: string | null;
  created_at: string | null;
}

export interface SecurityActivitySummary {
  total_events: number;
  two_factor_enabled: boolean;
  email_verified: boolean;
  privileged_access: boolean;
  role_scope: string | null;
  login_event_count: number;
  protected_action_count: number;
  recent_anomaly_count?: number;
  last_unfamiliar_sign_in_at?: string | null;
  last_login_at: string | null;
  last_password_change_at: string | null;
  last_two_factor_event_at: string | null;
  last_profile_update_at: string | null;
  last_security_confirmation_at: string | null;
  last_sensitive_action_at: string | null;
  last_login_ip: string | null;
  current_ip?: string | null;
  current_device_label?: string | null;
  current_browser_name?: string | null;
  current_operating_system?: string | null;
  current_device_type?: 'desktop' | 'mobile' | 'unknown' | string | null;
  recent_device_labels?: string[];
}

export interface SecurityActivityPayload {
  summary: SecurityActivitySummary;
  items: SecurityActivityRecord[];
}

export interface NotificationPreference {
  event_key: string;
  notification_key?: string;
  channel: string;
  enabled: boolean;
  is_enabled?: boolean;
}

export interface TwoFactorStatus {
  requires_two_factor: boolean;
  two_factor_confirmed_at: string | null;
}

export interface EmailVerificationStatus {
  email_verified: boolean;
  email: string | null;
  email_verified_at?: string | null;
}
