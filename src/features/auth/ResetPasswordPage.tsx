import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { resetPassword, verifyResetToken } from '@/features/auth/api';
import { onMutationApiError } from '@/lib/mutationFeedback';
import { AuthCard } from '@/features/auth/AuthCard';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/shared/FormField';
import { resetPasswordSchema, type ResetPasswordFormValues } from '@/features/auth/schemas';
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

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const loginPath = resolveLoginPath(searchParams.get('portal'));
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: searchParams.get('email') || '',
      token: searchParams.get('token') || '',
      password: '',
      password_confirmation: '',
    },
  });

  const verifyMutation = useMutation({
    mutationFn: verifyResetToken,
    onError: onMutationApiError(),
  });

  const resetMutation = useMutation({
    mutationFn: resetPassword,
    onSuccess: (response) => {
      toast.success(response.message);
      navigate(loginPath, { replace: true });
    },
    onError: onMutationApiError(),
  });

  useEffect(() => {
    const email = searchParams.get('email');
    const token = searchParams.get('token');

    if (email && token) {
      verifyMutation.mutate({ email, token });
    }
  }, [searchParams]);

  return (
    <AuthCard title="Reset Password" subtitle="Choose a new password.">
      <form className="space-y-4" onSubmit={form.handleSubmit((values) => resetMutation.mutate(values))}>
        <FormField label="Email" requiredIndicator type="email" {...form.register('email')} error={form.formState.errors.email?.message} />
        <FormField label="Reset token" requiredIndicator {...form.register('token')} error={form.formState.errors.token?.message} />
        <FormField label="New password" requiredIndicator type="password" {...form.register('password')} error={form.formState.errors.password?.message} />
        <FormField label="Confirm new password" requiredIndicator type="password" {...form.register('password_confirmation')} error={form.formState.errors.password_confirmation?.message} />
        <Button className="w-full" type="submit" disabled={resetMutation.isPending}>
          {resetMutation.isPending ? 'Resetting...' : 'Reset password'}
        </Button>
      </form>
    </AuthCard>
  );
}
