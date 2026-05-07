import { queryKeys } from '@/lib/queryKeys';

/** Subset of keys used by admin feature screens; full list remains in `queryKeys`. */
export const adminPortalQueryKeys = {
  documents: queryKeys.adminDocuments,
  declarations: queryKeys.adminDeclarations,
  governanceInstitutions: queryKeys.adminGovernanceInstitutions,
  associations: queryKeys.adminAssociations,
  works: queryKeys.adminWorks,
  memberApps: queryKeys.adminMemberApps,
  members: queryKeys.adminMembers,
  institutions: queryKeys.adminInstitutions,
  invoices: queryKeys.adminInvoices,
  payments: queryKeys.adminPayments,
  licences: queryKeys.adminLicences,
  imports: queryKeys.adminImports,
  auditLogs: queryKeys.adminAuditLogs,
  termsAndConditions: queryKeys.termsAndConditions,
} as const;
