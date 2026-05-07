import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { verifyTwoFactor, getCurrentUser } from '@/features/auth/api';
import { onMutationApiError, toastApiError } from '@/lib/mutationFeedback';
import { AuthCard } from '@/features/auth/AuthCard';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/shared/FormField';
import { useAuthStore } from '@/store/auth.store';
import { getPortalHomePath, isPortalAllowed } from '@/features/me/portal';
import { twoFactorSchema, type TwoFactorFormValues } from '@/features/auth/schemas';

export function TwoFactorPage() {
  const navigate = useNavigate();
  const pending = useAuthStore((state) => state.pendingTwoFactor);
  const setToken = useAuthStore((state) => state.setToken);
  const setCurrentUser = useAuthStore((state) => state.setCurrentUser);
  const setPendingTwoFactor = useAuthStore((state) => state.setPendingTwoFactor);
  const clearSession = useAuthStore((state) => state.clearSession);

  const form = useForm<TwoFactorFormValues>({
    resolver: zodResolver(twoFactorSchema),
    defaultValues: { code: '' },
  });

  const mutation = useMutation({
    mutationFn: verifyTwoFactor,
    onSuccess: async (response) => {
      const session = response.data;

      if (!session.token || !pending) {
        toast.error('Two-factor verification could not complete.');
        return;
      }

      setToken(session.token);

      try {
        const me = await getCurrentUser();

        if (!isPortalAllowed(me.data, pending.portal)) {
          clearSession();
          toast.error('This account does not match the selected portal.');
          return;
        }

        setCurrentUser(me.data);
        setPendingTwoFactor(null);
        toast.success(response.message);
        navigate(getPortalHomePath(me.data));
      } catch (error) {
        clearSession();
        toastApiError(error, 'Two-factor verification succeeded, but your account session could not be loaded. Please sign in again.');
      }
    },
    onError: onMutationApiError(),
  });

  if (!pending) {
    return (
      <AuthCard title="Two-Factor Verification" subtitle="Your login session is no longer active.">
        <Button onClick={() => navigate('/member/login')}>Return to login</Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Two-Factor Verification" subtitle={`Enter the 6-digit code sent for ${pending.email}.`}>
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit((values) =>
          mutation.mutate({ challenge_id: pending.challengeId, code: values.code })
        )}
      >
        <FormField label="Verification code" requiredIndicator inputMode="numeric" maxLength={6} {...form.register('code')} error={form.formState.errors.code?.message} />
        <Button className="w-full" type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Verifying...' : 'Verify'}
        </Button>
      </form>
    </AuthCard>
  );
}
