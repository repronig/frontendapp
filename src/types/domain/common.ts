export interface StateResource {
  id: number;
  name: string;
  code: string;
  country_code: string;
}

export interface CityResource {
  id: number;
  name: string;
  state_id: number;
  state?: StateResource;
}

export interface LanguageResource {
  id: number;
  name: string;
  code: string;
  is_active: boolean;
  sort_order?: number;
}

export interface ProfileCompletenessResource {
  completed_fields: number;
  total_fields: number;
  percentage: number;
  is_complete: boolean;
  missing_fields: string[];
}

export interface SettlementSummaryResource {
  state: string;
  label: string;
  is_fully_paid: boolean;
  is_partially_paid: boolean;
  is_outstanding: boolean;
  is_overdue: boolean;
  due_date?: string | null;
  amount_due?: number | null;
  amount_paid?: number | null;
  outstanding_amount?: number | null;
  expected_amount?: number | null;
  paid_amount?: number | null;
  amount?: number | null;
  amount_allocated?: number | null;
  balance_after?: number | null;
}
