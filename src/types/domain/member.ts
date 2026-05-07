import type { AssociationResource } from './association';
import type { ProfileCompletenessResource } from './common';
import type { UserResource } from './user';

export interface MemberApplicationDocumentResource {
  id: number;
  document_type: string | null;
  file_name: string | null;
  mime_type: string | null;
  file_size: number | null;
  file_url: string | null;
  download_url: string | null;
  verification_status?: string | null;
  verified_at?: string | null;
  created_at?: string | null;
}

export interface MemberProfileResource {
  member_id: number;
  member_code: string | null;
  member_type: string | null;
  member_provided_id?: string | null;
  approval_status: string | null;
  user?: UserResource | null;
  association?: AssociationResource | null;
  profile?: {
    date_of_birth: string | null;
    occupation: string | null;
    residential_address_line_1: string | null;
    residential_address_line_2: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    postal_code: string | null;
    publisher_name: string | null;
    corporate_name: string | null;
  } | null;
  profile_completeness?: ProfileCompletenessResource | null;
  joined_at: string | null;
  activated_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface MemberApplicationResource {
  id: number;
  external_id: string | null;
  application_reference?: string | null;
  user?: UserResource | null;
  association?: AssociationResource | null;
  applicant_type: string;
  applicant_type_label?: string | null;
  member_author_type: string | null;
  member_author_type_label?: string | null;
  member_author_category: string | null;
  member_author_category_label?: string | null;
  application_status: string;
  application_status_label?: string | null;
  submission_stage: string | null;
  submission_stage_label?: string | null;
  nationality: string | null;
  country_of_residence: string | null;
  is_diaspora: boolean | null;
  diaspora_label?: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_owner_name: string | null;
  next_of_kin_name: string | null;
  next_of_kin_phone: string | null;
  publisher_organisation_name: string | null;
  publisher_tin: string | null;
  publisher_location_address: string | null;
  publisher_postal_address: string | null;
  publisher_email: string | null;
  publisher_phone: string | null;
  consent_accepted: boolean | null;
  consent_date: string | null;
  notes: string | null;
  member_provided_id?: string | null;
  documents?: MemberApplicationDocumentResource[];
  submitted_at: string | null;
  reviewed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}
