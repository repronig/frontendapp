import { queryKeys } from '@/lib/queryKeys';

/** TanStack keys for auth / session routes (see also `queryKeys.currentUser`). */
export const authQueryKeys = {
  currentUser: queryKeys.currentUser,
  emailVerificationStatus: queryKeys.emailVerificationStatus,
  meNotificationPreferences: queryKeys.meNotificationPreferences,
  meTwoFactor: queryKeys.meTwoFactor,
  meSecurityActivity: queryKeys.meSecurityActivity,
} as const;
