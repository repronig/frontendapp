import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Modal } from '@/components/shared/Modal';
import { toastApiError } from '@/lib/mutationFeedback';
import { env } from '@/utils/env';
import { formatCurrency } from '@/utils/format';
import type { PaymentInitiationResult } from '@/types/domain';

declare global {
  interface Window {
    PaystackPop?: { setup: (options: { key: string; email: string; amount: number; currency?: string; ref: string; callback?: () => void; onClose?: () => void }) => { openIframe: () => void } };
    FlutterwaveCheckout?: (options: { public_key: string; tx_ref: string; amount: number; currency: string; customer: { email: string }; callback?: () => void; onclose?: () => void; customizations?: { title?: string; description?: string } }) => void;
  }
}

let paystackScriptPromise: Promise<void> | null = null;
let flutterwaveScriptPromise: Promise<void> | null = null;

function loadScript(src: string, marker: string, existing: () => boolean) {
  if (existing()) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const found = document.querySelector<HTMLScriptElement>(`script[data-${marker}="true"]`);
    if (found) {
      found.addEventListener('load', () => resolve(), { once: true });
      found.addEventListener('error', () => reject(new Error('Could not load payment checkout.')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset[marker] = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load payment checkout.'));
    document.body.appendChild(script);
  });
}

function loadPaystackScript() {
  paystackScriptPromise ??= loadScript('https://js.paystack.co/v1/inline.js', 'paystackInline', () => Boolean(window.PaystackPop));
  return paystackScriptPromise;
}

function loadFlutterwaveScript() {
  flutterwaveScriptPromise ??= loadScript('https://checkout.flutterwave.com/v3.js', 'flutterwaveInline', () => Boolean(window.FlutterwaveCheckout));
  return flutterwaveScriptPromise;
}

export function PaymentGatewayModal({ payment, customerEmail, onClose, onPaymentVerified }: { payment: PaymentInitiationResult | null; customerEmail?: string | null; onClose: () => void; onPaymentVerified?: (payment: PaymentInitiationResult) => Promise<void> | void; }) {
  const [opening, setOpening] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const gateway = payment?.gateway_name ?? 'paystack';
  const gatewayLabel = gateway === 'flutterwave' ? 'Flutterwave' : 'Paystack';
  const email = customerEmail || 'payments@repronig.local';

  async function verifyPayment() {
    if (!payment || !onPaymentVerified) return;
    setVerifying(true);
    try {
      await onPaymentVerified(payment);
      toast.success('Payment verified and account records updated.');
      onClose();
    } catch (error) {
      toastApiError(error, 'Payment completed, but automatic verification failed. Please refresh this page or contact support if the payment is not reflected.');
    } finally {
      setVerifying(false);
    }
  }

  async function openCheckout() {
    if (!payment) return;
    setOpening(true);
    try {
      if (payment.authorization_url && !['paystack', 'flutterwave'].includes(gateway)) {
        window.location.href = payment.authorization_url;
        return;
      }

      if (gateway === 'flutterwave') {
        if (!env.flutterwavePublicKey) {
          toast.error('Flutterwave public key is not configured. Add VITE_FLUTTERWAVE_PUBLIC_KEY.');
          return;
        }
        await loadFlutterwaveScript();
        window.FlutterwaveCheckout?.({
          public_key: env.flutterwavePublicKey,
          tx_ref: payment.payment_reference,
          amount: Number(payment.amount || 0),
          currency: payment.currency || 'NGN',
          customer: { email },
          callback: () => { void verifyPayment(); },
          customizations: { title: 'REPRONIG Payment', description: payment.payment_reference },
        });
      } else {
        if (!env.paystackPublicKey) {
          toast.error('Paystack public key is not configured. Add VITE_PAYSTACK_PUBLIC_KEY.');
          return;
        }
        await loadPaystackScript();
        window.PaystackPop?.setup({
          key: env.paystackPublicKey,
          email,
          amount: Math.round(Number(payment.amount || 0) * 100),
          currency: payment.currency || 'NGN',
          ref: payment.payment_reference,
          callback: () => { void verifyPayment(); },
        }).openIframe();
      }
    } catch (error) {
      if (payment.authorization_url) {
        window.location.href = payment.authorization_url;
        return;
      }

      toastApiError(error, `Could not open ${gatewayLabel} checkout.`);
    } finally {
      setOpening(false);
    }
  }

  return (
    <Modal open={Boolean(payment)} onClose={onClose} title="Complete payment" subtitle="Complete the transaction without leaving REPRONIG." size="md">
      {payment ? (
        <div className="space-y-5">
          <div className="rounded-2xl border border-[#EAECF0] bg-[#FCFCFD] p-5 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm font-medium uppercase tracking-wide text-[#667085] dark:text-slate-300 dark:text-slate-400">{gatewayLabel}</p>
            <h3 className="mt-2 text-2xl font-semibold text-[#101828] dark:text-slate-100">{formatCurrency(payment.amount, payment.currency)}</h3>
            <p className="mt-1 text-sm text-[#667085] dark:text-slate-300 dark:text-slate-400">Reference: {payment.payment_reference}</p>
          </div>
          {!['paystack', 'flutterwave'].includes(gateway) ? <Alert title="Gateway not embedded" description="Inline checkout is currently configured for Paystack and Flutterwave. If a hosted checkout link is available, the payment button will open it." /> : null}
          <div className="flex flex-wrap gap-3">
            <Button type="button" disabled={(!['paystack', 'flutterwave'].includes(gateway) && !payment.authorization_url) || opening || verifying} onClick={openCheckout}>{opening ? `Opening ${gatewayLabel}...` : `Pay with ${gatewayLabel}`}</Button>
            <Button type="button" variant="outline" onClick={onClose}>Close</Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
