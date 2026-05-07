import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getPublicPlatformSettings, lookupLicence, initializePublicLicencePayment } from '@/features/public/api';
import { onMutationApiError } from '@/lib/mutationFeedback';
import { PageShell } from '@/components/shared/PageShell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/shared/FormField';
import { Alert } from '@/components/ui/alert';
import { toast } from 'sonner';
import { resolveDefaultOnlineGateway } from '@/utils/institutionLicensingSettings';
import { queryKeys } from '@/lib/queryKeys';

export function LicenceLookupPage() {
  const [licenceId, setLicenceId] = useState('');
  const platformQuery = useQuery({
    queryKey: queryKeys.publicLicenceLookupPlatformSettings,
    queryFn: getPublicPlatformSettings,
  });
  const licensing = platformQuery.data?.data?.licensing;
  const defaultGateway = resolveDefaultOnlineGateway(licensing);
  const hasOnlineGateways = defaultGateway !== null;

  const lookupMutation = useMutation({
    mutationFn: lookupLicence,
    onError: onMutationApiError(),
  });
  const paymentMutation = useMutation({
    mutationFn: initializePublicLicencePayment,
    onSuccess: (response) => toast.success(response.message),
    onError: onMutationApiError(),
  });

  const summary = lookupMutation.data?.data;

  return (
    <PageShell title="Licence Lookup" subtitle="Public lookup and payment initialization uses the backend licensing endpoints.">
      <Card>
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <FormField label="Licence ID" value={licenceId} onChange={(e) => setLicenceId(e.target.value)} placeholder="Enter licence ID" />
          <div className="flex items-end">
            <Button onClick={() => lookupMutation.mutate(licenceId)} disabled={!licenceId || lookupMutation.isPending}>
              {lookupMutation.isPending ? 'Looking up...' : 'Lookup'}
            </Button>
          </div>
        </div>
      </Card>

      {summary ? (
        <Card>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{summary.institution_name}</h2>
          <p className="mt-2 text-sm text-slate-600">Outstanding amount: {summary.outstanding_amount ?? 0}</p>
          {!hasOnlineGateways ? (
            <Alert
              className="mt-4"
              title="Online payment unavailable"
              description="The platform has not enabled an online payment provider for this checkout. Contact support if you need to pay."
            />
          ) : (
            <div className="mt-4">
              <Button
                onClick={() => {
                  if (!defaultGateway) {
                    return;
                  }
                  paymentMutation.mutate({
                    gateway_name: defaultGateway,
                    amount: Number(summary.outstanding_amount || 0),
                    licensing_year: summary.licensing_year || undefined,
                    licence_id: summary.licence_id || undefined,
                  });
                }}
                disabled={paymentMutation.isPending || !summary.licence_id || !summary.outstanding_amount}
              >
                {paymentMutation.isPending ? 'Initializing payment...' : 'Initialize payment'}
              </Button>
            </div>
          )}
        </Card>
      ) : null}
    </PageShell>
  );
}
