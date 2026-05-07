import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getCurrentUser, login } from '@/features/auth/api';
import { onMutationApiError, toastApiError } from '@/lib/mutationFeedback';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/shared/FormField';
import { AuthCard } from '@/features/auth/AuthCard';
import { useAuthStore } from '@/store/auth.store';
import type { PortalKey } from '@/types/domain';
import { getPortalHomePath, isPortalAllowed } from '@/features/me/portal';
import { loginSchema, type LoginFormValues } from '@/features/auth/schemas';

const portalTitles: Record<PortalKey, string> = {
  member: 'Member Portal Login',
  association: 'Association Portal Login',
  institution: 'Institution Portal Login',
  admin: 'Admin Portal Login',
  super_admin: 'Super Admin Login',
};

export function PortalLoginPage({ portal }: { portal: PortalKey }) {
  const navigate = useNavigate();
  const setToken = useAuthStore((state) => state.setToken);
  const setCurrentUser = useAuthStore((state) => state.setCurrentUser);
  const setPendingTwoFactor = useAuthStore((state) => state.setPendingTwoFactor);
  const clearSession = useAuthStore((state) => state.clearSession);

  const form = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: async (response, variables) => {
      const session = response.data;
      if (session.two_factor_required && session.challenge_id) {
        setPendingTwoFactor({ challengeId: session.challenge_id, portal, email: variables.email, expiresAt: session.expires_at });
        toast.success('Two-factor verification is required.');
        navigate('/two-factor');
        return;
      }
      if (!session.token) {
        toast.error('Login response did not include a token.');
        return;
      }
      setToken(session.token);
      try {
        const me = await getCurrentUser();
        if (!isPortalAllowed(me.data, portal)) {
          clearSession();
          toast.error('This account does not have access to the selected portal.');
          return;
        }
        setCurrentUser(me.data);
        toast.success(response.message);
        navigate(getPortalHomePath(me.data));
      } catch (error) {
        clearSession();
        toastApiError(error);
      }
    },
    onError: onMutationApiError(),
  });

  return (
    <AuthCard title={portalTitles[portal]} subtitle="Sign in with your REPRONIG account.">
      <form className="space-y-5" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <FormField label="Email" requiredIndicator type="email" placeholder="yourmail@example.com" {...form.register('email')} error={form.formState.errors.email?.message} />
        <FormField label="Password" requiredIndicator type="password" placeholder="Enter your password" {...form.register('password')} error={form.formState.errors.password?.message} />
        <Button className="mt-2 w-full" size="lg" type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Signing in...' : 'Login now'}
        </Button>
      </form>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
        <Link className="font-semibold text-[#2F6FED]" to={`/forgot-password?portal=${portal}`}>Forgot ?</Link>
        <div className="flex flex-wrap items-center gap-3 text-[#98A2B3]">
          {portal === 'member' ? <Link className="font-semibold text-[#2F6FED]" to="/member/register">Sign Up</Link> : null}
          {portal === 'institution' ? <Link className="font-semibold text-[#2F6FED]" to="/institution/register">Register Institution</Link> : null}
        </div>
      </div>
    </AuthCard>
  );
}
