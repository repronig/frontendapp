import type {
  AssociationResource,
  CurrentUserContext,
  InstitutionAnnualDeclarationResource,
  InstitutionProfileResource,
  MemberApplicationResource,
} from '@/types/domain';
import type { ProfileCompleteness } from '@/components/shared/ProfileCompletenessCard';

export interface WorkSummaryResource {
  id: number;
  external_id: string | null;
  reference_number: string | null;
  type_of_work: string | null;
  title: string;
  subtitle: string | null;
  publication_year: number | null;
  primary_language: string | null;
  identifier_type: string | null;
  identifier_value: string | null;
  doi: string | null;
  publisher_name: string | null;
  work_status: string | null;
  verification_status: string | null;
  is_disputed: boolean;
  is_restricted: boolean;
  review_reason: string | null;
  governance_reason_code: string | null;
  submitted_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface LicenceSummaryResource {
  id: number;
  institution_id: number;
  institution_annual_declaration_id: number | null;
  licence_number: string | null;
  licence_id_snapshot: string | null;
  licence_year: number | null;
  agreement_version: string | null;
  licence_status: string | null;
  payment_status: string | null;
  start_date: string | null;
  end_date: string | null;
  negotiated_rate: number | null;
  amount_due: number | null;
  amount_paid: number | null;
  outstanding_amount: number | null;
  issued_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface UsageDeclarationSummaryResource {
  id: number;
  licence_id: number | null;
  institution_id: number;
  reporting_year: number | null;
  declaration_status: string | null;
  declared_student_population: number | null;
  declared_academic_staff_count: number | null;
  declared_administrative_staff_count: number | null;
  declared_campuses_count: number | null;
  declared_library_capacity: number | null;
  declaration_notes: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  created_at: string | null;
}

/** Present on dashboard payloads (API schema v2). */
export interface DashboardPayloadMeta {
  schema_version: number;
  generated_at: string;
}

export interface MeDashboardSummary {
  meta?: DashboardPayloadMeta;
  user: CurrentUserContext['user'];
  roles: string[];
  member: null | {
    member_profile: CurrentUserContext['member_profile'];
    member_application: MemberApplicationResource | null;
    profile_completeness: ProfileCompleteness | null;
    stats: {
      total_works: number;
      draft_works: number;
      submitted_works: number;
      verified_works: number;
    };
    recent_works: WorkSummaryResource[];
    recent_submissions: WorkSummaryResource[];
    recent_activity: DashboardActivityItem[];
    pending_actions: Array<{
      key: string;
      label: string;
      description: string;
      priority: 'high' | 'medium' | 'low';
      missing_fields?: string[];
    }>;
    onboarding_status: {
      application_status: string | null;
      submission_stage: string | null;
      approved_member: boolean;
    };
  };
  association_officer: null | {
    association: AssociationResource;
    stats: {
      total_applications: number;
      submitted_applications: number;
      approved_applications: number;
      rejected_applications: number;
      changes_requested_applications: number;
    };
    recent_applications: MemberApplicationResource[];
  };
  institution: null | {
    institution_profile: InstitutionProfileResource;
    stats: {
      total_licences: number;
      active_licences: number;
      pending_payment_licences: number;
      total_annual_declarations: number;
      submitted_annual_declarations: number;
    };
    current_licence: LicenceSummaryResource | null;
    recent_licences: LicenceSummaryResource[];
    recent_usage_declarations: UsageDeclarationSummaryResource[];
    onboarding_status: {
      onboarding_status: string | null;
      account_status: string | null;
    };
  };
  admin: null | {
    can_access_admin_panel: boolean;
    can_access_super_panel: boolean;
  };
}

export interface DashboardActivityItem {
  id: number;
  action: string;
  subject_type: string | null;
  subject_id: number | null;
  created_at: string | null;
  actor: null | { id: number; name: string; email: string };
}

export interface AssociationDashboard {
  meta?: DashboardPayloadMeta;
  association: AssociationResource;
  stats: {
    total_applications: number;
    submitted_applications: number;
    approved_applications: number;
    rejected_applications: number;
    changes_requested_applications: number;
  };
  recent_applications: MemberApplicationResource[];
  recent_activity: DashboardActivityItem[];
}

export interface InstitutionDashboard {
  meta?: DashboardPayloadMeta;
  institution: InstitutionProfileResource;
  stats: {
    total_licences: number;
    active_licences: number;
    pending_payment_licences: number;
    total_annual_declarations: number;
    submitted_annual_declarations: number;
    paid_payments: number;
    total_paid_amount: number;
  };
  current_licence: LicenceSummaryResource | null;
  recent_licences: LicenceSummaryResource[];
  recent_usage_declarations: UsageDeclarationSummaryResource[];
  recent_annual_declarations: InstitutionAnnualDeclarationResource[];
  recent_activity: DashboardActivityItem[];
  onboarding_status: {
    onboarding_status: string | null;
    account_status: string | null;
  };
}

export interface AdminDashboardSummaryActivity {
  id: number;
  action: string;
  subject_type: string | null;
  subject_id: number | null;
  created_at: string | null;
  actor: null | { id: number; name: string; email: string };
}

export interface AdminDashboardSummary {
  meta?: DashboardPayloadMeta;
  users: { total: number; active: number; inactive: number; suspended: number; admins: number; super_admins: number };
  associations: { total: number; active: number; enabled: number; disabled: number };
  roles: { total: number; permissions: number };
  members: { total: number; approved: number };
  member_applications: {
    total: number;
    submitted: number;
    approved: number;
    rejected: number;
    changes_requested: number;
  };
  works: { total: number; draft: number; submitted: number; verified: number };
  institutions: { total: number; pending_review: number; active: number };
  licences: { total: number; active: number; pending_payment: number };
  payments: { total: number; paid: number; pending: number; failed: number; total_paid_amount: number; total_amount_sum: number };
  invoices: { total: number; total_amount_sum: number };
  usage_declarations: { total: number; submitted: number };
  audit_summary?: { recent_actions: number; approvals: number; rejections: number; deactivations: number };
  recent_activity: AdminDashboardSummaryActivity[];
}

export interface AdminFinanceSummary {
  totals: {
    total_payments: number;
    total_amount: number;
    total_paid_amount: number;
    total_pending_amount: number;
  };
  status_breakdown: { paid: number; pending: number; failed: number };
  recent_payments: Array<{
    id: number;
    payment_reference: string | null;
    amount: number;
    currency: string | null;
    payment_status: string | null;
    created_at: string | null;
    paid_at: string | null;
    institution: { id: number; name: string } | null;
  }>;
}

export interface SuperAdminDashboardSummary {
  meta?: DashboardPayloadMeta;
  users: { total: number; active: number; inactive: number; suspended: number; admins: number; super_admins: number };
  associations: { total: number; active: number; enabled: number; disabled: number };
  organizations: { institutions: number; active_institutions: number };
  members: { total: number; approved: number };
  invoices: { total: number; total_amount_sum: number };
  payments: { total: number; paid: number; pending: number; failed: number; total_paid_amount: number; total_amount_sum: number };
  roles: { total: number; permissions: number };
  revenue: { total_paid_amount: number; paid_payments: number };
  recent_activity: AdminDashboardSummaryActivity[];
}
