import { useMemo, useRef, type ComponentRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { registerInstitution, type RegisterInstitutionPayload } from '@/features/auth/api';
import { applyServerValidationErrorsToForm } from '@/utils/formServerErrors';
import { getCities, getStates } from '@/features/public/api';
import { AuthCard } from '@/features/auth/AuthCard';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/shared/FormField';
import { FormSelectField } from '@/components/shared/FormSelectField';
import { TermsAgreementField } from '@/features/auth/TermsAgreementField';
import { INSTITUTION_REGISTER_TYPES, INSTITUTION_TYPE_OPTION_LABELS } from '@/features/auth/institutionTypes';
import { institutionRegisterSchema, type InstitutionRegisterFormValues } from '@/features/auth/schemas';
import { RecaptchaV2Checkbox } from '@/features/auth/RecaptchaV2Checkbox';
import { queryKeys } from '@/lib/queryKeys';
import { env } from '@/utils/env';

export function InstitutionRegisterPage() {
  const navigate = useNavigate();
  const recaptchaRef = useRef<ComponentRef<typeof RecaptchaV2Checkbox>>(null);
  const form = useForm<InstitutionRegisterFormValues>({
    resolver: zodResolver(institutionRegisterSchema) as Resolver<InstitutionRegisterFormValues>,
    defaultValues: {
      organisation_name: '',
      institution_type: '' as unknown as InstitutionRegisterFormValues['institution_type'],
      contact_person_name: '',
      email: '',
      phone: '',
      password: '',
      password_confirmation: '',
      address_line_1: '',
      city: '',
      state: '',
      country: 'Nigeria',
      year_established: new Date().getFullYear(),
      accepted_terms: false,
    },
  });
  const institutionType = form.watch('institution_type');
  const selectedState = form.watch('state');
  const selectedCity = form.watch('city');
  const requiresMembers = institutionType === 'professional_body';
  const requiresBranches = institutionType === 'religious_organization';

  const statesQuery = useQuery({ queryKey: queryKeys.states, queryFn: async () => (await getStates()).data });
  const selectedStateId = useMemo(() => statesQuery.data?.find((row) => row.name === selectedState)?.id ?? null, [statesQuery.data, selectedState]);
  const citiesQuery = useQuery({ queryKey: queryKeys.citiesForState(selectedStateId), queryFn: async () => (await getCities(selectedStateId as number)).data, enabled: Boolean(selectedStateId) });

  const buildPayload = (values: InstitutionRegisterFormValues): RegisterInstitutionPayload => {
    const payload: RegisterInstitutionPayload = {
      organisation_name: values.organisation_name,
      institution_type: values.institution_type,
      registration_number: values.registration_number || undefined,
      contact_person_name: values.contact_person_name,
      contact_person_title: values.contact_person_title || undefined,
      email: values.email.trim().toLowerCase(),
      phone: values.phone,
      password: values.password,
      password_confirmation: values.password_confirmation,
      address_line_1: values.address_line_1,
      address_line_2: values.address_line_2 || undefined,
      city: values.city,
      state: values.state,
      country: values.country || 'Nigeria',
      postal_code: values.postal_code || undefined,
      year_established: values.year_established,
      accepted_terms: values.accepted_terms,
      ...(values.institution_type === 'professional_body' ? { declared_members_count: values.declared_members_count } : {}),
      ...(values.institution_type === 'religious_organization' ? { declared_branches_count: values.declared_branches_count } : {}),
    };

    return payload;
  };

  const mutation = useMutation({
    mutationFn: registerInstitution,
    onSuccess: (response, values) => {
      toast.success(response.message);
      navigate('/institution/confirm-otp', { state: { email: values.email } });
      recaptchaRef.current?.reset();
    },
    onError: (error) => {
      recaptchaRef.current?.reset();
      toast.error(applyServerValidationErrorsToForm(form, error));
    },
  });

  const isSubmitting = form.formState.isSubmitting || mutation.isPending;

  const handleRegistrationSubmit = async (values: InstitutionRegisterFormValues) => {
    let payload = buildPayload(values);
    if (env.recaptchaSiteKey) {
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
    <AuthCard mode="register" title="Institution Registration" subtitle="Create an institution account and start onboarding.">
      <div className="relative">
        <form className="auth-register-form" onSubmit={form.handleSubmit(handleRegistrationSubmit)} aria-busy={isSubmitting}>
          <div className="auth-register-form-span-2">
            <FormField label="Organisation name" requiredIndicator {...form.register('organisation_name')} error={form.formState.errors.organisation_name?.message} />
          </div>
          <div className="auth-register-form-span-2">
            <FormSelectField label="Institution type" requiredIndicator {...form.register('institution_type')} error={form.formState.errors.institution_type?.message}>
              <option value="">Select institution type</option>
              {INSTITUTION_REGISTER_TYPES.map((type) => (
                <option key={type} value={type}>
                  {INSTITUTION_TYPE_OPTION_LABELS[type]}
                </option>
              ))}
            </FormSelectField>
          </div>
          <FormField label="Contact person name" requiredIndicator {...form.register('contact_person_name')} error={form.formState.errors.contact_person_name?.message} />
          <FormField label="Contact person title" {...form.register('contact_person_title')} error={form.formState.errors.contact_person_title?.message} />
          <FormField label="Email" requiredIndicator type="email" {...form.register('email')} error={form.formState.errors.email?.message} />
          <FormField label="Phone" requiredIndicator {...form.register('phone')} error={form.formState.errors.phone?.message} />
          <div className="auth-register-form-span-2">
            <FormField label="Address line 1" requiredIndicator {...form.register('address_line_1')} error={form.formState.errors.address_line_1?.message} />
          </div>
          <FormField label="Address line 2" {...form.register('address_line_2')} error={form.formState.errors.address_line_2?.message} />
          <FormSelectField label="State" requiredIndicator value={selectedState} onChange={(event) => { form.setValue('state', event.target.value, { shouldValidate: true }); form.setValue('city', '', { shouldValidate: true }); }} error={form.formState.errors.state?.message}><option value="">Select state</option>{(statesQuery.data ?? []).map((state) => <option key={state.id} value={state.name}>{state.name}</option>)}</FormSelectField>
          <FormSelectField label="City" requiredIndicator value={selectedCity} onChange={(event) => form.setValue('city', event.target.value, { shouldValidate: true })} disabled={!selectedStateId} error={form.formState.errors.city?.message}><option value="">{selectedStateId ? 'Select city' : 'Select a state first'}</option>{(citiesQuery.data ?? []).map((city) => <option key={city.id} value={city.name}>{city.name}</option>)}</FormSelectField>
          <FormField label="Country" requiredIndicator {...form.register('country')} error={form.formState.errors.country?.message} />
          <FormField label="Postal code" {...form.register('postal_code')} error={form.formState.errors.postal_code?.message} />
          <FormField label="Year established" requiredIndicator type="number" {...form.register('year_established')} error={form.formState.errors.year_established?.message} />
          <FormField label="CAC Reg. Number" {...form.register('registration_number')} error={form.formState.errors.registration_number?.message} />
          <FormField label="Password" requiredIndicator type="password" {...form.register('password')} error={form.formState.errors.password?.message} />
          <FormField label="Confirm password" requiredIndicator type="password" {...form.register('password_confirmation')} error={form.formState.errors.password_confirmation?.message} />
          {requiresMembers ? (
            <div className="auth-register-form-span-2">
              <FormField label="Declared member count" requiredIndicator type="number" {...form.register('declared_members_count')} error={form.formState.errors.declared_members_count?.message} />
            </div>
          ) : null}
          {requiresBranches ? (
            <div className="auth-register-form-span-2">
              <FormField label="Declared branches count" requiredIndicator type="number" {...form.register('declared_branches_count')} error={form.formState.errors.declared_branches_count?.message} />
            </div>
          ) : null}
          <div className="auth-register-form-span-2">
            <TermsAgreementField audience="institution" checked={form.watch('accepted_terms')} onChange={(checked) => form.setValue('accepted_terms', checked, { shouldValidate: true })} error={form.formState.errors.accepted_terms?.message} />
          </div>
          <RecaptchaV2Checkbox ref={recaptchaRef} disabled={isSubmitting} />
          <div className="auth-register-form-span-2">
            <Button className="w-full" size="lg" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating institution...' : 'Create institution account'}</Button>
          </div>
        </form>
        {isSubmitting ? (
          <div className="absolute inset-0 z-50 flex items-center justify-center rounded-2xl bg-white/75 backdrop-blur-[1px] dark:bg-slate-950/60" aria-live="polite" aria-label="Creating institution account">
            <div className="flex flex-col items-center gap-3 rounded-xl bg-white/90 px-6 py-5 shadow-lg dark:bg-slate-900/90">
              <div className="h-11 w-11 animate-spin rounded-full border-4 border-[#7A1C1C] border-t-transparent" />
              <p className="text-sm font-semibold text-[#7A1C1C] dark:text-[#F4C542]">Creating institution account...</p>
            </div>
          </div>
        ) : null}
      </div>
      <p className="mt-5 text-center text-sm text-[#6B788E] dark:text-slate-300">
        Already have an account? <Link className="font-semibold text-[#AF1512]" to="/institution/login">Login</Link>
      </p>
    </AuthCard>
  );
}
