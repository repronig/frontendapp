import type { PublicPlatformSettings } from '@/features/public/api';

const gatewayLabels: Record<string, string> = { paystack: 'Paystack', flutterwave: 'Flutterwave' };

export type OnlineGatewayId = 'paystack' | 'flutterwave';

/** Options for institution online checkout — empty when the platform has disabled all PSPs. */
export function buildOnlineGatewaySelectOptions(
  licensing: PublicPlatformSettings['licensing'] | undefined,
): { label: string; value: OnlineGatewayId }[] {
  const fromApi = licensing?.enabled_online_gateways?.filter((g): g is OnlineGatewayId => g === 'paystack' || g === 'flutterwave');
  if (fromApi?.length) {
    return fromApi.map((value) => ({ label: gatewayLabels[value] ?? value, value }));
  }

  const out: { label: string; value: OnlineGatewayId }[] = [];
  if (licensing?.paystack_enabled !== false) {
    out.push({ label: 'Paystack', value: 'paystack' });
  }
  if (licensing?.flutterwave_enabled) {
    out.push({ label: 'Flutterwave', value: 'flutterwave' });
  }

  return out;
}

/** Default gateway for forms; null when no online gateway is available. */
export function resolveDefaultOnlineGateway(
  licensing: PublicPlatformSettings['licensing'] | undefined,
): OnlineGatewayId | null {
  const options = buildOnlineGatewaySelectOptions(licensing);
  if (!options.length) {
    return null;
  }
  const preferred = licensing?.default_online_gateway;
  if (preferred && options.some((o) => o.value === preferred)) {
    return preferred;
  }

  return options[0]!.value;
}
