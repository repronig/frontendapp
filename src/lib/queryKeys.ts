/**
 * Canonical TanStack Query keys for cache reads, writes, and invalidations.
 * Prefer importing from here (or feature-local re-exports) over string literals.
 *
 * Note: {@link usePaginatedList} appends the request `params` object to the key;
 * pass only the human-readable prefix dimensions here.
 */
export const queryKeys = {
  currentUser: ['current-user'] as const,

  notifications: ['notifications'] as const,
  /** Portal shell notification dropdown (distinct from the paged inbox query). */
  notificationsDropdown: ['notifications', 'dropdown'] as const,
  notificationsUnreadCount: ['notifications-unread-count'] as const,

  memberApplicationMe: ['member-application', 'me'] as const,

  institutionProfile: ['institution-profile'] as const,

  publicPlatformSettings: ['public-platform-settings'] as const,
  publicAssociationsAll: ['public-associations', 'all'] as const,
  publicAssociationsRegister: ['public-associations', 'register'] as const,
  publicLanguages: ['public-languages'] as const,

  meNotificationPreferences: ['me-notification-preferences'] as const,
  meTwoFactor: ['me-two-factor'] as const,
  meSecurityActivity: ['me-security-activity'] as const,

  states: ['states'] as const,
  citiesForState: (stateId: number | null) => ['cities', stateId] as const,

  /** Terms keyed by portal audience only (e.g. registration agreement). */
  activeTermsAudience: (audience: string) => ['active-terms', audience] as const,
  activeTermsMemberMandate: ['active-terms', 'member', 'mandate'] as const,
  activeTermsMemberWorkAgreement: ['active-terms', 'member', 'work-agreement'] as const,

  memberProfile: ['member-profile'] as const,
  memberProfileStates: ['locations', 'states', 'member-profile'] as const,
  memberProfileCities: (stateId: number | null) => ['locations', 'cities', stateId, 'member-profile'] as const,

  memberWorks: ['member-works'] as const,
  memberWork: (id: number | string | null | undefined) => ['member-work', id] as const,

  institutionInvoices: ['institution-invoices'] as const,
  institutionInvoice: (id: number | null) => ['institution-invoice', id] as const,
  institutionLicences: ['institution-licences'] as const,
  institutionLicence: (id: number | null) => ['institution-licence', id] as const,
  institutionLicencePayments: (id: number | null) => ['institution-licence-payments', id] as const,
  institutionDeclarations: ['institution-declarations'] as const,
  institutionDeclaration: (id: number | null) => ['institution-declaration', id] as const,

  associationApplications: ['association-applications'] as const,
  associationApplication: (id: number | null) => ['association-application', id] as const,
  associationProfile: ['association-profile'] as const,
  associationDashboardApplication: (id: number | null) => ['association-dashboard-application', id] as const,

  dashboardMeSummary: ['dashboard', 'me-summary'] as const,
  dashboardAssociation: ['dashboard', 'association'] as const,
  dashboardInstitution: ['dashboard', 'institution'] as const,
  dashboardAdminSummary: ['dashboard', 'admin-summary'] as const,
  dashboardSuperAdminSummary: ['dashboard', 'super-admin-summary'] as const,
  dashboardAdminFinanceSummary: ['dashboard', 'admin-finance-summary'] as const,

  adminDeclarations: ['admin-declarations'] as const,
  adminDeclaration: (id: number | null) => ['admin-declaration', id] as const,
  adminGovernanceInstitutions: ['admin-governance-institutions'] as const,
  adminAssociations: ['admin-associations'] as const,
  adminInstitution: (id: number | null) => ['admin-institution', id] as const,
  adminInstitutionDeclarations: (id: number | null) => ['admin-institution-declarations', id] as const,
  adminInstitutionInvoices: (id: number | null) => ['admin-institution-invoices', id] as const,
  adminGovernanceAssociationApps: (id: number | null) => ['admin-governance-association-apps', id] as const,
  adminAssociation: (id: number | null) => ['admin-association', id] as const,

  adminTimeline: (resource: string, id: number | null) => ['admin-timeline', resource, id] as const,

  adminMemberApps: ['admin-member-apps'] as const,
  adminMembers: ['admin-members'] as const,
  adminInstitutions: ['admin-institutions'] as const,
  adminMemberApp: (id: number | null) => ['admin-member-app', id] as const,
  adminMember: (id: number | null) => ['admin-member', id] as const,
  adminMemberTimeline: (id: number | null) => ['admin-member-timeline', id] as const,
  adminInstitutionTimeline: (id: number | null) => ['admin-institution-timeline', id] as const,

  /** Admin standalone document-upload page (`DocumentManager` list/invalidate root). */
  adminDocuments: ['admin-documents'] as const,

  portalSupportTickets: ['portal-support-tickets'] as const,
  portalSupportTicket: (id: number | null) => ['portal-support-ticket', id] as const,

  adminSupportTickets: ['admin-support-tickets'] as const,
  adminSupportTicket: (id: number | null) => ['admin-support-ticket', id] as const,

  adminWorks: ['admin-works'] as const,
  /** Prefix for invalidating every admin work detail query. */
  adminWorkRoot: ['admin-work'] as const,
  adminWork: (id: number | null) => ['admin-work', id] as const,

  adminInvoices: ['admin-invoices'] as const,
  adminPayments: ['admin-payments'] as const,
  adminLicences: ['admin-licences'] as const,
  adminFeePlans: ['admin-fee-plans'] as const,
  adminImports: ['admin-imports'] as const,
  adminAuditLogs: ['admin-audit-logs'] as const,
  adminInvoice: (id: number | null) => ['admin-invoice', id] as const,
  adminPayment: (id: number | null) => ['admin-payment', id] as const,
  adminLicence: (id: number | null) => ['admin-licence', id] as const,
  adminAuditLog: (id: number | null) => ['admin-audit-log', id] as const,

  /** Licensing ops module lists (distinct query roots from finance). */
  adminLicencesPage: ['admin-licences-page'] as const,
  adminPaymentsPage: ['admin-payments-page'] as const,
  adminLicencePage: (id: number | null) => ['admin-licence-page', id] as const,
  adminPaymentPage: (id: number | null) => ['admin-payment-page', id] as const,

  termsAndConditions: ['terms-and-conditions'] as const,

  superSettings: ['super-settings'] as const,
  superLanguages: ['super-languages'] as const,
  superRoles: ['super-roles'] as const,
  superPermissions: ['super-permissions'] as const,
  superUsers: ['super-users'] as const,
  superUser: (id: number | null) => ['super-user', id] as const,
  superUserTimeline: (id: number | null) => ['super-user-timeline', id] as const,
  superAssociations: ['super-associations'] as const,
  superAssociation: (id: number | null) => ['super-association', id] as const,
  superAssociationTimeline: (id: number | null) => ['super-association-timeline', id] as const,

  superIntegrations: ['super', 'integrations'] as const,
  superIntegrationOutbox: ['super', 'integrations', 'outbox'] as const,
  superIntegrationOutboxSummary: ['super', 'integrations', 'outbox', 'summary'] as const,

  /** Super dashboard widget — distinct from integrations page summary. */
  superDashboardIntegrationOutboxSummary: ['super-integration-outbox-summary'] as const,

  adminDetail: (resource: string, id: number) => ['admin-detail', resource, id] as const,

  /** Standalone imports list page (distinct root from finance `adminImports`). */
  adminImportsPage: ['admin-imports-page'] as const,

  adminAuditPage: ['admin-audit-page'] as const,
  adminAuditPageDetail: (id: number | null) => ['admin-audit-page-detail', id] as const,

  adminRecentActivities: ['admin-recent-activities'] as const,
  adminRecentActivityDetail: (id: number | null) => ['admin-recent-activity-detail', id] as const,

  adminBoardSummary: ['admin-board-summary'] as const,
  adminMemberReport: ['admin-member-report'] as const,
  adminWorkReport: ['admin-work-report'] as const,
  adminCompletenessReport: ['admin-completeness-report'] as const,
  adminLicenceReport: ['admin-licence-report'] as const,

  adminWipoOutbox: (subject: string, subjectId: string | number) => ['admin-wipo-outbox', subject, subjectId] as const,

  /** Public licence lookup uses a tuple root distinct from {@link queryKeys.publicPlatformSettings}. */
  publicLicenceLookupPlatformSettings: ['public', 'platform-settings'] as const,

  /** Public associations browser (search-scoped cache). */
  publicAssociationsBrowse: ['public-associations'] as const,

  emailVerificationStatus: ['email-verification-status'] as const,
  otpVerificationStatus: ['email-verification-status'] as const,
};

/** Paged/filtered notifications inbox (`NotificationsPage`). */
export function notificationsInboxQueryKey(page: number, perPage: number, activeFilter: string) {
  return [...queryKeys.notifications, 'page', page, 'perPage', perPage, activeFilter] as const;
}
