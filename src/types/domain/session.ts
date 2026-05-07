import type { InstitutionProfileResource } from './institution';
import type { MemberApplicationResource, MemberProfileResource } from './member';
import type { UserResource } from './user';

export interface CurrentUserContext {
  user: UserResource;
  role_summary: {
    roles: string[];
    primary_role: string | null;
    is_member: boolean;
    is_association_officer: boolean;
    is_institution_user: boolean;
    is_admin: boolean;
    is_super_admin: boolean;
  };
  portal_access: {
    member: boolean;
    association: boolean;
    institution: boolean;
    admin: boolean;
    super_admin: boolean;
  };
  security: {
    email_verified: boolean;
    requires_two_factor: boolean;
    two_factor_confirmed: boolean;
    two_factor_confirmed_at: string | null;
    last_security_confirmation_at: string | null;
    last_login_at?: string | null;
  };
  association_context: {
    id: number;
    external_id: string | null;
    name: string;
    code: string;
    status: string;
    status_label?: string | null;
    enabled_status?: string | null;
    enabled_label?: string | null;
    is_enabled: boolean;
    designation_title: string | null;
  } | null;
  institution_context: {
    id: number;
    external_id: string | null;
    name: string;
    licence_id: string | null;
    onboarding_status: string | null;
    onboarding_status_label?: string | null;
    account_status: string | null;
    governance_status: string | null;
    primary_link_active: boolean;
  } | null;
  member_profile: MemberProfileResource | null;
  member_application: MemberApplicationResource | null;
  institution_profile: InstitutionProfileResource | null;
  onboarding_status: {
    member_application_exists: boolean;
    member_application_status: string | null;
    member_submission_stage: string | null;
    member_profile_exists: boolean;
    member_approved: boolean;
    member_can_edit_application: boolean;
    institution_profile_exists: boolean;
    institution_onboarding_status: string | null;
    institution_account_status: string | null;
    institution_governance_status: string | null;
    institution_is_fully_onboarded: boolean;
    institution_licensing_terms_acceptance_required?: boolean;
  };
}

export interface AuthSession {
  two_factor_required: boolean;
  challenge_id: number | null;
  expires_at: string | null;
  token: string | null;
  token_type: string;
  user: UserResource | null;
}
