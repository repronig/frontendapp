import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getMemberProfile, updateMemberProfile } from '@/features/member/api';
import { getCities, getStates } from '@/features/public/api';
import { onMutationApiError } from '@/lib/mutationFeedback';
import { FormField } from '@/components/shared/FormField';
import { FormSelectField } from '@/components/shared/FormSelectField';
import { ModalFormSection, PortalFormFooter } from '@/components/shared/ModalForm';
import { ProfileCompletenessCard } from '@/components/shared/ProfileCompletenessCard';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { memberProfileSchema, type MemberProfileFormValues } from '@/features/member-profile/schemas';
import { formatDate } from '@/utils/format';
import { useAuthStore } from '@/store/auth.store';
import { mergedFirstLastFromUsers } from '@/utils/userNamesFromUser';
import { queryKeys } from '@/lib/queryKeys';

const DEFAULT_COUNTRY = 'Nigeria';

const EMPTY_MEMBER_PROFILE_FORM: MemberProfileFormValues = {
  first_name: '',
  last_name: '',
  date_of_birth: '',
  occupation: '',
  residential_address_line_1: '',
  residential_address_line_2: '',
  city: '',
  state: '',
  country: DEFAULT_COUNTRY,
  postal_code: '',
  publisher_name: '',
  corporate_name: '',
  member_provided_id: '',
};

export function MemberProfilePage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.currentUser);
  const profileQuery = useQuery({ queryKey: queryKeys.memberProfile, queryFn: getMemberProfile });
  const profile = profileQuery.data?.data ?? null;

  const profileFormValues = useMemo((): MemberProfileFormValues => {
    if (!profile) return EMPTY_MEMBER_PROFILE_FORM;

    const { first_name: firstName, last_name: lastName } = mergedFirstLastFromUsers(
      profile.user,
      currentUser?.member_profile?.user,
      currentUser?.user,
    );

    const country = (profile.profile?.country ?? '').trim() || DEFAULT_COUNTRY;

    return {
      first_name: firstName,
      last_name: lastName,
      date_of_birth: profile.profile?.date_of_birth ?? '',
      occupation: profile.profile?.occupation ?? '',
      residential_address_line_1: profile.profile?.residential_address_line_1 ?? '',
      residential_address_line_2: profile.profile?.residential_address_line_2 ?? '',
      city: profile.profile?.city ?? '',
      state: profile.profile?.state ?? '',
      country,
      postal_code: profile.profile?.postal_code ?? '',
      publisher_name: profile.profile?.publisher_name ?? '',
      corporate_name: profile.profile?.corporate_name ?? '',
      member_provided_id: profile.member_provided_id ?? '',
    };
  }, [
    profile,
    profile?.member_id,
    profile?.user?.id,
    profile?.user?.first_name,
    profile?.user?.last_name,
    profile?.user?.name,
    currentUser?.user?.id,
    currentUser?.user?.first_name,
    currentUser?.user?.last_name,
    currentUser?.user?.name,
    currentUser?.member_profile?.user?.id,
    currentUser?.member_profile?.user?.first_name,
    currentUser?.member_profile?.user?.last_name,
    currentUser?.member_profile?.user?.name,
  ]);

  const form = useForm<MemberProfileFormValues>({
    resolver: zodResolver(memberProfileSchema),
    defaultValues: EMPTY_MEMBER_PROFILE_FORM,
    values: profileFormValues,
  });

  const selectedState = form.watch('state');
  const selectedCity = form.watch('city');

  const statesQuery = useQuery({
    queryKey: queryKeys.memberProfileStates,
    queryFn: async () => (await getStates()).data,
  });

  const selectedStateId = useMemo(
    () => statesQuery.data?.find((row) => row.name === selectedState)?.id ?? null,
    [statesQuery.data, selectedState],
  );

  const citiesQuery = useQuery({
    queryKey: queryKeys.memberProfileCities(selectedStateId),
    queryFn: async () => (await getCities(selectedStateId as number)).data,
    enabled: Boolean(selectedStateId),
  });

  const cityOptions = useMemo(() => {
    const rows = [...(citiesQuery.data ?? [])];
    if (selectedCity && !rows.some((c) => c.name === selectedCity)) {
      rows.unshift({ id: -1, name: selectedCity, state_id: selectedStateId ?? 0 });
    }
    return rows;
  }, [citiesQuery.data, selectedCity, selectedStateId]);

  const saveMutation = useMutation({
    mutationFn: updateMemberProfile,
    onSuccess: (response) => {
      queryClient.setQueryData(queryKeys.memberProfile, response);
      toast.success(response.message);
    },
    onError: onMutationApiError(),
  });

  return (
    <div className="space-y-6">
      <SectionHeader title="My Profile" description="Your membership record." />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="space-y-5 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-lg font-semibold text-[#101828]">Profile details</p>
              <p className="mt-1 text-sm text-[#667085] dark:text-slate-300">These details are used for your membership profile and account workflows.</p>
            </div>
            <StatusBadge value={profile?.approval_status ?? 'pending'} />
          </div>

          {profile?.association?.name ? (
            <Alert title="Association linked" description={`Your membership record is currently attached to ${profile.association.name}.`} />
          ) : null}

          <form className="space-y-8" onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}>
            <ModalFormSection badge="1" title="Personal" description="Identity details used for your membership record.">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="First name" requiredIndicator error={form.formState.errors.first_name?.message} {...form.register('first_name')} />
                <FormField label="Last name" requiredIndicator error={form.formState.errors.last_name?.message} {...form.register('last_name')} />
                <FormField label="Date of birth" type="date" error={form.formState.errors.date_of_birth?.message} {...form.register('date_of_birth')} />
                <FormField label="Occupation" error={form.formState.errors.occupation?.message} {...form.register('occupation')} />
              </div>
            </ModalFormSection>
            <ModalFormSection badge="2" title="Address" description="Residential address on file for correspondence.">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <FormField label="Address line 1" requiredIndicator error={form.formState.errors.residential_address_line_1?.message} {...form.register('residential_address_line_1')} />
                </div>
                <div className="md:col-span-2">
                  <FormField label="Address line 2" error={form.formState.errors.residential_address_line_2?.message} {...form.register('residential_address_line_2')} />
                </div>
                <FormSelectField
                  label="State"
                  requiredIndicator
                  value={selectedState}
                  onChange={(event) => {
                    form.setValue('state', event.target.value, { shouldValidate: true });
                    form.setValue('city', '', { shouldValidate: true });
                  }}
                  error={form.formState.errors.state?.message}
                >
                  <option value="">Select state</option>
                  {(statesQuery.data ?? []).map((state) => (
                    <option key={state.id} value={state.name}>
                      {state.name}
                    </option>
                  ))}
                </FormSelectField>
                <FormSelectField
                  label="City"
                  requiredIndicator
                  value={selectedCity}
                  onChange={(event) => form.setValue('city', event.target.value, { shouldValidate: true })}
                  disabled={!selectedStateId}
                  error={form.formState.errors.city?.message}
                >
                  <option value="">{selectedStateId ? 'Select city' : 'Select a state first'}</option>
                  {cityOptions.map((city) => (
                    <option key={city.id} value={city.name}>
                      {city.name}
                    </option>
                  ))}
                </FormSelectField>
                <FormField label="Country" requiredIndicator error={form.formState.errors.country?.message} {...form.register('country')} />
                <FormField label="Postal code" error={form.formState.errors.postal_code?.message} {...form.register('postal_code')} />
              </div>
            </ModalFormSection>
            <ModalFormSection badge="3" title="Professional & reference" description="Publisher or corporate name and any reference ID you use with your society.">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Publisher name" error={form.formState.errors.publisher_name?.message} {...form.register('publisher_name')} />
                <FormField label="Corporate name" error={form.formState.errors.corporate_name?.message} {...form.register('corporate_name')} />
                <FormField label="Your member / reference ID (optional)" error={form.formState.errors.member_provided_id?.message} {...form.register('member_provided_id')} />
              </div>
            </ModalFormSection>
            <PortalFormFooter className="-mx-5 -mb-5 rounded-b-xl">
              <Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Saving...' : 'Save profile'}</Button>
            </PortalFormFooter>
          </form>
        </Card>

        <div className="space-y-4">
          <ProfileCompletenessCard tone="cream" completeness={profile?.profile_completeness} />
          <Card className="space-y-3 p-5">
            <p className="text-sm font-semibold text-[#101828]">Membership metadata</p>
            <div className="space-y-2 text-sm text-[#475467] dark:text-slate-300">
              <p><span className="font-medium text-[#344054] dark:text-slate-200">Member code:</span> {profile?.member_code ?? '—'}</p>
              <p><span className="font-medium text-[#344054] dark:text-slate-200">Member type:</span> {profile?.member_type ?? '—'}</p>
              <p><span className="font-medium text-[#344054] dark:text-slate-200">Reference ID:</span> {profile?.member_provided_id?.trim() ? profile.member_provided_id : '—'}</p>
              <p><span className="font-medium text-[#344054] dark:text-slate-200">Joined:</span> {formatDate(profile?.joined_at) || '—'}</p>
              <p><span className="font-medium text-[#344054] dark:text-slate-200">Activated:</span> {formatDate(profile?.activated_at) || '—'}</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
