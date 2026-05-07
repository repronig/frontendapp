import { queryKeys } from '@/lib/queryKeys';

export const memberPortalQueryKeys = {
  profile: queryKeys.memberProfile,
  profileStates: queryKeys.memberProfileStates,
  profileCities: queryKeys.memberProfileCities,
  works: queryKeys.memberWorks,
  work: queryKeys.memberWork,
} as const;
