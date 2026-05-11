import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Camera, Clock3, KeyRound, ShieldAlert, ShieldCheck, ShieldEllipsis, Upload } from 'lucide-react';
import { toast } from 'sonner';
import {
  changePassword,
  disableTwoFactor,
  enableTwoFactor,
  getNotificationPreferences,
  getSecurityActivity,
  getTwoFactorStatus,
  updateMe,
  updateNotificationPreferences,
  uploadMyAvatar,
  removeMyAvatar,
  type ChangePasswordPayload,
  type UpdateMePayload,
} from '@/features/auth/api';
import { normalizeApiError } from '@/api/error';
import { onMutationApiError, toastApiError } from '@/lib/mutationFeedback';
import { queryKeys } from '@/lib/queryKeys';
import { getInstitutionProfile, removeInstitutionLogo } from '@/features/institution/api';
import { FormField } from '@/components/shared/FormField';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuthStore } from '@/store/auth.store';
import type { NotificationPreference } from '@/types/domain';
import { formatDate, formatDateTime, formatRelativeTime, humanizeActivityLabel } from '@/utils/format';
import { resolveFileUrl } from '@/utils/fileUrl';
import {
  changePasswordSchema,
  updateProfileBasicsSchema,
  type ChangePasswordFormValues,
  type UpdateProfileBasicsFormValues,
} from '@/features/settings/schemas';
import type { TwoFactorStatus } from '@/types/domain';

function toProfileForm(name: string, phone?: string | null): UpdateMePayload {
  const nameParts = name.split(' ').filter(Boolean);
  return {
    first_name: nameParts.slice(0, -1).join(' ') || name,
    last_name: nameParts.slice(-1).join('') || '',
    phone: phone ?? '',
  };
}

function toPreferenceKey(item: NotificationPreference) {
  return `${item.event_key}:${item.channel}`;
}

/** Human-readable group titles for taxonomy keys (settings + privileged full list). */
const TAXONOMY_GROUP_LABELS: Record<string, string> = {
  account_security: 'Account security',
  application_updates: 'Application updates',
  work_reviews: 'Work and repertoire reviews',
  licensing_updates: 'Licensing and declarations',
  payment_updates: 'Payments',
  approval_updates: 'Approvals and governance',
  general_announcements: 'General announcements',
  document_updates: 'Documents and uploads',
  support_updates: 'Support desk',
};

function SecuritySummaryCard({ title, value, hint, tone = 'neutral' }: { title: string; value: string; hint?: string; tone?: 'neutral' | 'good' | 'warning' }) {
  const toneClass = tone === 'good'
    ? 'border-[#D1FADF] bg-[#ECFDF3] dark:border-emerald-900 dark:bg-emerald-950/40'
    : tone === 'warning'
      ? 'border-[#FDE68A] bg-[#FFFBEB] dark:border-amber-900 dark:bg-amber-950/40'
      : 'border-[#D6E6FF] bg-[#F4F8FF] dark:border-slate-800 dark:bg-slate-900';

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#64748B] dark:text-slate-400">{title}</p>
      <p className="mt-2 text-lg font-semibold text-[#0F172A] dark:text-slate-50 dark:text-slate-100">{value}</p>
      {hint ? <p className="mt-1 text-sm text-[#475569] dark:text-slate-300">{hint}</p> : null}
    </div>
  );
}


function formatDeviceMeta(browser?: string | null, operatingSystem?: string | null, deviceType?: string | null) {
  return [browser, operatingSystem, deviceType ? deviceType.charAt(0).toUpperCase() + deviceType.slice(1) : null].filter(Boolean).join(' · ');
}

function protectionTone(isHealthy: boolean): 'good' | 'warning' {
  return isHealthy ? 'good' : 'warning';
}


function SecurityStatePanel({
  title,
  description,
  tone = 'neutral',
}: {
  title: string;
  description: string;
  tone?: 'neutral' | 'warning';
}) {
  const palette = tone === 'warning'
    ? 'border-[#FDE68A] bg-[#FFFBEB] text-[#92400E] dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200'
    : 'border-[#D6E6FF] bg-[#F4F8FF] text-[#1D4ED8] dark:border-slate-700 dark:bg-slate-900 dark:text-sky-300';

  return (
    <div className={`rounded-2xl border px-4 py-3 ${palette}`}>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-sm">{description}</p>
    </div>
  );
}


export function UserSettingsPage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.currentUser);
  const setCurrentUser = useAuthStore((state) => state.setCurrentUser);
  const isInstitutionUser = Boolean(currentUser?.role_summary.is_institution_user && currentUser?.portal_access.institution);
  const isPrivilegedUser = Boolean(currentUser?.role_summary.is_admin || currentUser?.role_summary.is_super_admin);
  const isMemberUser = Boolean(currentUser?.role_summary.is_member && currentUser?.portal_access.member);
  const isAssociationUser = Boolean(currentUser?.role_summary.is_association_officer && currentUser?.portal_access.association);

  const profileBasicsForm = useForm<UpdateProfileBasicsFormValues>({
    resolver: zodResolver(updateProfileBasicsSchema) as Resolver<UpdateProfileBasicsFormValues>,
    defaultValues: toProfileForm(currentUser?.user.name ?? '', currentUser?.user.phone),
  });
  const passwordForm = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema) as Resolver<ChangePasswordFormValues>,
    defaultValues: { current_password: '', new_password: '', new_password_confirmation: '' },
  });
  const [preferences, setPreferences] = useState<Record<string, boolean>>({});
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const notificationPreferencesQuery = useQuery({ queryKey: queryKeys.meNotificationPreferences, queryFn: async () => (await getNotificationPreferences()).data });
  const twoFactorQuery = useQuery({ queryKey: queryKeys.meTwoFactor, queryFn: async () => (await getTwoFactorStatus()).data, enabled: isPrivilegedUser });
  const securityActivityQuery = useQuery({ queryKey: queryKeys.meSecurityActivity, queryFn: async () => (await getSecurityActivity()).data, enabled: isPrivilegedUser });
  const institutionProfileQuery = useQuery({ queryKey: queryKeys.institutionProfile, queryFn: async () => (await getInstitutionProfile()).data, enabled: isInstitutionUser });

  useEffect(() => {
    if (!currentUser?.user) return;
    profileBasicsForm.reset(toProfileForm(currentUser.user.name, currentUser.user.phone));
  }, [currentUser?.user]);

  useEffect(() => {
    if (!notificationPreferencesQuery.data) return;
    setPreferences(notificationPreferencesQuery.data.reduce<Record<string, boolean>>((acc, item) => {
      acc[toPreferenceKey(item)] = item.enabled;
      return acc;
    }, {}));
  }, [notificationPreferencesQuery.data]);

  const profileMutation = useMutation({
    mutationFn: updateMe,
    onSuccess: (response) => {
      profileBasicsForm.clearErrors();
      if (currentUser) setCurrentUser({ ...currentUser, user: { ...currentUser.user, ...response.data } });
      queryClient.invalidateQueries({ queryKey: queryKeys.meSecurityActivity });
      toast.success('Your profile settings have been updated.');
    },
    onError: (error) => {
      const api = normalizeApiError(error);
      for (const key of ['first_name', 'last_name', 'phone'] as const) {
        const raw = api.errors?.[key];
        const msg = Array.isArray(raw) ? raw[0] : typeof raw === 'string' ? raw : undefined;
        if (typeof msg === 'string' && msg.trim()) {
          profileBasicsForm.setError(key, { type: 'server', message: msg.trim() });
        }
      }
      toastApiError(error);
    },
  });

  const avatarMutation = useMutation({
    mutationFn: uploadMyAvatar,
    onSuccess: (response) => {
      if (currentUser) setCurrentUser({ ...currentUser, user: { ...currentUser.user, ...response.data } });
      setAvatarFile(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.currentUser });
      toast.success('Profile picture updated successfully.');
    },
    onError: onMutationApiError(),
  });

  const removeAvatarMutation = useMutation({
    mutationFn: removeMyAvatar,
    onSuccess: (response) => {
      if (currentUser) setCurrentUser({ ...currentUser, user: { ...currentUser.user, ...response.data } });
      setAvatarFile(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.currentUser });
      toast.success('Profile picture removed successfully.');
    },
    onError: onMutationApiError(),
  });

  const removeInstitutionLogoMutation = useMutation({
    mutationFn: removeInstitutionLogo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.institutionProfile });
      queryClient.invalidateQueries({ queryKey: queryKeys.currentUser });
      toast.success('Institution logo removed successfully.');
    },
    onError: onMutationApiError(),
  });

  const passwordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      passwordForm.reset({ current_password: '', new_password: '', new_password_confirmation: '' });
      queryClient.invalidateQueries({ queryKey: queryKeys.meSecurityActivity });
      toast.success('Password changed successfully.');
    },
    onError: onMutationApiError(),
  });

  const preferencesMutation = useMutation({
    mutationFn: async () => {
      const payload = (notificationPreferencesQuery.data ?? []).map((item) => ({
        ...item,
        enabled: preferences[toPreferenceKey(item)] ?? item.enabled,
      }));
      return updateNotificationPreferences({ preferences: payload });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.meNotificationPreferences });
      toast.success('Notification preferences saved.');
    },
    onError: onMutationApiError(),
  });

  const twoFactorMutation = useMutation({
    mutationFn: async () => {
      const envelope = twoFactorQuery.data?.requires_two_factor ? await disableTwoFactor() : await enableTwoFactor();
      return envelope.data;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.meTwoFactor });
      const previous = queryClient.getQueryData<TwoFactorStatus>(queryKeys.meTwoFactor);
      if (previous) {
        queryClient.setQueryData<TwoFactorStatus>(queryKeys.meTwoFactor, {
          ...previous,
          requires_two_factor: !previous.requires_two_factor,
        });
      }
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(queryKeys.meTwoFactor, context.previous);
      }
      toastApiError(error);
    },
    onSuccess: (status) => {
      queryClient.setQueryData(queryKeys.meTwoFactor, status);
      queryClient.invalidateQueries({ queryKey: queryKeys.meSecurityActivity });
      queryClient.invalidateQueries({ queryKey: queryKeys.currentUser });
      toast.success(status.requires_two_factor ? 'Two-factor authentication enabled.' : 'Two-factor authentication disabled.');
    },
    onSettled: (_data, error) => {
      if (error) queryClient.invalidateQueries({ queryKey: queryKeys.meTwoFactor });
    },
  });

  const preferenceGroups = useMemo(() => {
    const simplifiedPreferenceConfig: Record<string, { allowedKeys: Set<string>; labelMap: Record<string, string> }> = {
      member: {
        allowedKeys: new Set(['application_updates', 'payment_updates', 'approval_updates', 'general_announcements', 'support_updates']),
        labelMap: {
          application_updates: 'Application updates',
          payment_updates: 'Payment updates',
          approval_updates: 'Approval and rejection updates',
          general_announcements: 'General announcements',
          support_updates: 'Support tickets (your requests and replies from REPRONIG)',
        },
      },
      institution: {
        allowedKeys: new Set(['licensing_updates', 'payment_updates', 'document_updates', 'general_announcements', 'support_updates']),
        labelMap: {
          licensing_updates: 'Licensing and invoice updates (generated, due, overdue)',
          payment_updates: 'Payment updates (initiated, received, offline decisions)',
          document_updates: 'Document updates',
          general_announcements: 'General announcements',
          support_updates: 'Support tickets (your requests and replies from REPRONIG)',
        },
      },
      association: {
        allowedKeys: new Set(['application_updates', 'document_updates', 'approval_updates', 'general_announcements', 'support_updates']),
        labelMap: {
          application_updates: 'Application updates',
          document_updates: 'Document updates',
          approval_updates: 'Approval, review, and access status updates',
          general_announcements: 'General announcements',
          support_updates: 'Support tickets (your requests and replies from REPRONIG)',
        },
      },
    };

    const config = isMemberUser
      ? simplifiedPreferenceConfig.member
      : isInstitutionUser
        ? simplifiedPreferenceConfig.institution
        : isAssociationUser
          ? simplifiedPreferenceConfig.association
          : null;

    const rawItems = notificationPreferencesQuery.data ?? [];
    const items = config
      ? rawItems.filter((item) => config.allowedKeys.has(item.event_key))
      : rawItems;

    const groups = new Map<string, NotificationPreference[]>();
    items.forEach((item) => {
      if (!groups.has(item.event_key)) groups.set(item.event_key, []);
      groups.get(item.event_key)?.push(item);
    });

    return Array.from(groups.entries()).map(
      ([key, groupItems]) =>
        [config?.labelMap[key] ?? TAXONOMY_GROUP_LABELS[key] ?? key.replaceAll('_', ' '), groupItems] as [string, NotificationPreference[]],
    );
  }, [isAssociationUser, isInstitutionUser, isMemberUser, notificationPreferencesQuery.data]);

  const avatarPreview = avatarFile ? URL.createObjectURL(avatarFile) : resolveFileUrl(currentUser?.user.avatar_medium_url ?? currentUser?.user.avatar_url ?? null);
  const securitySummary = securityActivityQuery.data?.summary;
  const securityItems = securityActivityQuery.data?.items ?? [];
  const securityHealthTone = twoFactorQuery.data?.requires_two_factor ? 'good' : 'warning';
  const protectedActionHint = securitySummary?.protected_action_count
    ? `${securitySummary.protected_action_count} recent protected action confirmation${securitySummary.protected_action_count === 1 ? '' : 's'}`
    : 'No protected action confirmation recorded yet';
  const passwordHealthHint = securitySummary?.last_password_change_at
    ? `Last updated ${formatRelativeTime(securitySummary.last_password_change_at)}`
    : 'Update your password if you suspect account exposure';
  const institutionProfile = institutionProfileQuery.data;
  const currentContextItem = securityItems.find((item) => item.is_current_context) ?? null;
  const recentDeviceLabels = securitySummary?.recent_device_labels ?? [];
  const currentDeviceMeta = formatDeviceMeta(
    securitySummary?.current_browser_name ?? currentContextItem?.browser_name,
    securitySummary?.current_operating_system ?? currentContextItem?.operating_system,
    securitySummary?.current_device_type ?? currentContextItem?.device_type,
  );
  const anomalyCount = securitySummary?.recent_anomaly_count ?? 0;
  const hasRecentAnomalies = anomalyCount > 0;
  const securityFeedEmptyState = isPrivilegedUser
    ? 'Recent sign-ins, protected confirmations, and security changes for this admin account will appear here once activity is recorded.'
    : 'Recent sign-ins and security changes for your account will appear here once activity is recorded.';
  const securityFeedLoadingState = isPrivilegedUser
    ? 'Checking recent sign-ins, protected confirmations, and security changes for this privileged account.'
    : 'Checking recent sign-ins and security changes for this account.';

  return (
    <div className="space-y-6">
      <SectionHeader title="Settings" description="Account, security, and preferences." />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="space-y-4">
          <SectionHeader title="Profile details" description="Contact info and photo." />
          <div className="flex flex-col gap-5 rounded-2xl border border-[#EAECF0] bg-[#FCFCF7] p-5 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl border border-[#D6E6FF] bg-[#F4F8FF] text-[#1D4ED8] dark:border-slate-700 dark:bg-slate-900 dark:text-sky-300">
              {avatarPreview ? <img src={avatarPreview} alt={currentUser?.user.name ?? 'Avatar'} className="h-full w-full object-cover" /> : <Camera className="h-8 w-8" />}
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-sm font-semibold text-[#0F172A] dark:text-slate-50 dark:text-slate-100">Profile picture</p>
                <p className="mt-1 text-sm text-[#64748B] dark:text-slate-400">Upload a square JPG or PNG image up to 5MB for the best result.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#CBD5E1] bg-white dark:bg-slate-950 px-4 py-2 dark:border-slate-700 dark:bg-slate-900 text-sm font-semibold text-[#0F172A] dark:text-slate-50 dark:text-slate-100 transition hover:border-[#94A3B8]">
                  <Upload className="h-4 w-4" />
                  Choose image
                  <input type="file" accept="image/*" className="hidden" onChange={(event) => setAvatarFile(event.target.files?.[0] ?? null)} />
                </label>
                <Button onClick={() => avatarFile && avatarMutation.mutate({ avatar: avatarFile })} disabled={avatarMutation.isPending || !avatarFile}>
                  {avatarMutation.isPending ? 'Uploading...' : 'Upload picture'}
                </Button>
                {resolveFileUrl(currentUser?.user.avatar_url) ? (
                  <Button variant="outline" onClick={() => removeAvatarMutation.mutate()} disabled={removeAvatarMutation.isPending}>
                    {removeAvatarMutation.isPending ? 'Removing...' : 'Remove picture'}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
          <form
            className="space-y-4"
            onSubmit={profileBasicsForm.handleSubmit((values) => {
              profileBasicsForm.clearErrors();
              profileMutation.mutate(values as UpdateMePayload);
            })}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                label="First name"
                requiredIndicator
                {...profileBasicsForm.register('first_name', {
                  onChange: () => {
                    profileBasicsForm.clearErrors('first_name');
                  },
                })}
                error={profileBasicsForm.formState.errors.first_name?.message}
              />
              <FormField
                label="Last name"
                requiredIndicator
                {...profileBasicsForm.register('last_name', {
                  onChange: () => {
                    profileBasicsForm.clearErrors('last_name');
                  },
                })}
                error={profileBasicsForm.formState.errors.last_name?.message}
              />
            </div>
            <FormField label="Email" requiredIndicator value={currentUser?.user.email ?? ''} readOnly helperText="Email updates are managed by the account administrator." />
            <FormField
              label="Phone"
              requiredIndicator
              {...profileBasicsForm.register('phone', {
                onChange: () => {
                  profileBasicsForm.clearErrors('phone');
                },
              })}
              error={profileBasicsForm.formState.errors.phone?.message}
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={profileMutation.isPending}>
                {profileMutation.isPending ? 'Saving...' : 'Save profile'}
              </Button>
            </div>
          </form>
        </Card>

        <Card className="space-y-4">
          <SectionHeader title="Password" description="Update sign-in password." />
          {isPrivilegedUser ? (
            <div className="grid gap-4 md:grid-cols-2">
              <SecuritySummaryCard title="Password status" value={securitySummary?.last_password_change_at ? 'Recently updated' : 'Review recommended'} hint={passwordHealthHint} tone={securitySummary?.last_password_change_at ? 'good' : 'warning'} />
              <SecuritySummaryCard title="Protected actions" value={securitySummary?.last_security_confirmation_at ? 'Recently confirmed' : 'Awaiting confirmation'} hint={securitySummary?.last_security_confirmation_at ? `Last confirmed ${formatRelativeTime(securitySummary.last_security_confirmation_at)}` : protectedActionHint} tone={securitySummary?.last_security_confirmation_at ? 'good' : 'warning'} />
            </div>
          ) : null}
          <Alert title="Password guidance" description="Use a strong password, keep it current, and do not reuse passwords from other services." />
          <form className="space-y-4" onSubmit={passwordForm.handleSubmit((values) => passwordMutation.mutate(values as ChangePasswordPayload))}>
            <FormField label="Current password" type="password" {...passwordForm.register('current_password')} error={passwordForm.formState.errors.current_password?.message} helperText="Your current password is required before the new password can be saved." />
            <FormField label="New password" requiredIndicator type="password" {...passwordForm.register('new_password')} error={passwordForm.formState.errors.new_password?.message} helperText="Choose a password you are not using on another service." />
            <FormField label="Confirm new password" requiredIndicator type="password" {...passwordForm.register('new_password_confirmation')} error={passwordForm.formState.errors.new_password_confirmation?.message} helperText="Repeat the new password exactly to avoid mismatched updates." />
            <div className="flex justify-end">
              <Button type="submit" disabled={passwordMutation.isPending}>
                {passwordMutation.isPending ? 'Updating...' : 'Update password'}
              </Button>
            </div>
          </form>
        </Card>

        {isPrivilegedUser ? (
          <Card className="space-y-4 xl:col-span-2">
            <SectionHeader title="Security" description={isPrivilegedUser ? '2FA, activity, and admin confirmations.' : '2FA and recent activity.'} />
          <div className={`grid gap-4 md:grid-cols-2 ${isPrivilegedUser ? 'xl:grid-cols-5' : 'xl:grid-cols-4'}`}>
            <SecuritySummaryCard title="Security status" value={twoFactorQuery.data?.requires_two_factor ? 'Protected' : 'Needs attention'} hint={twoFactorQuery.data?.requires_two_factor ? 'Two-factor is enabled for protected actions.' : 'Enable two-factor for stronger account protection.'} tone={securityHealthTone} />
            <SecuritySummaryCard title="Last sign-in" value={formatDate(securitySummary?.last_login_at ?? currentUser?.security.last_login_at ?? currentUser?.user.last_login_at)} hint={securitySummary?.last_login_ip ? `IP ${securitySummary.last_login_ip}` : 'No sign-in IP recorded yet'} />
            <SecuritySummaryCard title="Password updated" value={formatDate(securitySummary?.last_password_change_at)} hint={securitySummary?.last_password_change_at ? formatRelativeTime(securitySummary.last_password_change_at) : 'No password change recorded yet'} />
            <SecuritySummaryCard title="Email verification" value={currentUser?.security.email_verified ? 'Verified' : 'Pending'} hint={currentUser?.security.email_verified ? 'Your email is verified for account recovery.' : 'Complete verification to strengthen account recovery.'} tone={currentUser?.security.email_verified ? 'good' : 'warning'} />
            {isPrivilegedUser ? <SecuritySummaryCard title="Access scope" value={securitySummary?.role_scope === 'super_admin' ? 'Super admin' : 'Admin'} hint={protectedActionHint} tone={twoFactorQuery.data?.requires_two_factor ? 'good' : 'warning'} /> : null}
          </div>
          {hasRecentAnomalies ? (
            <Alert
              title="Review recent sign-in context"
              description={securitySummary?.last_unfamiliar_sign_in_at
                ? `We noticed ${anomalyCount} recent sign-in ${anomalyCount === 1 ? 'event' : 'events'} with an unfamiliar device or network. Last seen ${formatRelativeTime(securitySummary.last_unfamiliar_sign_in_at)}.`
                : `We noticed ${anomalyCount} recent sign-in ${anomalyCount === 1 ? 'event' : 'events'} with an unfamiliar device or network.`}
            />
          ) : null}
          {!twoFactorQuery.data?.requires_two_factor || !currentUser?.security.email_verified ? (
            <Alert title="Security checklist" description={!twoFactorQuery.data?.requires_two_factor && !currentUser?.security.email_verified ? 'Enable two-factor authentication and verify your email to strengthen access control and account recovery.' : !twoFactorQuery.data?.requires_two_factor ? 'Enable two-factor authentication to protect sensitive account actions.' : 'Verify your email address to improve recovery and notification reliability.'} />
          ) : null}
          {isPrivilegedUser ? (
            <div className="rounded-2xl border border-[#EAECF0] bg-[#FCFCF7] p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#0F172A] dark:text-slate-50 dark:text-slate-100">Current protection state</p>
                  <p className="mt-1 text-sm text-[#64748B] dark:text-slate-400">A quick view of the current device context and the checks protecting privileged admin access.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${twoFactorQuery.data?.requires_two_factor ? 'bg-[#ECFDF3] text-[#027A48] dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-[#FFFBEB] text-[#B54708] dark:bg-amber-950/50 dark:text-amber-300'}`}>2FA {twoFactorQuery.data?.requires_two_factor ? 'enabled' : 'recommended'}</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${currentUser?.security.email_verified ? 'bg-[#ECFDF3] text-[#027A48] dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-[#FFFBEB] text-[#B54708] dark:bg-amber-950/50 dark:text-amber-300'}`}>Email {currentUser?.security.email_verified ? 'verified' : 'pending'}</span>
                </div>
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-4">
                <SecuritySummaryCard title="Current device" value={securitySummary?.current_device_label ?? currentContextItem?.device_label ?? 'Unknown device'} hint={currentDeviceMeta || 'Device details unavailable'} tone="neutral" />
                <SecuritySummaryCard title="Current network" value={securitySummary?.current_ip ?? currentContextItem?.ip_address ?? 'IP unavailable'} hint={securitySummary?.last_login_ip && securitySummary?.current_ip && securitySummary.last_login_ip !== securitySummary.current_ip ? `Last sign-in IP ${securitySummary.last_login_ip}` : 'Matches the current signed-in request context'} tone="neutral" />
                <SecuritySummaryCard title="Protection posture" value={twoFactorQuery.data?.requires_two_factor && currentUser?.security.email_verified ? 'Strong' : 'Review needed'} hint={twoFactorQuery.data?.requires_two_factor ? 'Protected actions require extra verification.' : 'Enable two-factor for privileged actions.'} tone={protectionTone(Boolean(twoFactorQuery.data?.requires_two_factor && currentUser?.security.email_verified))} />
                <SecuritySummaryCard title="Recent devices" value={recentDeviceLabels.length ? recentDeviceLabels[0] : 'No recent device data'} hint={recentDeviceLabels.length > 1 ? recentDeviceLabels.slice(1).join(' · ') : 'Only one recent device recorded'} tone="neutral" />
                <SecuritySummaryCard title="Sign-in watch" value={hasRecentAnomalies ? 'Review activity' : 'No recent anomalies'} hint={hasRecentAnomalies ? `${anomalyCount} unfamiliar sign-in ${anomalyCount === 1 ? 'signal' : 'signals'} detected recently.` : 'Recent sign-ins look consistent with your access history.'} tone={hasRecentAnomalies ? 'warning' : 'good'} />
              </div>
            </div>
          ) : null}
          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-4 rounded-2xl border border-[#D6E6FF] bg-[#F4F8FF] p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start gap-3">
                {twoFactorQuery.data?.requires_two_factor ? <ShieldCheck className="mt-0.5 h-5 w-5 text-[#2563EB] dark:text-sky-300" /> : <ShieldAlert className="mt-0.5 h-5 w-5 text-[#D97706]" />}
                <div>
                  <p className="text-sm font-semibold text-[#1D4ED8] dark:text-sky-300">Two-factor authentication</p>
                  <p className="mt-1 text-sm text-[#3B82F6] dark:text-sky-300">{twoFactorQuery.data?.requires_two_factor ? 'Enabled for sensitive account actions and recent confirmations.' : 'Disabled. Enable it for stronger account security and clearer audit visibility.'}</p>
                </div>
              </div>
              <div className={`grid gap-3 ${isPrivilegedUser ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
                <div className="rounded-2xl border border-white/80 bg-white/80 dark:bg-slate-950/80 p-4 dark:border-slate-700 dark:bg-slate-950/80">
                  <div className="flex items-center gap-2 text-[#475569] dark:text-slate-400"><Clock3 className="h-4 w-4" /><p className="text-xs font-semibold uppercase tracking-[0.12em]">Last confirmation</p></div>
                  <p className="mt-2 text-sm font-semibold text-[#0F172A] dark:text-slate-50 dark:text-slate-100">{formatDate(securitySummary?.last_security_confirmation_at ?? currentUser?.security.last_security_confirmation_at)}</p>
                </div>
                <div className="rounded-2xl border border-white/80 bg-white/80 dark:bg-slate-950/80 p-4 dark:border-slate-700 dark:bg-slate-950/80">
                  <div className="flex items-center gap-2 text-[#475569] dark:text-slate-400"><KeyRound className="h-4 w-4" /><p className="text-xs font-semibold uppercase tracking-[0.12em]">Recent 2FA event</p></div>
                  <p className="mt-2 text-sm font-semibold text-[#0F172A] dark:text-slate-50 dark:text-slate-100">{formatDate(securitySummary?.last_two_factor_event_at)}</p>
                </div>
                {isPrivilegedUser ? (
                  <div className="rounded-2xl border border-white/80 bg-white/80 dark:bg-slate-950/80 p-4 dark:border-slate-700 dark:bg-slate-950/80">
                    <div className="flex items-center gap-2 text-[#475569] dark:text-slate-400"><ShieldEllipsis className="h-4 w-4" /><p className="text-xs font-semibold uppercase tracking-[0.12em]">Protected actions</p></div>
                    <p className="mt-2 text-sm font-semibold text-[#0F172A] dark:text-slate-50 dark:text-slate-100">{securitySummary?.protected_action_count ?? 0} recent confirmations</p>
                    <p className="mt-1 text-xs text-[#64748B] dark:text-slate-400">{securitySummary?.last_sensitive_action_at ? `Last confirmation ${formatRelativeTime(securitySummary.last_sensitive_action_at)}` : 'No recent protected action confirmation'}</p>
                  </div>
                ) : null}
              </div>
              <p className="text-sm text-[#3B82F6] dark:text-sky-300">{isPrivilegedUser ? 'Protected admin workflows may ask for your 6 digit admin PIN and a two-factor code before they proceed. Successful confirmations will appear in recent security activity.' : 'Sensitive account changes may require a recent security confirmation before they proceed. Confirmed actions appear in your recent security activity.'}</p>
              <div className="flex justify-start">
                <Button variant="outline" onClick={() => twoFactorMutation.mutate()} disabled={twoFactorMutation.isPending || twoFactorQuery.isLoading}>
                  {twoFactorMutation.isPending ? 'Saving...' : twoFactorQuery.data?.requires_two_factor ? 'Disable two-factor' : 'Enable two-factor'}
                </Button>
              </div>
            </div>
            <div className="space-y-3 rounded-2xl border border-[#EAECF0] bg-white dark:bg-slate-950 p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-[#2563EB] dark:text-sky-300" />
                  <p className="text-sm font-semibold text-[#0F172A] dark:text-slate-50 dark:text-slate-100">Recent security activity</p>
                </div>
                <p className="text-xs font-medium text-[#64748B] dark:text-slate-400">{securitySummary?.total_events ?? securityItems.length} recent events · {securitySummary?.login_event_count ?? 0} sign-ins</p>
              </div>
              {securityActivityQuery.isLoading ? (
                <SecurityStatePanel title="Loading recent security activity" description={securityFeedLoadingState} />
              ) : null}
              {!securityActivityQuery.isLoading && securityItems.length === 0 ? (
                <SecurityStatePanel
                  title="No recent security activity"
                  description={isPrivilegedUser ? `${securityFeedEmptyState} Protected admin actions and new device sign-ins will appear here as they happen.` : `${securityFeedEmptyState} Password changes, sign-ins, and other security events will appear here as they happen.`}
                />
              ) : null}
              {!securityActivityQuery.isLoading && securityItems.map((item) => (
                <div key={item.id} className={`rounded-2xl border p-4 ${item.anomaly_level === 'warning' ? 'border-[#FDE68A] bg-[#FFFBEB] dark:border-amber-900 dark:bg-amber-950/40' : item.anomaly_level === 'notice' ? 'border-[#D6E6FF] bg-[#F4F8FF] dark:border-slate-700 dark:bg-slate-900' : 'border-[#EAECF0] bg-[#FCFCF7] dark:border-slate-800 dark:bg-slate-900'}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-[#0F172A] dark:text-slate-50 dark:text-slate-100">{humanizeActivityLabel(item.label)}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <p className="text-xs text-[#64748B] dark:text-slate-400">{item.device_label ?? 'Unknown device'}</p>
                        {item.category ? <span className="rounded-full bg-white dark:bg-slate-950 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#475569] dark:bg-slate-800 dark:text-slate-300">{item.category.replace('_', ' ')}</span> : null}
                        {item.is_current_context ? <span className="rounded-full bg-[#DBEAFE] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#1D4ED8] dark:text-sky-300">Current session</span> : null}
                        {item.anomaly_level === 'warning' ? <span className="rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#B45309] dark:text-amber-300">Review sign-in</span> : null}
                        {item.anomaly_level === 'notice' ? <span className="rounded-full bg-[#DBEAFE] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#1D4ED8] dark:text-sky-300">New context</span> : null}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-[0.1em] text-[#64748B] dark:text-slate-400">{formatDateTime(item.created_at)}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white dark:bg-slate-950 px-2.5 py-1 text-xs font-medium text-[#475569] dark:bg-slate-800 dark:text-slate-300">IP {item.ip_address ?? '—'}</span>
                    {item.browser_name ? <span className="rounded-full bg-white dark:bg-slate-950 px-2.5 py-1 text-xs font-medium text-[#475569] dark:bg-slate-800 dark:text-slate-300">{item.browser_name}</span> : null}
                    {item.operating_system ? <span className="rounded-full bg-white dark:bg-slate-950 px-2.5 py-1 text-xs font-medium text-[#475569] dark:bg-slate-800 dark:text-slate-300">{item.operating_system}</span> : null}
                    {item.device_type ? <span className="rounded-full bg-white dark:bg-slate-950 px-2.5 py-1 text-xs font-medium capitalize text-[#475569] dark:bg-slate-800 dark:text-slate-300">{item.device_type}</span> : null}
                  </div>
                  {item.anomaly_message ? <p className={`mt-2 text-sm ${item.anomaly_level === 'warning' ? 'text-[#B45309] dark:text-amber-300' : 'text-[#1D4ED8] dark:text-sky-300'}`}>{item.anomaly_message}</p> : null}
                  <p className="mt-2 text-sm text-[#64748B] dark:text-slate-400 line-clamp-2">{item.user_agent ?? 'User agent unavailable'}</p>
                </div>
              ))}
            </div>
          </div>
          </Card>
        ) : null}

        {isInstitutionUser ? (
          <Card className="space-y-4 xl:col-span-2">
            <SectionHeader title="Institution branding" description="Institution portal logo." />
            <div className="flex flex-col gap-5 rounded-2xl border border-[#EAECF0] bg-[#FCFCF7] p-5 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl border border-[#D6E6FF] bg-[#F4F8FF] text-[#1D4ED8] dark:border-slate-700 dark:bg-slate-900 dark:text-sky-300">
                  {institutionProfile?.logo_medium_url || institutionProfile?.logo_url ? <img src={resolveFileUrl(institutionProfile.logo_medium_url ?? institutionProfile.logo_url ?? '') ?? ''} alt={institutionProfile?.name ?? 'Institution logo'} className="h-full w-full object-cover" /> : <Building2 className="h-8 w-8" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#0F172A] dark:text-slate-50 dark:text-slate-100">Current institution logo</p>
                  <p className="mt-1 text-sm text-[#64748B] dark:text-slate-400">Upload is available from the institution onboarding page. You can now also remove the current logo here.</p>
                </div>
              </div>
              <Button variant="outline" onClick={() => removeInstitutionLogoMutation.mutate()} disabled={removeInstitutionLogoMutation.isPending || !institutionProfile?.logo_url}>
                {removeInstitutionLogoMutation.isPending ? 'Removing...' : 'Remove institution logo'}
              </Button>
            </div>
          </Card>
        ) : null}

        <Card className="space-y-4 xl:col-span-2">
          <SectionHeader title="Notifications" description="What we notify you about." />
          <div className="space-y-3">
            {preferenceGroups.map(([groupTitle, items]) => (
              <div key={groupTitle} className="rounded-2xl border border-[#EAECF0] bg-[#FCFCF7] p-4 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-sm font-semibold text-[#2B2B2D] dark:text-slate-100 dark:text-slate-100">{groupTitle}</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {items.map((item) => {
                    const key = toPreferenceKey(item);
                    return (
                      <label key={key} className="flex items-center justify-between gap-3 rounded-xl border border-[#EAECF0] bg-white dark:bg-slate-950 px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
                        <span className="text-sm font-medium capitalize text-[#344054] dark:text-slate-200 dark:text-slate-300">{item.channel.replaceAll('_', ' ')}</span>
                        <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={preferences[key] ?? item.enabled} onChange={(event) => setPreferences((current) => ({ ...current, [key]: event.target.checked }))} />
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <Button onClick={() => preferencesMutation.mutate()} disabled={preferencesMutation.isPending || notificationPreferencesQuery.isLoading}>
              {preferencesMutation.isPending ? 'Saving...' : 'Save preferences'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}