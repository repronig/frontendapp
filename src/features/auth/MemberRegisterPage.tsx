import { useEffect, useRef, type ComponentRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { registerMember, type RegisterMemberPayload } from '@/features/auth/api';
import { getPublicAssociations, getPublicPlatformSettings } from '@/features/public/api';
import { applyServerValidationErrorsToForm } from '@/utils/formServerErrors';
import { AuthCard } from '@/features/auth/AuthCard';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/shared/FormField';
import { FormSelectField } from '@/components/shared/FormSelectField';
import { TermsAgreementField } from '@/features/auth/TermsAgreementField';
import { memberRegisterSchema, type MemberRegisterFormValues } from '@/features/auth/schemas';
import { RecaptchaV2Checkbox } from '@/features/auth/RecaptchaV2Checkbox';
import { Alert } from '@/components/ui/alert';
import { queryKeys } from '@/lib/queryKeys';
import { env } from '@/utils/env';
import { APPLICANT_TYPE_OPTIONS } from '@/features/membership/applicantAssociations';
import type { AssociationResource } from '@/types/domain';

export function MemberRegisterPage() {
  const navigate = useNavigate();
  const recaptchaRef = useRef<ComponentRef<typeof RecaptchaV2Checkbox>>(null);
  const form = useForm<MemberRegisterFormValues>({
    resolver: zodResolver(memberRegisterSchema) as Resolver<MemberRegisterFormValues>,
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      password: '',
      password_confirmation: '',
      applicant_type: 'author',
      association_id: 0,
      accepted_terms: false,
    },
  });

  const applicantType = form.watch('applicant_type');
  const associationId = form.watch('association_id');

  const associationsQuery = useQuery({
    queryKey: [...queryKeys.publicAssociationsRegister, applicantType],
    queryFn: () => getPublicAssociations({ per_page: 100, applicant_type: applicantType }),
  });

  const associationOptions: AssociationResource[] = associationsQuery.data?.data ?? [];

  useEffect(() => {
    if (!associationOptions.length) return;
    const stillValid = associationOptions.some((a) => a.id === associationId);
    if (!stillValid) {
      form.setValue('association_id', 0, { shouldValidate: true });
    }
  }, [applicantType, associationOptions, associationId, form]);

  const platformSettingsQuery = useQuery({
    queryKey: queryKeys.publicPlatformSettings,
    queryFn: async () => (await getPublicPlatformSettings()).data,
  });

  const recReg = platformSettingsQuery.data?.recaptcha?.registration;
  const resolvedRecaptchaSiteKey =
    (recReg?.site_key && recReg.site_key.trim() !== '' ? recReg.site_key : '') ||
    (env.recaptchaSiteKey.trim() !== '' ? env.recaptchaSiteKey : '');
  const recaptchaRequiredByApi = Boolean(recReg?.required);
  const recaptchaMisconfigured = recaptchaRequiredByApi && !resolvedRecaptchaSiteKey;

  const mutation = useMutation({
    mutationFn: registerMember,
    onSuccess: (response, values) => {
      toast.success(response.message || 'Account created. Please verify the OTP sent to your email.');
      navigate('/member/confirm-otp', { state: { email: values.email } });
      form.reset();
      recaptchaRef.current?.reset();
    },
    onError: (error) => {
      recaptchaRef.current?.reset();
      toast.error(applyServerValidationErrorsToForm(form, error));
    },
  });

  const isSubmitting = form.formState.isSubmitting || mutation.isPending;

  const applicantTypeField = form.register('applicant_type');

  const handleRegistrationSubmit = async (values: MemberRegisterFormValues) => {
    let payload: RegisterMemberPayload = { ...values };
    if (resolvedRecaptchaSiteKey) {
      const token = recaptchaRef.current?.getValue();
      if (!token) {
        toast.error('Please complete the reCAPTCHA.');
        return;
      }
      payload = { ...payload, recaptcha_token: token };
    }
    await mutation.mutateAsync(payload);
  };

  return (
    <AuthCard mode="register" title="Member Registration" subtitle="Create a member account and begin onboarding.">
      <div className="relative">
        {recaptchaMisconfigured ? (
          <div className="mb-4">
            <Alert
              title="Registration is temporarily unavailable"
              description="The server requires reCAPTCHA but no site key is configured. Set RECAPTCHA_SITE_KEY on the API (and RECAPTCHA_SECRET_KEY) or add VITE_RECAPTCHA_SITE_KEY to the web build."
            />
          </div>
        ) : null}
        <form className="auth-register-form" onSubmit={form.handleSubmit(handleRegistrationSubmit)} aria-busy={isSubmitting}>
          <FormField label="First name" requiredIndicator {...form.register('first_name')} error={form.formState.errors.first_name?.message} />
          <FormField label="Last name" requiredIndicator {...form.register('last_name')} error={form.formState.errors.last_name?.message} />
          <FormField label="Email" requiredIndicator type="email" {...form.register('email')} error={form.formState.errors.email?.message} />
          <FormField label="Phone" requiredIndicator {...form.register('phone')} error={form.formState.errors.phone?.message} />
          <div className="auth-register-form-span-2">
            <FormSelectField
              label="Applicant type"
              requiredIndicator
              name={applicantTypeField.name}
              ref={applicantTypeField.ref}
              onBlur={applicantTypeField.onBlur}
              onChange={(event) => {
                applicantTypeField.onChange(event);
                form.setValue('association_id', 0, { shouldValidate: true });
              }}
              error={form.formState.errors.applicant_type?.message}
            >
              {APPLICANT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </FormSelectField>
          </div>
          <div className="auth-register-form-span-2">
            <FormSelectField
              label="Association"
              requiredIndicator
              disabled={associationsQuery.isLoading}
              {...form.register('association_id')}
              error={form.formState.errors.association_id?.message}
            >
              <option value="">Select an association</option>
              {associationOptions.map((association) => (
                <option key={association.id} value={association.id}>
                  {association.name}
                </option>
              ))}
            </FormSelectField>
          </div>
          <FormField label="Password" requiredIndicator type="password" {...form.register('password')} error={form.formState.errors.password?.message} />
          <FormField label="Confirm password" requiredIndicator type="password" {...form.register('password_confirmation')} error={form.formState.errors.password_confirmation?.message} />
          <div className="auth-register-form-span-2">
            <TermsAgreementField audience="member" checked={form.watch('accepted_terms')} onChange={(checked) => form.setValue('accepted_terms', checked, { shouldValidate: true })} error={form.formState.errors.accepted_terms?.message} />
          </div>
          <RecaptchaV2Checkbox ref={recaptchaRef} siteKey={resolvedRecaptchaSiteKey || undefined} disabled={isSubmitting} />
          <div className="auth-register-form-span-2">
            <Button className="w-full" size="lg" type="submit" disabled={isSubmitting || recaptchaMisconfigured}>
              {isSubmitting ? 'Creating account...' : 'Create member account'}
            </Button>
          </div>
        </form>
        {isSubmitting ? (
          <div className="absolute inset-0 z-50 flex items-center justify-center rounded-2xl bg-white/75 backdrop-blur-[1px] dark:bg-slate-950/60" aria-live="polite" aria-label="Creating account">
            <div className="flex flex-col items-center gap-3 rounded-xl bg-white/90 px-6 py-5 shadow-lg dark:bg-slate-900/90">
              <div className="h-11 w-11 animate-spin rounded-full border-4 border-[#7A1C1C] border-t-transparent" />
              <p className="text-sm font-semibold text-[#7A1C1C] dark:text-[#F4C542]">Creating your account...</p>
            </div>
          </div>
        ) : null}
      </div>
      <p className="mt-5 text-center text-sm text-[#6B788E] dark:text-slate-300">
        Already have an account? <Link to="/member/login" className="font-semibold text-[#AF1512]">Login</Link>
      </p>
    </AuthCard>
  );
}
