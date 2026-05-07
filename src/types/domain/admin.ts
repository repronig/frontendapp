import type { UserResource } from './user';

export interface TimelineEventResource {
  id: number;
  type?: string | null;
  action: string;
  label: string;
  description?: string | null;
  actor?: UserResource | null;
  subject_type: string | null;
  subject_id: number | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  timestamp?: string | null;
  created_at: string | null;
}

export interface AuditLogResource {
  id: number;
  actor?: UserResource | null;
  action: string;
  subject_type: string | null;
  subject_id: number | string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string | null;
}

export interface ImportBatchResource {
  id: number;
  import_type: string;
  status: string;
  status_label?: string | null;
  enabled_status?: string | null;
  enabled_label?: string | null;
  source_filename: string | null;
  total_rows: number | null;
  valid_rows: number | null;
  invalid_rows: number | null;
  processed_rows: number | null;
  error_report_path: string | null;
  summary: Record<string, unknown> | null;
  validated_at: string | null;
  processed_at: string | null;
  failures?: unknown[];
}

export interface PermissionResource {
  id: number;
  name: string;
}

export interface RoleResource {
  id: number;
  name: string;
  permissions?: PermissionResource[];
}

export interface SettingsPayload {
  app: Record<string, unknown>;
  membership: Record<string, unknown>;
  licensing: Record<string, unknown>;
  documents: Record<string, unknown>;
  notifications: Record<string, unknown>;
  security: Record<string, unknown>;
}

export interface AdminMemberReport {
  summary: {
    total_members: number;
    approved_members: number;
    author_members: number;
    publisher_members: number;
  };
  applications: {
    total: number;
    submitted: number;
    approved: number;
    rejected: number;
    changes_requested: number;
  };
}

export interface AdminWorkReport {
  summary: {
    total_works: number;
    draft_works: number;
    submitted_works: number;
    verified_works: number;
    rejected_works: number;
  };
}

export interface AdminCompletenessReport {
  institutions: {
    with_profile: number;
    without_profile: number;
  };
  licences: {
    total_licences: number;
    active_licences: number;
    pending_payment_licences: number;
    submitted_usage_declarations: number;
  };
}

export interface AdminBoardSummary {
  total_members: number;
  approved_members: number;
  pending_members: number;
  works_registered: number;
  verified_works: number;
  institutions_onboarded: number;
  licences_issued: number;
  invoice_collection_rate: number;
  outstanding_receivables: number;
  period: string;
}
