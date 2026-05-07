import { queryKeys } from '@/lib/queryKeys';

export const institutionPortalQueryKeys = {
  profile: queryKeys.institutionProfile,
  invoices: queryKeys.institutionInvoices,
  invoice: queryKeys.institutionInvoice,
  licences: queryKeys.institutionLicences,
  licence: queryKeys.institutionLicence,
  licencePayments: queryKeys.institutionLicencePayments,
  declarations: queryKeys.institutionDeclarations,
  declaration: queryKeys.institutionDeclaration,
} as const;
