import { apiClient } from '@/api/client';
import type { ApiSuccess } from '@/types/api';
import type {
  AuthSession,
  CurrentUserContext,
  EmailVerificationStatus,
  NotificationPreference,
  SecurityActivityPayload,
  SecurityActivityRecord,
  TwoFactorStatus,
  UserResource,
} from '@/types/domain';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface VerifyTwoFactorPayload {
  challenge_id: number;
  code: string;
}

export interface VerifyMemberOtpPayload {
  email: string;
  code: string;
}

export interface ResendMemberOtpPayload {
  email: string;
}

export interface VerifyInstitutionOtpPayload {
  email: string;
  code: string;
}

export interface ResendInstitutionOtpPayload {
  email: string;
}

export interface RegisterMemberPayload {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  password: string;
  password_confirmation: string;
  applicant_type: 'author' | 'publisher' | 'artist';
  association_id: number;
  accepted_terms: boolean;
  /** Required when API `RECAPTCHA_SECRET_KEY` is configured. */
  recaptcha_token?: string;
}

export interface RegisterInstitutionPayload {
  organisation_name: string;
  institution_type:
    | 'university'
    | 'polytechnic'
    | 'college_of_education'
    | 'professional_body'
    | 'religious_organization'
    | 'corporate_organization'
    | 'government_agency'
    | 'ngo'
    | 'research_institute'
    | 'library'
    | 'other';
  registration_number?: string;
  contact_person_name: string;
  contact_person_title?: string;
  email: string;
  phone: string;
  password: string;
  password_confirmation: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  country: string;
  postal_code?: string;
  year_established: number;
  academic_staff_count?: number;
  administrative_staff_count?: number;
  campuses_count?: number;
  branches_count?: number;
  member_count?: number;
  licensing_year?: number;
  declared_students_count?: number;
  declared_members_count?: number;
  declared_branches_count?: number;
  accepted_terms: boolean;
  /** Required when API `RECAPTCHA_SECRET_KEY` is configured. */
  recaptcha_token?: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  email: string;
  token: string;
  password: string;
  password_confirmation: string;
}

export interface VerifyResetTokenPayload {
  email: string;
  token: string;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
  new_password_confirmation: string;
}

export interface UpdateMePayload {
  first_name?: string;
  last_name?: string;
  phone?: string;
}

export interface UploadAvatarPayload {
  avatar: File;
}

export interface ConfirmSensitivePayload {
  admin_pin: string;
  challenge_id?: number;
  code?: string;
}

export async function login(payload: LoginPayload) {
  const { data } = await apiClient.post<ApiSuccess<AuthSession>>('/auth/login', payload);
  return data;
}

export async function verifyTwoFactor(payload: VerifyTwoFactorPayload) {
  const { data } = await apiClient.post<ApiSuccess<AuthSession>>('/auth/two-factor/verify', payload);
  return data;
}

export async function registerMember(payload: RegisterMemberPayload) {
  const { data } = await apiClient.post<ApiSuccess<{ otp_expires_at?: string | null }>>('/auth/register-member', payload);
  return data;
}

export async function verifyMemberRegistrationOtp(payload: VerifyMemberOtpPayload) {
  const { data } = await apiClient.post<ApiSuccess<AuthSession>>('/auth/member-registration/verify-otp', payload);
  return data;
}

export async function resendMemberRegistrationOtp(payload: ResendMemberOtpPayload) {
  const { data } = await apiClient.post<ApiSuccess<{ expires_at?: string | null }>>('/auth/member-registration/resend-otp', payload);
  return data;
}

export async function registerInstitution(payload: RegisterInstitutionPayload) {
  const { data } = await apiClient.post<ApiSuccess<{ otp_expires_at?: string | null }>>('/auth/register-institution', payload);
  return data;
}

export async function verifyInstitutionRegistrationOtp(payload: VerifyInstitutionOtpPayload) {
  const { data } = await apiClient.post<ApiSuccess<AuthSession>>('/auth/institution-registration/verify-otp', payload);
  return data;
}

export async function resendInstitutionRegistrationOtp(payload: ResendInstitutionOtpPayload) {
  const { data } = await apiClient.post<ApiSuccess<{ expires_at?: string | null }>>('/auth/institution-registration/resend-otp', payload);
  return data;
}

export async function logout() {
  const { data } = await apiClient.post<ApiSuccess<null>>('/auth/logout');
  return data;
}

export async function getCurrentUser() {
  const { data } = await apiClient.get<ApiSuccess<CurrentUserContext>>('/me');
  return data;
}

export async function updateMe(payload: UpdateMePayload) {
  const { data } = await apiClient.patch<ApiSuccess<UserResource>>('/me', payload);
  return data;
}

export async function changePassword(payload: ChangePasswordPayload) {
  const { data } = await apiClient.patch<ApiSuccess<null>>('/me/change-password', payload);
  return data;
}

export async function uploadMyAvatar(payload: UploadAvatarPayload) {
  const formData = new FormData();
  formData.append('avatar', payload.avatar);
  const { data } = await apiClient.post<ApiSuccess<UserResource>>('/me/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function removeMyAvatar() {
  const { data } = await apiClient.delete<ApiSuccess<UserResource>>('/me/avatar');
  return data;
}

export async function getDashboardSummary() {
  const { data } = await apiClient.get<ApiSuccess<unknown>>('/me/dashboard-summary');
  return data;
}

export async function getTwoFactorStatus() {
  const { data } = await apiClient.get<ApiSuccess<TwoFactorStatus>>('/me/two-factor');
  return data;
}

export async function enableTwoFactor() {
  const { data } = await apiClient.post<ApiSuccess<TwoFactorStatus>>('/me/two-factor/enable');
  return data;
}

export async function disableTwoFactor() {
  const { data } = await apiClient.post<ApiSuccess<TwoFactorStatus>>('/me/two-factor/disable');
  return data;
}

export async function confirmSensitiveAction(payload: ConfirmSensitivePayload) {
  const { data } = await apiClient.post<ApiSuccess<{ confirmed: boolean; challenge_id?: number | null; two_factor_required?: boolean; confirmed_until?: string | null; expires_at?: string | null }>>('/me/security/confirm', payload);
  return data;
}

export async function getNotificationPreferences() {
  const { data } = await apiClient.get<ApiSuccess<NotificationPreference[]>>('/me/notification-preferences');
  return data;
}

export async function updateNotificationPreferences(payload: { preferences: NotificationPreference[] }) {
  const { data } = await apiClient.put<ApiSuccess<NotificationPreference[]>>('/me/notification-preferences', payload);
  return data;
}

export async function getEmailVerificationStatus() {
  const { data } = await apiClient.get<ApiSuccess<EmailVerificationStatus>>('/email/verify');
  return data;
}

export async function verifyEmailWithSignedUrl(pathAndQuery: string) {
  const { data } = await apiClient.get<ApiSuccess<EmailVerificationStatus>>(pathAndQuery);
  return data;
}

export async function resendVerificationEmail() {
  const { data } = await apiClient.post<ApiSuccess<null>>('/email/verification-notification');
  return data;
}

// OTP-named aliases for newer callers.
export const getOtpVerificationStatus = getEmailVerificationStatus;
export const verifyOtpWithSignedUrl = verifyEmailWithSignedUrl;
export const resendOtpVerification = resendVerificationEmail;

export async function forgotPassword(payload: ForgotPasswordPayload) {
  const { data } = await apiClient.post<ApiSuccess<null>>('/auth/forgot-password', payload);
  return data;
}

export async function verifyResetToken(payload: VerifyResetTokenPayload) {
  const { data } = await apiClient.post<ApiSuccess<null>>('/auth/verify-reset-token', payload);
  return data;
}

export async function resetPassword(payload: ResetPasswordPayload) {
  const { data } = await apiClient.post<ApiSuccess<null>>('/auth/reset-password', payload);
  return data;
}

export async function getSecurityActivity() {
  const { data } = await apiClient.get<ApiSuccess<SecurityActivityPayload>>('/me/security-activity');
  return data;
}
