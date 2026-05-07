import { queryKeys } from '@/lib/queryKeys';

export const superAdminQueryKeys = {
  settings: queryKeys.superSettings,
  languages: queryKeys.superLanguages,
  roles: queryKeys.superRoles,
  permissions: queryKeys.superPermissions,
  users: queryKeys.superUsers,
  user: queryKeys.superUser,
  userTimeline: queryKeys.superUserTimeline,
  associations: queryKeys.superAssociations,
  association: queryKeys.superAssociation,
  associationTimeline: queryKeys.superAssociationTimeline,
  integrations: queryKeys.superIntegrations,
  integrationOutbox: queryKeys.superIntegrationOutbox,
  integrationOutboxSummary: queryKeys.superIntegrationOutboxSummary,
} as const;
