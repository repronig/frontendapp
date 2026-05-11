import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom';
import { AdminSupportTicketsLegacyRedirect } from '@/features/admin/AdminSupportTicketsLegacyRedirect';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { PortalLayout } from '@/components/layout/PortalLayout';
import { LoadingState } from '@/components/shared/LoadingState';
import { AuthGuard } from '@/guards/AuthGuard';
import { GuestGuard } from '@/guards/GuestGuard';
import { PortalGuard } from '@/guards/PortalGuard';
import { RouteErrorPage } from '@/features/public/RouteErrorPage';
import { InstitutionRegisterPage } from '@/features/auth/InstitutionRegisterPage';
import { MemberRegisterPage } from '@/features/auth/MemberRegisterPage';

const PortalLoginPage = lazy(() => import('@/features/auth/PortalLoginPage').then((m) => ({ default: m.PortalLoginPage })));
const MemberConfirmOtpPage = lazy(() => import('@/features/auth/MemberConfirmOtpPage').then((m) => ({ default: m.MemberConfirmOtpPage })));
const InstitutionConfirmOtpPage = lazy(() => import('@/features/auth/InstitutionConfirmOtpPage').then((m) => ({ default: m.InstitutionConfirmOtpPage })));
const ForgotPasswordPage = lazy(() => import('@/features/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('@/features/auth/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })));
const VerifyEmailPage = lazy(() => import('@/features/auth/VerifyEmailPage').then((m) => ({ default: m.VerifyEmailPage })));
const TwoFactorPage = lazy(() => import('@/features/auth/TwoFactorPage').then((m) => ({ default: m.TwoFactorPage })));
const PublicAssociationsPage = lazy(() => import('@/features/public/PublicAssociationsPage').then((m) => ({ default: m.PublicAssociationsPage })));
const LicenceLookupPage = lazy(() => import('@/features/public/LicenceLookupPage').then((m) => ({ default: m.LicenceLookupPage })));
const UnauthorizedPage = lazy(() => import('@/features/public/UnauthorizedPage').then((m) => ({ default: m.UnauthorizedPage })));
const NotFoundPage = lazy(() => import('@/features/public/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));
const MemberHomePage = lazy(() => import('@/portals/member/HomePage').then((m) => ({ default: m.MemberHomePage })));
const AssociationHomePage = lazy(() => import('@/portals/association/HomePage').then((m) => ({ default: m.AssociationHomePage })));
const InstitutionHomePage = lazy(() => import('@/portals/institution/HomePage').then((m) => ({ default: m.InstitutionHomePage })));
const AdminHomePage = lazy(() => import('@/portals/admin/HomePage').then((m) => ({ default: m.AdminHomePage })));
const SuperAdminHomePage = lazy(() => import('@/portals/super-admin/HomePage').then((m) => ({ default: m.SuperAdminHomePage })));
const MemberApplicationPage = lazy(() => import('@/features/member-application/MemberApplicationPage').then((m) => ({ default: m.MemberApplicationPage })));
const MemberProfilePage = lazy(() => import('@/features/member-profile/MemberProfilePage').then((m) => ({ default: m.MemberProfilePage })));
const WorksPage = lazy(() => import('@/features/works/WorksPage').then((m) => ({ default: m.WorksPage })));
const MemberRecentActivityPage = lazy(() => import('@/features/member-activity/MemberRecentActivityPage').then((m) => ({ default: m.MemberRecentActivityPage })));
const AssociationApplicationsPage = lazy(() => import('@/features/association-review/AssociationApplicationsPage').then((m) => ({ default: m.AssociationApplicationsPage })));
const AssociationProfilePage = lazy(() => import('@/features/association/AssociationProfilePage').then((m) => ({ default: m.AssociationProfilePage })));
const AssociationRecentActivityPage = lazy(() => import('@/features/association/AssociationRecentActivityPage').then((m) => ({ default: m.AssociationRecentActivityPage })));
const InstitutionProfilePage = lazy(() => import('@/features/institution/InstitutionProfilePage').then((m) => ({ default: m.InstitutionProfilePage })));
const InstitutionDeclarationsPage = lazy(() => import('@/features/institution/InstitutionDeclarationsPage').then((m) => ({ default: m.InstitutionDeclarationsPage })));
const InstitutionInvoicesPage = lazy(() => import('@/features/institution/InstitutionInvoicesPage').then((m) => ({ default: m.InstitutionInvoicesPage })));
const InstitutionLicencesPage = lazy(() => import('@/features/institution/InstitutionLicencesPage').then((m) => ({ default: m.InstitutionLicencesPage })));
const InstitutionRecentActivitiesPage = lazy(() => import('@/features/institution/InstitutionRecentActivitiesPage').then((m) => ({ default: m.InstitutionRecentActivitiesPage })));
const AdminWorksPage = lazy(() => import('@/features/admin/AdminWorksPage').then((m) => ({ default: m.AdminWorksPage })));
const AdminDeclarationsPage = lazy(() => import('@/features/admin/AdminDeclarationsPage').then((m) => ({ default: m.AdminDeclarationsPage })));
const AdminFinancePage = lazy(() => import('@/features/admin/AdminFinancePage').then((m) => ({ default: m.AdminFinancePage })));
const AdminReportsPage = lazy(() => import('@/features/admin/AdminReportsPage').then((m) => ({ default: m.AdminReportsPage })));
const AdminPushNotificationsPage = lazy(() => import('@/features/admin/AdminPushNotificationsPage').then((m) => ({ default: m.AdminPushNotificationsPage })));
const AdminRecentActivitiesPage = lazy(() => import('@/features/admin/AdminRecentActivitiesPage').then((m) => ({ default: m.AdminRecentActivitiesPage })));
const AdminMembershipPage = lazy(() => import('@/features/admin/AdminMembershipPage').then((m) => ({ default: m.AdminMembershipPage })));
const AdminInstitutionsPage = lazy(() => import('@/features/admin/AdminInstitutionsPage').then((m) => ({ default: m.AdminInstitutionsPage })));
const AdminLicensingOpsPage = lazy(() => import('@/features/admin/AdminLicensingOpsPage').then((m) => ({ default: m.AdminLicensingOpsPage })));
const AdminAuditLogsPage = lazy(() => import('@/features/admin/AdminAuditLogsPage').then((m) => ({ default: m.AdminAuditLogsPage })));
const AdminImportsPage = lazy(() => import('@/features/admin/AdminImportsPage').then((m) => ({ default: m.AdminImportsPage })));
const AdminDocumentUploadPage = lazy(() => import('@/features/admin/AdminDocumentUploadPage').then((m) => ({ default: m.AdminDocumentUploadPage })));
const AdminGovernancePage = lazy(() => import('@/features/admin/AdminGovernancePage').then((m) => ({ default: m.AdminGovernancePage })));
const AdminTermsAndConditionsPage = lazy(() => import('@/features/admin/AdminTermsAndConditionsPage').then((m) => ({ default: m.AdminTermsAndConditionsPage })) );
const AdminDetailPage = lazy(() => import('@/features/admin/AdminDetailPage').then((m) => ({ default: m.AdminDetailPage })));
const SuperAssociationsPage = lazy(() => import('@/features/super-admin/SuperAssociationsPage').then((m) => ({ default: m.SuperAssociationsPage })));
const SuperUsersPage = lazy(() => import('@/features/super-admin/SuperUsersPage').then((m) => ({ default: m.SuperUsersPage })));
const SuperRolesPage = lazy(() => import('@/features/super-admin/SuperRolesPage').then((m) => ({ default: m.SuperRolesPage })));
const SuperSettingsPage = lazy(() => import('@/features/super-admin/SuperSettingsPage').then((m) => ({ default: m.SuperSettingsPage })));
const SuperIntegrationsPage = lazy(() => import('@/features/super-admin/SuperIntegrationsPage').then((m) => ({ default: m.SuperIntegrationsPage })));
const NotificationsPage = lazy(() => import('@/features/notifications/NotificationsPage').then((m) => ({ default: m.NotificationsPage })));
const UserSettingsPage = lazy(() => import('@/features/settings/UserSettingsPage').then((m) => ({ default: m.UserSettingsPage })));
const SupportTicketsListPage = lazy(() => import('@/features/support/SupportTicketsListPage').then((m) => ({ default: m.SupportTicketsListPage })));
const SupportTicketNewPage = lazy(() => import('@/features/support/SupportTicketNewPage').then((m) => ({ default: m.SupportTicketNewPage })));
const SupportTicketDetailPage = lazy(() => import('@/features/support/SupportTicketDetailPage').then((m) => ({ default: m.SupportTicketDetailPage })));
const AdminSupportTicketsPage = lazy(() => import('@/features/admin/AdminSupportTicketsPage').then((m) => ({ default: m.AdminSupportTicketsPage })));

function withSuspense(element: React.ReactNode) {
  return <Suspense fallback={<LoadingState />}>{element}</Suspense>;
}

type AdminSupportRouteMode = 'full' | 'legacy-redirect-only';

/** Child routes shared between `/admin` and `/super-admin` (after each portal’s home and super-only entries). */
function sharedAdminPortalChildRoutes(
  membershipVariant: 'default' | 'members_initial',
  supportRouteMode: AdminSupportRouteMode = 'full',
): RouteObject[] {
  const membershipElement =
    membershipVariant === 'members_initial' ? (
      <AdminMembershipPage initialTab="members" />
    ) : (
      <AdminMembershipPage />
    );

  const supportRoutes: RouteObject[] =
    supportRouteMode === 'full'
      ? [
          { path: 'support', element: withSuspense(<AdminSupportTicketsPage />) },
          { path: 'support/:ticketId', element: withSuspense(<AdminSupportTicketsPage />) },
          { path: 'support-tickets', element: <Navigate to="/admin/support" replace /> },
          { path: 'support-tickets/:ticketId', element: withSuspense(<AdminSupportTicketsLegacyRedirect />) },
        ]
      : [
          { path: 'support-tickets', element: <Navigate to="/admin/support" replace /> },
          { path: 'support-tickets/:ticketId', element: withSuspense(<AdminSupportTicketsLegacyRedirect />) },
        ];

  return [
    { path: 'works', element: withSuspense(<AdminWorksPage />) },
    { path: 'membership', element: withSuspense(membershipElement) },
    { path: 'institutions', element: withSuspense(<AdminInstitutionsPage />) },
    { path: 'member-applications/:id', element: withSuspense(<AdminDetailPage resource="member-applications" />) },
    { path: 'members/:id', element: withSuspense(<AdminDetailPage resource="members" />) },
    { path: 'institutions/:id', element: withSuspense(<AdminDetailPage resource="institutions" />) },
    { path: 'declarations', element: withSuspense(<AdminDeclarationsPage />) },
    { path: 'licensing', element: withSuspense(<AdminLicensingOpsPage />) },
    { path: 'licences/:id', element: withSuspense(<AdminDetailPage resource="licences" />) },
    { path: 'payments/:id', element: withSuspense(<AdminDetailPage resource="payments" />) },
    { path: 'usage-declarations/:id', element: withSuspense(<AdminDetailPage resource="usage-declarations" />) },
    { path: 'finance', element: withSuspense(<AdminFinancePage />) },
    { path: 'imports', element: withSuspense(<AdminImportsPage />) },
    { path: 'recent-activities', element: withSuspense(<AdminRecentActivitiesPage />) },
    { path: 'audit-logs', element: withSuspense(<AdminAuditLogsPage />) },
    { path: 'audit-logs/:id', element: withSuspense(<AdminDetailPage resource="audit-logs" />) },
    { path: 'governance', element: withSuspense(<AdminGovernancePage />) },
    { path: 'document-upload', element: withSuspense(<AdminDocumentUploadPage />) },
    { path: 'terms-and-conditions', element: withSuspense(<AdminTermsAndConditionsPage />) },
    { path: 'reports', element: withSuspense(<AdminReportsPage />) },
    ...supportRoutes,
    { path: 'push-notifications', element: withSuspense(<AdminPushNotificationsPage />) },
    { path: 'notifications', element: withSuspense(<NotificationsPage />) },
  ];
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/member/login" replace />,
    errorElement: <RouteErrorPage />,
  },
  {
    errorElement: <RouteErrorPage />,
    element: <GuestGuard />,
    children: [
      {
        element: <PublicLayout />,
        children: [
          { path: '/member/login', element: withSuspense(<PortalLoginPage portal="member" />) },
          { path: '/association/login', element: withSuspense(<PortalLoginPage portal="association" />) },
          { path: '/institution/login', element: withSuspense(<PortalLoginPage portal="institution" />) },
          { path: '/admin/login', element: withSuspense(<PortalLoginPage portal="admin" />) },
          { path: '/super-admin/login', element: withSuspense(<PortalLoginPage portal="super_admin" />) },
          { path: '/member/register', element: <MemberRegisterPage /> },
          { path: '/member/confirm-otp', element: withSuspense(<MemberConfirmOtpPage />) },
          { path: '/institution/register', element: <InstitutionRegisterPage /> },
          { path: '/institution/confirm-otp', element: withSuspense(<InstitutionConfirmOtpPage />) },
          { path: '/forgot-password', element: withSuspense(<ForgotPasswordPage />) },
          { path: '/reset-password', element: withSuspense(<ResetPasswordPage />) },
          { path: '/two-factor', element: withSuspense(<TwoFactorPage />) },
          { path: '/associations', element: withSuspense(<PublicAssociationsPage />) },
          { path: '/licence-lookup', element: withSuspense(<LicenceLookupPage />) },
        ],
      },
    ],
  },
  {
    errorElement: <RouteErrorPage />,
    element: <AuthGuard />,
    children: [
      { path: '/verify-email', element: withSuspense(<VerifyEmailPage />) },
      { path: '/verify-email/:id/:hash', element: withSuspense(<VerifyEmailPage />) },
      { path: '/unauthorized', element: withSuspense(<UnauthorizedPage />) },
      {
        element: <PortalGuard portal="member" />,
        children: [
          {
            path: '/member',
            element: <PortalLayout portal="member" title="Member Portal" />,
            children: [
              { index: true, element: withSuspense(<MemberHomePage />) },
              { path: 'onboarding', element: withSuspense(<MemberApplicationPage />) },
              { path: 'profile', element: withSuspense(<MemberProfilePage />) },
              { path: 'works', element: withSuspense(<WorksPage />) },
              { path: 'recent-activity', element: withSuspense(<MemberRecentActivityPage />) },
              { path: 'support', element: withSuspense(<SupportTicketsListPage portalContext="member" />) },
              { path: 'support/new', element: withSuspense(<SupportTicketNewPage portalContext="member" />) },
              { path: 'support/:ticketId', element: withSuspense(<SupportTicketDetailPage portalContext="member" />) },
              { path: 'notifications', element: withSuspense(<NotificationsPage />) },
              { path: 'settings', element: withSuspense(<UserSettingsPage />) },
            ],
          },
        ],
      },
      {
        element: <PortalGuard portal="association" />,
        children: [
          {
            path: '/association',
            element: <PortalLayout portal="association" title="Association Portal" />,
            children: [
              { index: true, element: withSuspense(<AssociationHomePage />) },
              { path: 'profile', element: withSuspense(<AssociationProfilePage />) },
              { path: 'applications', element: withSuspense(<AssociationApplicationsPage />) },
              { path: 'recent-activity', element: withSuspense(<AssociationRecentActivityPage />) },
              { path: 'support', element: withSuspense(<SupportTicketsListPage portalContext="association" />) },
              { path: 'support/new', element: withSuspense(<SupportTicketNewPage portalContext="association" />) },
              { path: 'support/:ticketId', element: withSuspense(<SupportTicketDetailPage portalContext="association" />) },
              { path: 'notifications', element: withSuspense(<NotificationsPage />) },
              { path: 'settings', element: withSuspense(<UserSettingsPage />) },
            ],
          },
        ],
      },
      {
        element: <PortalGuard portal="institution" />,
        children: [
          {
            path: '/institution',
            element: <PortalLayout portal="institution" title="Institution Portal" />,
            children: [
              { index: true, element: withSuspense(<InstitutionHomePage />) },
              { path: 'onboarding', element: withSuspense(<InstitutionProfilePage />) },
              { path: 'declarations', element: withSuspense(<InstitutionDeclarationsPage />) },
              { path: 'recent-activities', element: withSuspense(<InstitutionRecentActivitiesPage />) },
              { path: 'support', element: withSuspense(<SupportTicketsListPage portalContext="institution" />) },
              { path: 'support/new', element: withSuspense(<SupportTicketNewPage portalContext="institution" />) },
              { path: 'support/:ticketId', element: withSuspense(<SupportTicketDetailPage portalContext="institution" />) },
              { path: 'invoices', element: withSuspense(<InstitutionInvoicesPage />) },
              { path: 'licences', element: withSuspense(<InstitutionLicencesPage />) },
              { path: 'notifications', element: withSuspense(<NotificationsPage />) },
              { path: 'settings', element: withSuspense(<UserSettingsPage />) },
            ],
          },
        ],
      },
      {
        element: <PortalGuard portal="admin" />,
        children: [
          {
            path: '/admin',
            element: <PortalLayout portal="admin" title="Admin Portal" />,
            children: [
              { index: true, element: withSuspense(<AdminHomePage />) },
              ...sharedAdminPortalChildRoutes('default'),
              { path: 'settings', element: withSuspense(<UserSettingsPage />) },
            ],
          },
        ],
      },
      {
        element: <PortalGuard portal="super_admin" />,
        children: [
          {
            path: '/super-admin',
            element: <PortalLayout portal="super_admin" title="Super Admin Portal" />,
            children: [
              { index: true, element: withSuspense(<SuperAdminHomePage />) },
              { path: 'associations', element: withSuspense(<SuperAssociationsPage />) },
              { path: 'users', element: withSuspense(<SuperUsersPage />) },
              { path: 'roles', element: withSuspense(<SuperRolesPage />) },
              { path: 'integrations', element: withSuspense(<SuperIntegrationsPage />) },
              { path: 'settings', element: withSuspense(<SuperSettingsPage />) },
              { path: 'account-settings', element: withSuspense(<UserSettingsPage />) },
              ...sharedAdminPortalChildRoutes('members_initial', 'legacy-redirect-only'),
            ],
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: withSuspense(<NotFoundPage />),
    errorElement: <RouteErrorPage />,
  },
]);
