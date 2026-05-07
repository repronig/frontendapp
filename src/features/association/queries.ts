import { queryKeys } from '@/lib/queryKeys';

export const associationPortalQueryKeys = {
  profile: queryKeys.associationProfile,
  applications: queryKeys.associationApplications,
  application: queryKeys.associationApplication,
  dashboardApplication: queryKeys.associationDashboardApplication,
} as const;
