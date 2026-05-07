import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { forgotPassword } from '@/features/auth/api';
import { onMutationApiError } from '@/lib/mutationFeedback';
import { AuthCard } from '@/features/auth/AuthCard';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/shared/FormField';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '@/features/auth/schemas';
import type { PortalKey } from '@/types/domain';

const loginPaths: Record<PortalKey, string> = {
  member: '/member/login',
  association: '/association/login',
  institution: '/institution/login',
  admin: '/admin/login',
  super_admin: '/super-admin/login',
};

function resolveLoginPath(portal: string | null) {
  return portal && portal in loginPaths ? loginPaths[portal as PortalKey] : loginPaths.member;
}

export function ForgotPasswordPage() {
  const [searchParams] = useSearchParams();
  const loginPath = resolveLoginPath(searchParams.get('portal'));

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const mutation = useMutation({
    mutationFn: forgotPassword,
    onSuccess: (response) => toast.success(response.message),
    onError: onMutationApiError(),
  });

  return (
    <AuthCard title="Forgot Password" subtitle="Request a password reset link.">
      <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <FormField label="Email" requiredIndicator type="email" {...form.register('email')} error={form.formState.errors.email?.message} />
        <Button className="w-full" type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Sending...' : 'Send reset link'}
        </Button>
        <p className="text-center text-sm text-[#667085] dark:text-slate-300">
          Remembered your password?{' '}
          <Link to={loginPath} className="font-semibold text-[#8A1538] hover:underline">
            Back to login
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}
