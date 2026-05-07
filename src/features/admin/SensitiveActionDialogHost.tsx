import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { confirmSensitiveAction } from '@/features/auth/api';
import { normalizeApiError } from '@/api/error';
import { registerAdminSensitiveActionDialog, type SensitiveActionConfirmOptions } from '@/features/admin/security';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/shared/FormField';
import { Modal } from '@/components/shared/Modal';
import { PinInput } from '@/components/shared/PinInput';

export function AdminSensitiveActionDialogHost() {
  const resolverRef = useRef<((value: boolean) => void) | null>(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'pin' | 'code'>('pin');
  const [adminPin, setAdminPin] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [challengeId, setChallengeId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attemptedStep, setAttemptedStep] = useState<'pin' | 'code'>('pin');
  const [options, setOptions] = useState<SensitiveActionConfirmOptions>({});

  useEffect(() => {
    registerAdminSensitiveActionDialog(
      (nextOptions) =>
        new Promise<boolean>((resolve) => {
          resolverRef.current = resolve;
          setOptions(nextOptions ?? {});
          setOpen(true);
          setStep('pin');
          setAdminPin('');
          setCode('');
          setChallengeId(null);
          setError(null);
          setSubmitting(false);
          setAttemptedStep('pin');
        }),
    );

    return () => {
      registerAdminSensitiveActionDialog(null);
    };
  }, []);

  const ui = useMemo(
    () => ({
      title: options.title ?? 'Confirm protected action',
      description: options.description,
      confirmLabel: options.confirmLabel ?? (step === 'pin' ? 'Continue' : 'Verify and continue'),
      pinLabel: options.pinLabel ?? 'Admin PIN',
      codeLabel: options.codeLabel ?? 'Verification code',
    }),
    [options, step],
  );

  function resolveAndClose(value: boolean) {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setOpen(false);
    setSubmitting(false);
    setError(null);
    setChallengeId(null);
    setAdminPin('');
    setCode('');
    setStep('pin');
    setAttemptedStep('pin');
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    setAttemptedStep(step);

    try {
      if (step === 'pin') {
        const response = await confirmSensitiveAction({ admin_pin: adminPin });

        if (response.data.confirmed) {
          toast.success('Protected action confirmed. You can continue.');
          resolveAndClose(true);
          return;
        }

        if (response.data.challenge_id) {
          setChallengeId(response.data.challenge_id);
          setStep('code');
          setAttemptedStep('code');
          toast.info('Verification code required to finish this protected action.');
          setSubmitting(false);
          return;
        }

        setError('Protected action confirmation was not completed.');
        setSubmitting(false);
        return;
      }

      const followUp = await confirmSensitiveAction({
        admin_pin: adminPin,
        challenge_id: challengeId ?? undefined,
        code,
      });

      if (followUp.data.confirmed) {
        toast.success('Protected action confirmed with two-factor verification.');
        resolveAndClose(true);
        return;
      }

      setError('The verification code could not be confirmed.');
      setSubmitting(false);
    } catch (cause) {
      const message = normalizeApiError(cause).message;
      setError(message);
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={() => resolveAndClose(false)} title={ui.title} size="sm">
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-2xl border border-sky-200/90 bg-gradient-to-br from-sky-50 via-white to-indigo-50/80 p-4 shadow-sm dark:border-sky-900/40 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 sm:p-5">
          <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-sky-200/40 blur-2xl dark:bg-sky-500/10" />
          <div className="relative flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/90 text-sky-700 shadow-sm ring-1 ring-sky-100 dark:bg-slate-800 dark:text-sky-300 dark:ring-slate-700">
              <ShieldCheck className="h-5 w-5" strokeWidth={2.25} />
            </div>
            <div className="min-w-0 space-y-2 text-sm leading-relaxed text-sky-950 dark:text-sky-100/95">
              <p className="text-[15px] font-semibold tracking-tight text-sky-950 dark:text-slate-50">Security confirmation</p>
              {ui.description ? (
                <p className="text-[13px] text-sky-900/85 dark:text-slate-300">{ui.description}</p>
              ) : null}
              <p className="text-[13px] text-sky-900/80 dark:text-slate-400">
                {step === 'pin'
                  ? 'Enter your 6-digit admin PIN below. Two-factor verification may be required after the PIN.'
                  : 'Enter the verification code from your authenticator to finish this step.'}
              </p>
            </div>
          </div>
        </div>

        {error ? <Alert title={attemptedStep === 'code' ? 'Verification failed' : 'Confirmation failed'} description={error} /> : null}

        <div className="space-y-4">
          <PinInput
            label={ui.pinLabel}
            value={adminPin}
            onChange={setAdminPin}
            autoFocus={step === 'pin'}
            disabled={submitting || step === 'code'}
            align="center"
            emphasizeDigits
            helperText={
              step === 'pin'
                ? 'Enter your 6 digit admin PIN.'
                : 'Your admin PIN stays attached to this confirmation while you finish the second step.'
            }
          />

          {step === 'code' ? (
            <FormField
              label={ui.codeLabel}
              inputMode="numeric"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              autoFocus
              helperText="Use the current code from your authenticator or the code supplied by your configured second factor flow."
            />
          ) : null}
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-[#EAECF0] pt-5 dark:border-slate-800">
          <Button variant="outline" onClick={() => resolveAndClose(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || adminPin.length !== 6 || (step === 'code' && code.length !== 6)}>
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {step === 'code' ? 'Verifying…' : 'Confirming…'}
              </span>
            ) : (
              ui.confirmLabel
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
