import type { UserResource } from './user';

export interface WorkContributorResource {
  id: number;
  member_id: number | null;
  contributor_name: string;
  contributor_role: string;
  contributor_role_label?: string | null;
  right_type: string;
  right_type_label?: string | null;
  ownership_percentage: number | string;
  territory_scope: string | null;
  is_disputed: boolean;
  dispute_reason_code: string | null;
  dispute_reason: string | null;
  disputed_by_user_id: number | null;
  disputed_at: string | null;
  disputed_by?: UserResource | null;
}

export interface WorkFileResource {
  id: number;
  file_type: string;
  file_name: string | null;
  mime_type: string | null;
  file_size: number | null;
  file_url: string | null;
  download_url: string | null;
  created_at: string | null;
}

export interface WorkReviewResource {
  id: number;
  action: string | null;
  reason: string | null;
  notes: string | null;
  created_at: string | null;
  reviewer?: UserResource | null;
}

export interface WorkResource {
  id: number;
  external_id: string | null;
  reference_number: string | null;
  member_id: number;
  type_of_work: string;
  type_of_work_label?: string | null;
  title: string;
  subtitle: string | null;
  publication_year: number | null;
  synopsis: string | null;
  primary_language: string | null;
  work_format?: string | null;
  work_format_label?: string | null;
  identifier_type: string | null;
  identifier_type_label?: string | null;
  identifier_value: string | null;
  target_market?: string | null;
  target_market_label?: string | null;
  target_market_other?: string | null;
  production_status?: string | null;
  production_status_label?: string | null;
  agreement_accepted?: boolean | null;
  date_of_consent?: string | null;
  other_work_type?: string | null;
  notes?: string | null;
  duplicate_fingerprint?: string | null;
  doi: string | null;
  publisher_name: string | null;
  work_status: string;
  work_status_label?: string | null;
  verification_status: string | null;
  verification_status_label?: string | null;
  is_disputed: boolean;
  is_restricted: boolean;
  update_request_status?: 'pending' | 'approved' | 'rejected' | null | string;
  update_request_status_label?: string | null;
  update_requested_at?: string | null;
  update_requested_by_member_id?: number | null;
  update_request_note?: string | null;
  update_request_reviewed_at?: string | null;
  update_request_reviewed_by_user_id?: number | null;
  update_request_review_note?: string | null;
  review_reason: string | null;
  governance_reason_code: string | null;
  governance_reason?: string | null;
  verified_at?: string | null;
  last_reviewed_at?: string | null;
  verified_by_user_id?: number | null;
  last_reviewed_by_user_id?: number | null;
  verified_by?: UserResource | null;
  last_reviewed_by?: UserResource | null;
  submitted_at: string | null;
  contributors?: WorkContributorResource[];
  files?: WorkFileResource[];
  reviews?: WorkReviewResource[];
  created_at: string | null;
  updated_at: string | null;
}
