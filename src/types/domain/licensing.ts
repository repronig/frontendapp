import type { SettlementSummaryResource } from './common';
import type { InstitutionAnnualDeclarationFacultyResource } from './institution';

/** Values returned on `LicencePaymentResource` rows (invoice / licence payment records). */
export type LicencePaymentRecordStatus =
  | 'pending'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'pending_offline';

export interface InstitutionAnnualDeclarationResource {
  id: number;
  institution_id: number;
  institution?: { id: number | null; name: string | null; email: string | null; licence_id?: string | null; institution_type?: string | null; logo_url?: string | null; logo?: string | null } | null;
  licence_id_snapshot: string | null;
  licensing_year: number;
  basis_type: string | null;
  declared_units: number | null;
  declared_students_count: number | null;
  declared_members_count: number | null;
  declared_branches_count: number | null;
  declared_faculties_count: number | null;
  pricing_unit_cost: number | null;
  pricing_flat_amount: number | null;
  expected_amount: number | null;
  paid_amount: number | null;
  outstanding_amount: number | null;
  declaration_status: string | null;
  submitted_at: string | null;
  invoice_due_date?: string | null;
  approved_at: string | null;
  faculties?: InstitutionAnnualDeclarationFacultyResource[];
  licence?: LicenceResource | null;
  invoice?: { id: number | null; invoice_number: string | null; status: string | null; billing_year?: number | null; total_amount?: number | null; amount_paid?: number | null; outstanding_amount?: number | null; due_date?: string | null } | null;
  supporting_document?: { file_name: string | null; mime_type: string | null; file_size: number | null; file_path: string | null; file_url: string | null; download_url: string | null } | null;
  payments?: LicencePaymentResource[];
  financial_summary?: { expected_amount?: number | null; paid_amount?: number | null; outstanding_amount?: number | null; payment_count?: number | null; faculty_count?: number | null } | null;
  settlement_summary?: SettlementSummaryResource | null;
  related_entities?: { institution?: { id: number | null; name: string | null; licence_id?: string | null } | null; licence?: { id: number | null; licence_number: string | null; licence_status?: string | null; payment_status?: string | null } | null; invoice?: { id: number | null; invoice_number: string | null; status?: string | null; due_date?: string | null } | null } | null;
  metadata?: unknown;
  created_at: string | null;
  updated_at: string | null;
}

export interface LicencePaymentResource {
  id: number;
  licence_id: number;
  institution_annual_declaration_id: number | null;
  invoice_id?: number | null;
  payment_reference: string | null;
  gateway_reference: string | null;
  provider_event_id?: string | null;
  gateway_name: string | null;
  offline?: {
    paid_in_full: boolean;
    institution_note: string;
    has_proof: boolean;
    submitted_at?: string | null;
    rejection_reason?: string;
  } | null;
  amount: number | null;
  amount_allocated: number | null;
  balance_before: number | null;
  balance_after: number | null;
  currency: string | null;
  payment_status: LicencePaymentRecordStatus | null;
  paid_at: string | null;
  institution?: { id: number | null; name: string | null; email?: string | null; licence_id?: string | null } | null;
  licence?: { id: number | null; licence_number: string | null; licence_year?: number | null; licence_status?: string | null; payment_status?: string | null } | null;
  declaration?: { id: number | null; licensing_year: number | null; declaration_status?: string | null; expected_amount?: number | null; outstanding_amount?: number | null } | null;
  invoice?: { id: number | null; invoice_number: string | null; status?: string | null; total_amount?: number | null; outstanding_amount?: number | null; due_date?: string | null } | null;
  settlement_summary?: SettlementSummaryResource | null;
  audit_summary?: { reconciliation_count?: number; recent_action_count?: number; last_action_at?: string | null; recent_actions?: Array<{ id: string; type?: string | null; label?: string | null; description?: string | null; amount?: number | null; created_at?: string | null; actor?: { id?: number | null; name?: string | null } | null }> } | null;
  related_entities?: { institution?: { id: number | null; name: string | null; licence_id?: string | null } | null; licence?: { id: number | null; licence_number: string | null; licence_status?: string | null } | null; declaration?: { id: number | null; licensing_year: number | null; declaration_status?: string | null } | null; invoice?: { id: number | null; invoice_number: string | null; status?: string | null; due_date?: string | null } | null } | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface InvoiceResource {
  id: number;
  invoice_number: string | null;
  invoice_type: string | null;
  billing_year: number | null;
  issue_date: string | null;
  due_date: string | null;
  status: string | null;
  currency: string | null;
  subtotal_amount: number | null;
  total_amount: number | null;
  amount_paid: number | null;
  outstanding_amount: number | null;
  institution?: { id: number | null; name: string | null; email: string | null; licence_id?: string | null; logo_url?: string | null; logo_thumb_url?: string | null; logo_medium_url?: string | null } | null;
  declaration?: { id: number | null; licensing_year: number | null; declaration_status?: string | null } | null;
  licence?: { id: number | null; licence_number: string | null; licence_status?: string | null; payment_status?: string | null } | null;
  payments?: LicencePaymentResource[];
  adjustments?: Array<{ id: number; adjustment_type?: string | null; amount?: number | null; reason_code?: string | null; reason?: string | null; applied_at?: string | null; created_by?: { id?: number | null; name?: string | null } | null }>;
  settlement_summary?: SettlementSummaryResource | null;
  audit_summary?: { adjustment_count?: number; payment_count?: number; recent_action_count?: number; last_action_at?: string | null; recent_actions?: Array<{ id: string; type?: string | null; label?: string | null; description?: string | null; amount?: number | null; created_at?: string | null; actor?: { id?: number | null; name?: string | null } | null }> } | null;
  related_entities?: { institution?: { id: number | null; name: string | null; licence_id?: string | null; logo_url?: string | null; logo_thumb_url?: string | null; logo_medium_url?: string | null } | null; declaration?: { id: number | null; licensing_year: number | null; declaration_status?: string | null } | null; licence?: { id: number | null; licence_number: string | null; licence_status?: string | null; payment_status?: string | null } | null } | null;
}

export interface LicenceResource {
  id: number;
  institution_id: number;
  institution?: { id: number | null; name: string | null; email?: string | null; licence_id?: string | null; institution_type?: string | null } | null;
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
  declaration?: InstitutionAnnualDeclarationResource | null;
  invoice?: { id: number | null; invoice_number: string | null; status?: string | null; total_amount?: number | null; amount_paid?: number | null; outstanding_amount?: number | null; due_date?: string | null } | null;
  payments?: LicencePaymentResource[];
  financial_summary?: { amount_due?: number | null; amount_paid?: number | null; outstanding_amount?: number | null; payment_count?: number | null } | null;
  settlement_summary?: SettlementSummaryResource | null;
  related_entities?: { institution?: { id: number | null; name: string | null; licence_id?: string | null; logo_url?: string | null; logo_thumb_url?: string | null; logo_medium_url?: string | null } | null; declaration?: { id: number | null; licensing_year: number | null; declaration_status?: string | null } | null; invoice?: { id: number | null; invoice_number: string | null; status?: string | null; due_date?: string | null } | null } | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface UsageDeclarationResource {
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

export interface LicensingFeePlanResource {
  id: number;
  institution_type: string;
  institution_type_label?: string | null;
  basis_type: string;
  basis_type_label?: string | null;
  unit_cost: number | null;
  flat_amount: number | null;
  effective_from_year: number;
  effective_to_year: number | null;
  is_active: boolean;
  active_status?: string | null;
  active_label?: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface PaymentInitiationResult {
  payment_id: number;
  payment_reference: string;
  gateway_name: string;
  amount: number;
  currency: string;
  payment_status: LicencePaymentRecordStatus;
  balance_before: number | null;
  balance_after: number | null;
  invoice_id: number | null;
  authorization_url: string | null;
  access_code?: string | null;
}
