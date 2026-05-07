import { queryKeys } from '@/lib/queryKeys';

export const dashboardQueryKeys = {
  meSummary: queryKeys.dashboardMeSummary,
  association: queryKeys.dashboardAssociation,
  institution: queryKeys.dashboardInstitution,
  adminSummary: queryKeys.dashboardAdminSummary,
  superAdminSummary: queryKeys.dashboardSuperAdminSummary,
  adminFinanceSummary: queryKeys.dashboardAdminFinanceSummary,
  superIntegrationOutboxSummary: queryKeys.superDashboardIntegrationOutboxSummary,
} as const;
