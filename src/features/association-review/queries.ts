import { queryKeys } from '@/lib/queryKeys';

/** Association officer application review — list/detail keys. */
export const associationReviewQueryKeys = {
  applications: queryKeys.associationApplications,
  application: queryKeys.associationApplication,
} as const;
