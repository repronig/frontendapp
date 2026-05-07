import { useQuery } from '@tanstack/react-query';
import {
  getAdminDashboardSummary,
  getAdminFinanceSummary,
  getAssociationDashboard,
  getInstitutionDashboard,
  getMeDashboardSummary,
  getSuperAdminDashboardSummary,
} from '@/features/dashboard/api';
import { queryKeys } from '@/lib/queryKeys';

export function useMeDashboardSummary(enabled = true) {
  return useQuery({
    queryKey: queryKeys.dashboardMeSummary,
    queryFn: async () => (await getMeDashboardSummary()).data,
    enabled,
    staleTime: 60_000,
  });
}

export function useAssociationDashboard(enabled = true) {
  return useQuery({
    queryKey: queryKeys.dashboardAssociation,
    queryFn: async () => (await getAssociationDashboard()).data,
    enabled,
    staleTime: 60_000,
  });
}

export function useInstitutionDashboard(enabled = true) {
  return useQuery({
    queryKey: queryKeys.dashboardInstitution,
    queryFn: async () => (await getInstitutionDashboard()).data,
    enabled,
    staleTime: 60_000,
  });
}

export function useAdminDashboardSummary(enabled = true) {
  return useQuery({
    queryKey: queryKeys.dashboardAdminSummary,
    queryFn: async () => (await getAdminDashboardSummary()).data,
    enabled,
    staleTime: 60_000,
  });
}

export function useSuperAdminDashboardSummary(enabled = true) {
  return useQuery({
    queryKey: queryKeys.dashboardSuperAdminSummary,
    queryFn: async () => (await getSuperAdminDashboardSummary()).data,
    enabled,
    staleTime: 60_000,
  });
}

export function useAdminFinanceSummary(enabled = true) {
  return useQuery({
    queryKey: queryKeys.dashboardAdminFinanceSummary,
    queryFn: async () => (await getAdminFinanceSummary()).data,
    enabled,
    staleTime: 60_000,
  });
}
