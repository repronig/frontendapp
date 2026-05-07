import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { getAssociationProfile, removeAssociationLogo, updateAssociationProfile, uploadAssociationLogo } from '@/features/association/api';
import { getCities, getStates } from '@/features/public/api';
import { onMutationApiError } from '@/lib/mutationFeedback';
import { FormField } from '@/components/shared/FormField';
import { FormSelectField } from '@/components/shared/FormSelectField';
import { ProfileCompletenessCard } from '@/components/shared/ProfileCompletenessCard';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { resolveFileUrl } from '@/utils/fileUrl';
import { queryKeys } from '@/lib/queryKeys';

export function AssociationProfilePage() {
  const queryClient = useQueryClient();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [form, setForm] = useState({ name: '', type: '', description: '', contact_email: '', contact_phone: '', address_line_1: '', address_line_2: '', state_id: '', city_id: '', country: 'Nigeria', postal_code: '' });
  const profileQuery = useQuery({ queryKey: queryKeys.associationProfile, queryFn: getAssociationProfile });
  const profile = profileQuery.data?.data;
  const statesQuery = useQuery({ queryKey: queryKeys.states, queryFn: async () => (await getStates()).data });
  const selectedStateId = form.state_id ? Number(form.state_id) : null;
  const citiesQuery = useQuery({
    queryKey: queryKeys.citiesForState(selectedStateId),
    queryFn: async () => (await getCities(selectedStateId as number)).data,
    enabled: Boolean(selectedStateId),
  });
  const cityBelongsToSelectedState = useMemo(() => {
    if (!form.city_id || !selectedStateId) return true;
    return (citiesQuery.data ?? []).some((city) => String(city.id) === form.city_id);
  }, [citiesQuery.data, form.city_id, selectedStateId]);

  useEffect(() => {
    if (!profile) return;
    setForm({
      name: profile.name ?? '', type: profile.type ?? '', description: profile.description ?? '', contact_email: profile.contact_email ?? '', contact_phone: profile.contact_phone ?? '',
      address_line_1: profile.address.address_line_1 ?? '', address_line_2: profile.address.address_line_2 ?? '', state_id: profile.address.state_id ? String(profile.address.state_id) : '', city_id: profile.address.city_id ? String(profile.address.city_id) : '', country: profile.address.country ?? 'Nigeria', postal_code: profile.address.postal_code ?? '',
    });
  }, [profile]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.associationProfile });
  const saveMutation = useMutation({ mutationFn: (payload: typeof form) => updateAssociationProfile({ ...payload, state_id: payload.state_id ? Number(payload.state_id) : null, city_id: payload.city_id ? Number(payload.city_id) : null }), onSuccess: () => { refresh(); toast.success('Association profile updated successfully.'); }, onError: onMutationApiError() });
  const logoMutation = useMutation({ mutationFn: uploadAssociationLogo, onSuccess: () => { setLogoFile(null); refresh(); toast.success('Association logo uploaded successfully.'); }, onError: onMutationApiError() });
  const removeLogoMutation = useMutation({ mutationFn: removeAssociationLogo, onSuccess: () => { refresh(); toast.success('Association logo removed successfully.'); }, onError: onMutationApiError() });

  const logoPreview = logoFile ? URL.createObjectURL(logoFile) : resolveFileUrl(profile?.logo_medium_url ?? profile?.logo_url ?? null);

  return (
    <div className="space-y-6">
      <SectionHeader title="Association profile" description="Identity and contacts." />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="space-y-5 p-5">
          <div className="flex flex-col gap-5 rounded-2xl border border-[#E2E8F0] dark:border-slate-800 bg-[#FCFCF7] dark:bg-slate-900 p-5 sm:flex-row sm:items-center">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl border border-[#D6E6FF] bg-[#F4F8FF] dark:bg-slate-900 text-[#1D4ED8] dark:text-sky-300">
              {logoPreview ? <img src={logoPreview} alt={profile?.name ?? 'Association logo'} className="h-full w-full object-cover" /> : <Building2 className="h-8 w-8" />}
            </div>
            <div className="flex-1 space-y-3">
              <div><p className="text-sm font-semibold text-[#0F172A] dark:text-slate-50">Association logo</p><p className="mt-1 text-sm text-[#64748B]">Use the official association logo for portal identity and member-facing communication.</p></div>
              <div className="flex flex-wrap gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#CBD5E1] bg-white dark:bg-slate-950 px-4 py-2 text-sm font-semibold text-[#0F172A] dark:text-slate-50 transition hover:border-[#94A3B8]">
                  <Upload className="h-4 w-4" /> Choose image
                  <input type="file" accept="image/*" className="hidden" onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)} />
                </label>
                <Button type="button" onClick={() => logoFile && logoMutation.mutate(logoFile)} disabled={!logoFile || logoMutation.isPending}>{logoMutation.isPending ? 'Uploading...' : 'Upload logo'}</Button>
                {profile?.logo_url ? <Button type="button" variant="outline" onClick={() => removeLogoMutation.mutate()} disabled={removeLogoMutation.isPending}>{removeLogoMutation.isPending ? 'Removing...' : 'Remove logo'}</Button> : null}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Association name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            <FormField label="Type" requiredIndicator value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))} />
            <FormField label="Contact email" requiredIndicator value={form.contact_email} onChange={(event) => setForm((current) => ({ ...current, contact_email: event.target.value }))} />
            <FormField label="Contact phone" requiredIndicator value={form.contact_phone} onChange={(event) => setForm((current) => ({ ...current, contact_phone: event.target.value }))} />
            <FormField label="Address line 1" requiredIndicator value={form.address_line_1} onChange={(event) => setForm((current) => ({ ...current, address_line_1: event.target.value }))} />
            <FormField label="Address line 2" value={form.address_line_2} onChange={(event) => setForm((current) => ({ ...current, address_line_2: event.target.value }))} />
            <FormSelectField label="State" value={form.state_id} onChange={(event) => setForm((current) => ({ ...current, state_id: event.target.value, city_id: '' }))} placeholder={statesQuery.isLoading ? 'Loading states...' : 'Select state'} disabled={statesQuery.isLoading}>
              {(statesQuery.data ?? []).map((state) => <option key={state.id} value={state.id}>{state.name}</option>)}
            </FormSelectField>
            <FormSelectField label="City" value={cityBelongsToSelectedState ? form.city_id : ''} onChange={(event) => setForm((current) => ({ ...current, city_id: event.target.value }))} placeholder={selectedStateId ? (citiesQuery.isLoading ? 'Loading cities...' : 'Select city') : 'Select a state first'} disabled={!selectedStateId || citiesQuery.isLoading}>
              {(citiesQuery.data ?? []).map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
            </FormSelectField>
            <FormField label="Country" requiredIndicator value={form.country} onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))} />
            <FormField label="Postal code" value={form.postal_code} onChange={(event) => setForm((current) => ({ ...current, postal_code: event.target.value }))} />
            <div className="md:col-span-2"><FormField label="Description" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></div>
            <div className="md:col-span-2 flex justify-end"><Button type="button" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Saving...' : 'Save profile'}</Button></div>
          </div>
        </Card>

        <ProfileCompletenessCard title="Association readiness" description="Required organization fields." completeness={profile?.profile_completeness} />
      </div>    </div>
  );
}