import { getSuccess } from '@/api/http';
import type {
  AdminDashboardSummary,
  AdminFinanceSummary,
  AssociationDashboard,
  InstitutionDashboard,
  MeDashboardSummary,
  SuperAdminDashboardSummary,
} from '@/types/dashboard';

export async function getMeDashboardSummary() {
  return getSuccess<MeDashboardSummary>('/me/dashboard-summary');
}

export async function getAssociationDashboard() {
  return getSuccess<AssociationDashboard>('/association/dashboard');
}

export async function getInstitutionDashboard() {
  return getSuccess<InstitutionDashboard>('/institution/dashboard');
}

export async function getAdminDashboardSummary() {
  return getSuccess<AdminDashboardSummary>('/admin/dashboard/summary');
}


export async function getAdminFinanceSummary() {
  return getSuccess<AdminFinanceSummary>('/admin/finance/summary');
}

export async function getSuperAdminDashboardSummary() {
  return getSuccess<SuperAdminDashboardSummary>('/super/dashboard/summary');
}
