import { useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getEmailVerificationStatus, resendVerificationEmail, verifyEmailWithSignedUrl } from '@/features/auth/api';
import { onMutationApiError } from '@/lib/mutationFeedback';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuthStore } from '@/store/auth.store';
import { queryKeys } from '@/lib/queryKeys';

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = useAuthStore((state) => state.token);
  const currentUser = useAuthStore((state) => state.currentUser);

  const statusQuery = useQuery({
    queryKey: queryKeys.emailVerificationStatus,
    queryFn: getEmailVerificationStatus,
    enabled: Boolean(token),
  });

  const resendMutation = useMutation({
    mutationFn: resendVerificationEmail,
    onSuccess: (response) => {
      toast.success(response.message);
      const email = statusQuery.data?.data.email || currentUser?.user?.email || '';
      const accountType = currentUser?.user?.account_type;
      if (accountType === 'member') {
        navigate('/member/confirm-otp', { replace: true, state: { email } });
        return;
      }
      if (accountType === 'institution_user') {
        navigate('/institution/confirm-otp', { replace: true, state: { email } });
      }
    },
    onError: onMutationApiError(),
  });

  const verifyMutation = useMutation({
    mutationFn: verifyEmailWithSignedUrl,
    onSuccess: (response) => toast.success(response.message),
    onError: onMutationApiError(),
  });

  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/verify-email/') && location.search && token) {
      verifyMutation.mutate(path.replace('/verify-email', '/email/verify') + location.search);
    }
  }, [location.pathname, location.search, token]);

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10 sm:px-6 lg:px-8">
      <Card className="w-full">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Verify your email</h1>
        <div className="mt-2 space-y-2 text-sm text-slate-600"><p>Protected portals remain blocked until the backend reports your email as verified.</p><p>Verification currently depends on an authenticated session, so open the email link while signed in or log in first before retrying the signed verification link.</p></div>
        <div className="mt-6 space-y-4">
          <div className="rounded-xl bg-slate-50 dark:bg-slate-900 p-4 text-sm text-slate-700 dark:text-slate-300">
            <p><span className="font-medium">Email:</span> {statusQuery.data?.data.email || '—'}</p>
            <p className="mt-1"><span className="font-medium">Verified:</span> {statusQuery.data?.data.email_verified ? 'Yes' : 'No'}</p>
          </div>
          <Button onClick={() => resendMutation.mutate()} disabled={resendMutation.isPending || !token}>
            {resendMutation.isPending ? 'Sending...' : 'Resend verification email'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
