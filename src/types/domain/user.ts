export interface UserResource {
  id: number;
  external_id: string | null;
  name: string;
  first_name?: string | null;
  last_name?: string | null;
  email: string;
  phone: string | null;
  nationality: string | null;
  account_type: string | null;
  status: string | null;
  email_verified_at: string | null;
  roles: string[];
  primary_role: string | null;
  requires_two_factor: boolean;
  two_factor_confirmed_at: string | null;
  last_security_confirmation_at: string | null;
  last_login_at?: string | null;
  avatar_url: string | null;
  avatar_thumb_url: string | null;
  avatar_medium_url: string | null;
  primary_association: {
    id: number;
    external_id: string | null;
    name: string;
    code: string;
    designation_title: string | null;
  } | null;
}
