import { queryKeys } from '@/lib/queryKeys';

/** Member portal works list/detail (canonical keys also under `memberPortalQueryKeys`). */
export const worksQueryKeys = {
  list: queryKeys.memberWorks,
  detail: queryKeys.memberWork,
} as const;
