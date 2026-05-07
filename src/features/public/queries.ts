import { queryKeys } from '@/lib/queryKeys';

export const publicQueryKeys = {
  platformSettings: queryKeys.publicPlatformSettings,
  associationsAll: queryKeys.publicAssociationsAll,
  associationsRegister: queryKeys.publicAssociationsRegister,
  associationsBrowse: queryKeys.publicAssociationsBrowse,
  languages: queryKeys.publicLanguages,
  licenceLookupSettings: queryKeys.publicLicenceLookupPlatformSettings,
} as const;
