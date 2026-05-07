import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { acceptInstitutionLicensingTerms } from '@/features/institution/api';
import { getCurrentUser } from '@/features/auth/api';
import { getPublicPlatformSettings } from '@/features/public/api';
import { normalizeApiError } from '@/api/error';
import { onMutationApiError, toastApiError } from '@/lib/mutationFeedback';
import { QueryRetryBanner } from '@/components/shared/QueryRetryBanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/auth.store';
import { queryKeys } from '@/lib/queryKeys';

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function InstitutionLicensingTermsGate() {
  const currentUser = useAuthStore((state) => state.currentUser);
  const setCurrentUser = useAuthStore((state) => state.setCurrentUser);
  const required = Boolean(currentUser?.onboarding_status?.institution_licensing_terms_acceptance_required);

  const settingsQuery = useQuery({
    queryKey: queryKeys.publicPlatformSettings,
    queryFn: async () => (await getPublicPlatformSettings()).data,
    enabled: required,
  });

  const terms = settingsQuery.data?.licensing?.institution_licensing_terms;
  const termsVersion = terms?.version ?? '1.0';

  const [acknowledgedOn, setAcknowledgedOn] = useState(todayIsoDate);
  const [agreed, setAgreed] = useState(false);

  const acceptMutation = useMutation({
    mutationFn: () =>
      acceptInstitutionLicensingTerms({
        terms_version: termsVersion,
        acknowledged_on: acknowledgedOn,
        confirm_accepted: true,
      }),
    onSuccess: async (response) => {
      toast.success(response.message ?? 'Licensing terms recorded. Thank you.');
      try {
        const next = await getCurrentUser();
        setCurrentUser(next.data);
      } catch (error) {
        toastApiError(error);
      }
    },
    onError: onMutationApiError(),
  });

  const canSubmit = useMemo(() => agreed && Boolean(acknowledgedOn) && !acceptMutation.isPending, [agreed, acknowledgedOn, acceptMutation.isPending]);

  if (!required) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 py-8">
      <div className="flex max-h-[min(92vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#EAECF0] bg-[#FCFCF7] shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b border-[#EAECF0] px-6 py-4 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-[#101828] dark:text-slate-100">{terms?.title?.trim() ? terms.title : 'Institution licensing terms'}</h2>
          <p className="mt-1 text-sm text-[#667085] dark:text-slate-400">Please read and acknowledge before proceeding.</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {settingsQuery.isLoading ? (
            <p className="text-sm text-[#667085] dark:text-slate-400">Loading terms…</p>
          ) : settingsQuery.isError ? (
            <QueryRetryBanner
              message={normalizeApiError(settingsQuery.error).message}
              onRetry={() => void settingsQuery.refetch()}
              isRetrying={settingsQuery.isFetching && !settingsQuery.isLoading}
            />
          ) : (
            <div className="whitespace-pre-wrap text-base leading-7 text-[#344054] dark:text-slate-200">{terms?.body?.trim() ? terms.body : 'Terms content is not available. Contact REPRONIG support.'}</div>
          )}
        </div>
        <div className="space-y-4 border-t border-[#EAECF0] bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-[#344054] dark:text-slate-200">Effective date you are acknowledging</span><br /><br />
            <Input type="date" value={acknowledgedOn} max={todayIsoDate()} onChange={(event) => setAcknowledgedOn(event.target.value)} className="max-w-xs" />
          </label>
          <label className="flex items-start gap-3 text-sm leading-6 text-[#344054] dark:text-slate-200">
            <input type="checkbox" className="mt-1 h-4 w-4 rounded border-slate-300" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
            <span>I have read the terms above and agree on behalf of my institution.</span>
          </label>
          <div className="flex justify-end">
            <Button type="button" className="bg-[#AF1512] hover:bg-[#8E100D]" disabled={!canSubmit} onClick={() => acceptMutation.mutate()}>
              {acceptMutation.isPending ? 'Saving…' : 'Submit acknowledgment'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
