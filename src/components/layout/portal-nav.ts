import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Bell,
  Building2,
  FileBadge2,
  FileCheck2,
  FileText,
  FilePlus2,
  FolderOpen,
  Cable,
  Home,
  Receipt,
  Scale,
  Settings,
  Shield,
  Users,
  UserCog,
} from 'lucide-react';
import type { PortalKey } from '@/types/domain';

export interface PortalNavItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

const adminNav: PortalNavItem[] = [
  { label: 'Dashboard', to: '/admin', icon: Home },
  { label: 'Memberships', to: '/admin/membership', icon: Users },
  { label: 'Repertoire', to: '/admin/works', icon: FolderOpen },
  { label: 'Institutions', to: '/admin/institutions', icon: Building2 },
  { label: 'Declarations', to: '/admin/declarations', icon: FileBadge2 },
  { label: 'Licensing Ops', to: '/admin/licensing', icon: Scale },
  { label: 'Finance', to: '/admin/finance', icon: Receipt },
  { label: 'Recent Activities', to: '/admin/recent-activities', icon: Shield },
  { label: 'Audit Logs', to: '/admin/audit-logs', icon: Shield },
  { label: 'Governance', to: '/admin/governance', icon: Building2 },
  { label: 'Documents', to: '/admin/document-upload', icon: FilePlus2 },
  { label: 'Terms and Conditions', to: '/admin/terms-and-conditions', icon: FileText },
  { label: 'Reports', to: '/admin/reports', icon: BarChart3 },
  { label: 'Push Notifications', to: '/admin/push-notifications', icon: Bell },
];

const superAdminOpsNav: PortalNavItem[] = adminNav.map((item) => ({
  ...item,
  to: item.to.replace('/admin', '/super-admin'),
}));

const superAdminOpsByLabel = Object.fromEntries(superAdminOpsNav.map((item) => [item.label, item])) as Record<string, PortalNavItem>;

/** Super-only routes (not mirrored from admin ops nav). */
const superAdminExclusiveNav: Record<string, PortalNavItem> = {
  Associations: { label: 'Associations', to: '/super-admin/associations', icon: Building2 },
  Users: { label: 'Users', to: '/super-admin/users', icon: UserCog },
  Roles: { label: 'Roles', to: '/super-admin/roles', icon: Shield },
  Integrations: { label: 'Integrations', to: '/super-admin/integrations', icon: Cable },
  'Account Settings': { label: 'Account Settings', to: '/super-admin/account-settings', icon: UserCog },
  'Platform Settings': { label: 'Platform Settings', to: '/super-admin/settings', icon: Settings },
};

function superAdminNavItem(label: string): PortalNavItem {
  const item = superAdminExclusiveNav[label] ?? superAdminOpsByLabel[label];
  if (!item) {
    throw new Error(`Super admin nav: missing item "${label}"`);
  }
  return item;
}

const superAdminNavOrderedLabels = [
  'Dashboard',
  'Memberships',
  'Repertoire',
  'Declarations',
  'Licensing Ops',
  'Finance',
  'Reports',
  'Push Notifications',
  'Institutions',
  'Associations',
  'Users',
  'Roles',
  'Documents',
  'Governance',
  'Integrations',
  'Account Settings',
  'Platform Settings',
  'Recent Activities',
  'Audit Logs',
  'Terms and Conditions',
] as const;

const superAdminNav: PortalNavItem[] = superAdminNavOrderedLabels.map((label) => superAdminNavItem(label));

export const portalNav: Record<PortalKey, PortalNavItem[]> = {
  member: [
    { label: 'Dashboard', to: '/member', icon: Home },
    { label: 'My Application', to: '/member/onboarding', icon: FileCheck2 },
    { label: 'My Profile', to: '/member/profile', icon: Users },
    { label: 'My Works', to: '/member/works', icon: FolderOpen },
    { label: 'Recent Activity', to: '/member/recent-activity', icon: BarChart3 },
  ],
  association: [
    { label: 'Dashboard', to: '/association', icon: Home },
    { label: 'Profile', to: '/association/profile', icon: Building2 },
    { label: 'Applications', to: '/association/applications', icon: FileCheck2 },
    { label: 'Recent Activity', to: '/association/recent-activity', icon: BarChart3 },
  ],
  institution: [
    { label: 'Dashboard', to: '/institution', icon: Home },
    { label: 'Onboarding', to: '/institution/onboarding', icon: Building2 },
    { label: 'Declarations', to: '/institution/declarations', icon: FileBadge2 },
    { label: 'Invoices', to: '/institution/invoices', icon: Receipt },
    { label: 'Licences', to: '/institution/licences', icon: Scale },
    { label: 'Recent Activities', to: '/institution/recent-activities', icon: BarChart3 },
  ],
  admin: adminNav,
  super_admin: superAdminNav,
};
