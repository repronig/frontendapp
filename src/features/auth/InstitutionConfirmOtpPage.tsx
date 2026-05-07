import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { getCurrentUser, resendInstitutionRegistrationOtp, verifyInstitutionRegistrationOtp } from '@/features/auth/api';
import { onMutationApiError, toastApiError } from '@/lib/mutationFeedback';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/shared/FormField';
import { AuthCard } from '@/features/auth/AuthCard';
import { memberOtpSchema, type MemberOtpFormValues } from '@/features/auth/schemas';
import { useAuthStore } from '@/store/auth.store';

export function InstitutionConfirmOtpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialEmail = (location.state as { email?: string } | null)?.email ?? '';
  const setToken = useAuthStore((state) => state.setToken);
  const setCurrentUser = useAuthStore((state) => state.setCurrentUser);
  const clearSession = useAuthStore((state) => state.clearSession);

  const form = useForm<MemberOtpFormValues>({
    resolver: zodResolver(memberOtpSchema),
    defaultValues: { email: initialEmail, code: '' },
  });

  const verifyMutation = useMutation({
    mutationFn: verifyInstitutionRegistrationOtp,
    onSuccess: async (response) => {
      const session = response.data;
      if (!session.token) {
        toast.error('Verification response did not include a session token.');
        return;
      }

      setToken(session.token);

      try {
        const me = await getCurrentUser();
        setCurrentUser(me.data);
        toast.success(response.message || 'Email verified successfully.');
        navigate('/institution/onboarding', { replace: true });
      } catch (error) {
        clearSession();
        toastApiError(error);
      }
    },
    onError: onMutationApiError(),
  });

  const resendMutation = useMutation({
    mutationFn: resendInstitutionRegistrationOtp,
    onSuccess: (response) => toast.success(response.message || 'A new OTP has been sent.'),
    onError: onMutationApiError(),
  });

  const email = form.watch('email');

  return (
    <AuthCard title="Confirm OTP" subtitle="Enter the 6-digit OTP sent to your institution contact email to complete registration.">
      <form className="space-y-5" onSubmit={form.handleSubmit((values) => verifyMutation.mutate(values))}>
        <FormField label="Email" requiredIndicator type="email" {...form.register('email')} error={form.formState.errors.email?.message} />
        <FormField label="OTP Code" requiredIndicator inputMode="numeric" maxLength={6} placeholder="Enter 6-digit OTP" {...form.register('code')} error={form.formState.errors.code?.message} />
        <Button className="w-full" size="lg" type="submit" disabled={verifyMutation.isPending}>
          {verifyMutation.isPending ? 'Verifying...' : 'Verify OTP'}
        </Button>
      </form>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
        <button
          type="button"
          className="font-semibold text-[#2F6FED] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!email || resendMutation.isPending}
          onClick={() => resendMutation.mutate({ email })}
        >
          {resendMutation.isPending ? 'Sending...' : 'Resend OTP'}
        </button>
        <Link className="font-semibold text-[#AF1512]" to="/institution/login">Back to login</Link>
      </div>
    </AuthCard>
  );
}
