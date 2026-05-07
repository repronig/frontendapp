import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { BellRing, Send } from 'lucide-react';

import { SectionHeader } from '@/components/shared/SectionHeader';
import { FormField } from '@/components/shared/FormField';
import { FormSelectField } from '@/components/shared/FormSelectField';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { type AdminPushNotificationSendResult, sendAdminPushNotification } from '@/features/admin/api';
import { showAdminActionError, showAdminActionSuccess } from '@/features/admin/action-feedback';
import { confirmAdminSensitiveAction } from '@/features/admin/security';

type Audience = 'all_members' | 'member_ids';

const audienceOptions = [
  { label: 'All members', value: 'all_members' },
  { label: 'Specific members (IDs)', value: 'member_ids' },
];

function parseMemberIds(raw: string) {
  const values = raw
    .split(/[\s,]+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => Number.parseInt(token, 10))
    .filter((value) => Number.isFinite(value) && value > 0);
  return Array.from(new Set(values));
}

export function AdminPushNotificationsPage() {
  const [audience, setAudience] = useState<Audience>('all_members');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [deepLink, setDeepLink] = useState('');
  const [memberIdsRaw, setMemberIdsRaw] = useState('');
  const [lastResult, setLastResult] = useState<AdminPushNotificationSendResult | null>(null);

  const parsedIds = useMemo(() => parseMemberIds(memberIdsRaw), [memberIdsRaw]);

  const mutation = useMutation({
    mutationFn: async () => {
      const confirmed = await confirmAdminSensitiveAction({
        title: 'Confirm push notification',
        description: 'Sending push notifications is a protected admin action.',
        confirmLabel: 'Send push',
      });
      if (!confirmed) throw new Error('Security confirmation cancelled.');

      const payload = {
        audience,
        title: title.trim(),
        message: message.trim(),
        ...(deepLink.trim() ? { deep_link: deepLink.trim() } : {}),
        ...(audience === 'member_ids' ? { member_ids: parsedIds } : {}),
      } as const;

      return sendAdminPushNotification(payload);
    },
    onSuccess: (response) => {
      const result = response.data;
      setLastResult(result);
      const recipients = result?.recipients ?? 0;
      if (recipients > 0) {
        showAdminActionSuccess(`Push sent to ${recipients} users.`, response.message);
      } else {
        showAdminActionError(
          new Error('No subscribed OneSignal devices were reached for this audience.'),
          'Push sent request was accepted, but no device received it.',
        );
      }
      setTitle('');
      setMessage('');
      setDeepLink('');
      if (audience === 'member_ids') setMemberIdsRaw('');
    },
    onError: (error) => showAdminActionError(error, 'Push notification could not be sent.'),
  });

  const canSubmit =
    title.trim().length > 0 &&
    message.trim().length > 0 &&
    (audience !== 'member_ids' || parsedIds.length > 0);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Push Notifications"
        description="Send OneSignal push messages to members."
      />

      <div className="rounded-2xl border border-[#EAECF0] dark:border-slate-800 bg-white dark:bg-slate-950 p-5 md:p-6 space-y-5">
        <div className="flex items-center gap-3 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-[#92400E]">
          <BellRing className="h-4 w-4 shrink-0" />
          <p className="text-sm">
            Use this for important announcements. Notifications are delivered to mobile users with active push permission.
          </p>
        </div>

        <FormSelectField
          label="Audience"
          value={audience}
          onChange={(event) => setAudience(event.target.value as Audience)}
          options={audienceOptions}
          requiredIndicator
        />

        {audience === 'member_ids' ? (
          <label className="block space-y-2">
            <p className="text-sm font-medium text-foreground">Member IDs</p>
            <Textarea
              value={memberIdsRaw}
              onChange={(event) => setMemberIdsRaw(event.target.value)}
              placeholder="Example: 12, 45, 81"
              className="min-h-[110px]"
            />
            <p className="text-xs text-muted-foreground">
              Enter member IDs separated by comma, space, or new line. Parsed: {parsedIds.length}
            </p>
          </label>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            label="Title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Notification title"
            maxLength={120}
            requiredIndicator
          />
          <FormField
            label="Deep link (optional)"
            value={deepLink}
            onChange={(event) => setDeepLink(event.target.value)}
            placeholder="/member/notifications"
          />
        </div>

        <label className="block space-y-2">
          <p className="text-sm font-medium text-foreground">Message</p>
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Write the push notification body..."
            maxLength={1000}
            required
          />
          <p className="text-xs text-muted-foreground">{message.length}/1000 characters</p>
        </label>

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !canSubmit}
          >
            <Send className="mr-2 h-4 w-4" />
            {mutation.isPending ? 'Sending...' : 'Send push notification'}
          </Button>
        </div>
      </div>

      {lastResult ? (
        <div className="rounded-2xl border border-[#EAECF0] dark:border-slate-800 bg-white dark:bg-slate-950 p-5 md:p-6 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Last send diagnostics</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-[#EAECF0] dark:border-slate-800 p-3">
              <p className="text-xs text-muted-foreground">Audience</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{lastResult.audience}</p>
            </div>
            <div className="rounded-xl border border-[#EAECF0] dark:border-slate-800 p-3">
              <p className="text-xs text-muted-foreground">Targeted users</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{lastResult.targeted_users_count}</p>
            </div>
            <div className="rounded-xl border border-[#EAECF0] dark:border-slate-800 p-3">
              <p className="text-xs text-muted-foreground">Recipients reached</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{lastResult.recipients}</p>
            </div>
          </div>

          {lastResult.warnings?.length ? (
            <div className="rounded-xl border border-[#F59E0B] bg-[#FFFBEB] p-3 text-sm text-[#92400E]">
              <p className="font-semibold">Warnings</p>
              <ul className="mt-1 list-disc pl-5">
                {lastResult.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {lastResult.provider_errors?.length ? (
            <div className="rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] p-3 text-sm text-[#991B1B]">
              <p className="font-semibold">Provider errors</p>
              <ul className="mt-1 list-disc pl-5">
                {lastResult.provider_errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="rounded-xl border border-[#EAECF0] dark:border-slate-800 p-3">
            <p className="text-xs text-muted-foreground">Targeted aliases</p>
            <p className="mt-1 break-all text-sm text-foreground">
              {lastResult.targeted_aliases?.length ? lastResult.targeted_aliases.join(', ') : '—'}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

