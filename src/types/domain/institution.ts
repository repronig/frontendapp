import type { ProfileCompletenessResource } from './common';

export interface InstitutionDocumentResource {
  id: number;
  document_type: string | null;
  file_name: string | null;
  mime_type: string | null;
  file_size: number | null;
  file_url: string | null;
  download_url: string | null;
  verification_status?: string | null;
  verified_at?: string | null;
  created_at: string | null;
}

export interface InstitutionProfileResource {
  id: number;
  external_id: string | null;
  name: string;
  institution_type: string;
  institution_type_label?: string | null;
  registration_number: string | null;
  licence_id: string | null;
  year_established: number | null;
  email: string | null;
  phone: string | null;
  address: {
    address_line_1: string | null;
    address_line_2: string | null;
    city: string | null;
    state: string | null;
    city_name: string | null;
    state_name: string | null;
    city_id: number | null;
    state_id: number | null;
    postal_code: string | null;
    country: string | null;
  };
  location: {
    city_id: number | null;
    state_id: number | null;
    city_name: string | null;
    state_name: string | null;
  };
  contact_person_name: string | null;
  contact_person_title: string | null;
  onboarding_status: string | null;
  onboarding_status_label?: string | null;
  faculties_count: number | null;
  member_count: number | null;
  branches_count: number | null;
  academic_staff_count: number | null;
  administrative_staff_count: number | null;
  campuses_count: number | null;
  profile_metadata_json: unknown;
  account_status: string | null;
  account_status_label?: string | null;
  governance_status: string | null;
  governance_status_label?: string | null;
  governance_reason_code: string | null;
  governance_reason: string | null;
  governance_changed_by_user_id: number | null;
  governance_changed_at: string | null;
  approved_by_user_id: number | null;
  approved_at: string | null;
  licence_id_generated_at: string | null;
  licensing_terms_accepted_at?: string | null;
  licensing_terms_acknowledged_on?: string | null;
  licensing_terms_version_accepted?: string | null;
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

export interface InstitutionAnnualDeclarationFacultyResource {
  id?: number;
  faculty_name: string;
  student_count: number;
}

export interface InstitutionLicensingSummary {
  institution_id: number | null;
  institution_name: string | null;
  licence_id: string | null;
  institution_type: string | null;
  address: string | null;
  licensing_year: number | null;
  basis_type: string | null;
  faculties_count: number | null;
  declared_units: number | null;
  declared_students_count: number | null;
  declared_members_count: number | null;
  declared_branches_count: number | null;
  pricing_unit_cost: number | null;
  pricing_flat_amount: number | null;
  expected_amount: number | null;
  amount_paid: number | null;
  outstanding_amount: number | null;
  payment_status: string | null;
  licence_status: string | null;
  faculties: Array<{ faculty_name: string; student_count: number }>;
}
