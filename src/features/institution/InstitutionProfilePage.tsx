import { useEffect, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, FileText, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { getInstitutionProfile, removeInstitutionLogo, updateInstitutionProfile, uploadInstitutionDocument, uploadInstitutionLogo } from '@/features/institution/api';
import { onMutationApiError } from '@/lib/mutationFeedback';
import { FormField } from '@/components/shared/FormField';
import { FileCard } from '@/components/shared/FileCard';
import { FormSelectField } from '@/components/shared/FormSelectField';
import { ProfileCompletenessCard } from '@/components/shared/ProfileCompletenessCard';
import { ModalFormSection, PortalFormFooter } from '@/components/shared/ModalForm';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { institutionProfileSchema, type InstitutionProfileFormValues } from '@/features/institution/schemas';
import { resolveFileUrl } from '@/utils/fileUrl';
import { queryKeys } from '@/lib/queryKeys';

const institutionTypeOptions = [
  { label: 'University', value: 'university' }, { label: 'Polytechnic', value: 'polytechnic' }, { label: 'College of Education', value: 'college_of_education' },
  { label: 'Professional Body', value: 'professional_body' }, { label: 'Religious Organisation', value: 'religious_organization' },
  { label: 'Corporate Organisation', value: 'corporate_organization' }, { label: 'Government Agency', value: 'government_agency' }, { label: 'NGO', value: 'ngo' },
  { label: 'Research Institute', value: 'research_institute' }, { label: 'Library', value: 'library' }, { label: 'Other', value: 'other' },
];


const academicInstitutionTypes = new Set(['university', 'polytechnic', 'college_of_education', 'research_institute']);

const requiredKycDocumentLabels: Record<string, string> = {
  cac_certificate: 'CAC Certificate',
  proof_of_address: 'Proof of Address',
};

const requiredKycDocuments = [
  {
    type: 'cac_certificate',
    label: 'CAC Certificate',
    subText: 'Your registration document from Corporate Affairs Commission',
  },
  {
    type: 'proof_of_address',
    label: 'Proof of Address',
    subText: 'This can be Nepa Bill, Bank statement, Phone Bill',
  },
] as const;

export function InstitutionProfilePage() {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [kycFiles, setKycFiles] = useState<Record<string, File | null>>({});
  const queryClient = useQueryClient();
  const profileQuery = useQuery({ queryKey: queryKeys.institutionProfile, queryFn: getInstitutionProfile });
  const profile = profileQuery.data?.data;

  const form = useForm<InstitutionProfileFormValues>({
    resolver: zodResolver(institutionProfileSchema) as Resolver<InstitutionProfileFormValues>,
    defaultValues: {
      contact_person_name: '', contact_person_title: '', phone: '', address_line_1: '', address_line_2: '', city: '', state: '', country: 'Nigeria', postal_code: '', year_established: undefined,
      faculties_count: undefined, member_count: undefined, branches_count: undefined, institution_type: 'university', academic_staff_count: undefined, administrative_staff_count: undefined, campuses_count: undefined,
    },
  });

  useEffect(() => {
    if (!profile) return;
    form.reset({
      contact_person_name: profile.contact_person_name ?? '', contact_person_title: profile.contact_person_title ?? '', phone: profile.phone ?? '', address_line_1: profile.address.address_line_1 ?? '', address_line_2: profile.address.address_line_2 ?? '',
      city: profile.address.city_name ?? profile.address.city ?? '', state: profile.address.state_name ?? profile.address.state ?? '', country: profile.address.country ?? 'Nigeria', postal_code: profile.address.postal_code ?? '',
      year_established: profile.year_established ?? undefined, faculties_count: profile.faculties_count ?? undefined, member_count: profile.member_count ?? undefined, branches_count: profile.branches_count ?? undefined,
      institution_type: (profile.institution_type as InstitutionProfileFormValues['institution_type']) ?? 'university', academic_staff_count: profile.academic_staff_count ?? undefined,
      administrative_staff_count: profile.administrative_staff_count ?? undefined, campuses_count: profile.campuses_count ?? undefined,
    });
  }, [form, profile]);

  const selectedInstitutionType = form.watch('institution_type');
  const isApprovedInstitution = profile?.account_status === 'active';
  const usesAcademicMetrics = academicInstitutionTypes.has(selectedInstitutionType);

  const submitProfile = (values: InstitutionProfileFormValues) => {
    const payload = usesAcademicMetrics
      ? {
          ...values,
          member_count: undefined,
          branches_count: undefined,
        }
      : {
          ...values,
          faculties_count: undefined,
          academic_staff_count: undefined,
          administrative_staff_count: undefined,
          campuses_count: undefined,
        };

    saveMutation.mutate(payload);
  };

  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.institutionProfile });
  const saveMutation = useMutation({ mutationFn: updateInstitutionProfile, onSuccess: (response) => { queryClient.setQueryData(queryKeys.institutionProfile, response); toast.success(response.message); }, onError: onMutationApiError() });
  const logoMutation = useMutation({ mutationFn: uploadInstitutionLogo, onSuccess: () => { setLogoFile(null); refresh(); toast.success('Institution logo uploaded successfully.'); }, onError: onMutationApiError() });
  const removeLogoMutation = useMutation({ mutationFn: removeInstitutionLogo, onSuccess: () => { refresh(); toast.success('Institution logo removed successfully.'); }, onError: onMutationApiError() });
  const documentMutation = useMutation({
    mutationFn: ({ documentType, file }: { documentType: string; file: File }) => uploadInstitutionDocument({ document_type: documentType, file }),
    onSuccess: () => {
      setKycFiles({});
      refresh();
      toast.success('KYC document uploaded successfully.');
    },
    onError: onMutationApiError(),
  });


  const logoPreview = logoFile ? URL.createObjectURL(logoFile) : resolveFileUrl(profile?.logo_medium_url ?? profile?.logo_url ?? null);

  const kycDocuments = profile?.kyc_documents ?? [];
  const documentByType = new Map(kycDocuments.map((document) => [document.document_type, document]));
  const kycReadiness = profile?.kyc_readiness;
  const missingKycDocuments = kycReadiness?.missing_documents ?? requiredKycDocuments.filter((document) => !documentByType.has(document.type)).map((document) => document.type);


  return (
    <div className="space-y-6">
      <SectionHeader title="Institution profile" description="Identity and contacts." />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="space-y-5 p-5">
          <div className="flex flex-col gap-5 rounded-2xl border border-[#E2E8F0] dark:border-slate-800 bg-[#FCFCF7] dark:bg-slate-900 p-5 sm:flex-row sm:items-center">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl border border-[#D6E6FF] bg-[#F4F8FF] dark:bg-slate-900 text-[#1D4ED8] dark:text-sky-300">
              {logoPreview ? <img src={logoPreview} alt={profile?.name ?? 'Institution logo'} className="h-full w-full object-cover" /> : <Building2 className="h-8 w-8" />}
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-sm font-semibold text-[#0F172A] dark:text-slate-50">Institution logo</p>
                <p className="mt-1 text-sm text-[#64748B]">Upload or replace the logo used across institution-facing screens.</p>
              </div>
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

          <form className="space-y-8" onSubmit={form.handleSubmit(submitProfile)}>
            <ModalFormSection badge="1" title="Contact & address" description="Primary contact details and registered address. Institution type locks after approval.">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Contact person name" requiredIndicator error={form.formState.errors.contact_person_name?.message} {...form.register('contact_person_name')} />
                <FormField label="Contact person title" error={form.formState.errors.contact_person_title?.message} {...form.register('contact_person_title')} />
                <FormField label="Phone" requiredIndicator error={form.formState.errors.phone?.message} {...form.register('phone')} />
                <FormSelectField label="Institution type" requiredIndicator options={institutionTypeOptions} disabled={isApprovedInstitution} error={form.formState.errors.institution_type?.message} {...form.register('institution_type')} />
                {isApprovedInstitution ? <p className="md:col-span-2 -mt-1 text-xs text-[#64748B] dark:text-slate-300">Institution type is locked after admin approval.</p> : null}
                <FormField label="Address line 1" requiredIndicator error={form.formState.errors.address_line_1?.message} {...form.register('address_line_1')} />
                <FormField label="Address line 2" error={form.formState.errors.address_line_2?.message} {...form.register('address_line_2')} />
                <FormField label="City" requiredIndicator error={form.formState.errors.city?.message} {...form.register('city')} />
                <FormField label="State" requiredIndicator error={form.formState.errors.state?.message} {...form.register('state')} />
                <FormField label="Country" requiredIndicator error={form.formState.errors.country?.message} {...form.register('country')} />
                <FormField label="Postal code" error={form.formState.errors.postal_code?.message} {...form.register('postal_code')} />
              </div>
            </ModalFormSection>
            <ModalFormSection badge="2" title="Organisation scale" description="Year established and counts that match your institution type.">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Year established" requiredIndicator type="number" error={form.formState.errors.year_established?.message} {...form.register('year_established', { valueAsNumber: true })} />
                {usesAcademicMetrics ? (
                  <>
                    <FormField label="Faculties count" requiredIndicator type="number" error={form.formState.errors.faculties_count?.message} {...form.register('faculties_count', { valueAsNumber: true })} />
                    <FormField label="Academic staff count" requiredIndicator type="number" error={form.formState.errors.academic_staff_count?.message} {...form.register('academic_staff_count', { valueAsNumber: true })} />
                    <FormField label="Administrative staff count" requiredIndicator type="number" error={form.formState.errors.administrative_staff_count?.message} {...form.register('administrative_staff_count', { valueAsNumber: true })} />
                    <FormField label="Campuses count" requiredIndicator type="number" error={form.formState.errors.campuses_count?.message} {...form.register('campuses_count', { valueAsNumber: true })} />
                  </>
                ) : (
                  <>
                    <FormField label="Member count" requiredIndicator type="number" error={form.formState.errors.member_count?.message} {...form.register('member_count', { valueAsNumber: true })} />
                    <FormField label="Branches count" requiredIndicator type="number" error={form.formState.errors.branches_count?.message} {...form.register('branches_count', { valueAsNumber: true })} />
                  </>
                )}
              </div>
            </ModalFormSection>
            <PortalFormFooter className="-mx-5 -mb-5 rounded-b-xl">
              <Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Saving...' : 'Save profile'}</Button>
            </PortalFormFooter>
          </form>

          <div className="space-y-4 border-t border-[#EAECF0] pt-5 dark:border-slate-800">
            <div>
              <p className="text-sm font-semibold text-[#0F172A] dark:text-slate-50">KYC documents</p>
              <p className="mt-1 text-sm text-[#64748B] dark:text-slate-300">{isApprovedInstitution ? 'KYC documents are locked after admin approval and remain available here for reference.' : 'Upload the two required onboarding documents. Submitted documents are shown here for reference and cannot be edited from this form.'}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {requiredKycDocuments.map((requiredDocument) => {
                const uploadedDocument = documentByType.get(requiredDocument.type);
                const selectedFile = kycFiles[requiredDocument.type];

                return (
                  <div key={requiredDocument.type} className="space-y-3 rounded-2xl border border-[#E2E8F0] bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                    {uploadedDocument ? (
                      <FileCard
                        title={requiredDocument.label}
                        subtitle={`${uploadedDocument.file_name ?? 'Uploaded document'} · ${uploadedDocument.verification_status ?? 'pending'}`}
                        fileUrl={uploadedDocument.file_url}
                        downloadUrl={uploadedDocument.download_url}
                      />
                    ) : isApprovedInstitution ? (
                      <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-4 text-sm text-[#64748B] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                        {requiredDocument.label} has not been uploaded. KYC uploads are locked after admin approval.
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FCFCF7] text-[#8A1538] dark:bg-slate-900">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium text-[#0F172A] dark:text-slate-50">{requiredDocument.label}</p>
                            <p className="mt-1 text-sm text-[#64748B] dark:text-slate-300">{requiredDocument.subText}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#CBD5E1] bg-white px-4 py-2 text-sm font-semibold text-[#0F172A] transition hover:border-[#94A3B8] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50">
                            <Upload className="h-4 w-4" /> Choose file
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              className="hidden"
                              onChange={(event) => setKycFiles((current) => ({ ...current, [requiredDocument.type]: event.target.files?.[0] ?? null }))}
                            />
                          </label>
                          <span className="text-sm text-[#64748B] dark:text-slate-300">{selectedFile?.name ?? 'No file selected'}</span>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={!selectedFile || documentMutation.isPending}
                            onClick={() => selectedFile && documentMutation.mutate({ documentType: requiredDocument.type, file: selectedFile })}
                          >
                            {documentMutation.isPending ? 'Uploading...' : 'Upload'}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <ProfileCompletenessCard tone="cream" title="Institution readiness" description="Required fields and KYC progress." completeness={profile?.profile_completeness} />
          <Card className="space-y-3 border-[#BFD8C2] bg-[#F0FAF2] p-5 text-sm text-[#475467] dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-slate-300">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-[#0F172A] dark:text-slate-50">KYC readiness</p>
                <p className="mt-1 text-sm text-[#64748B] dark:text-slate-300">Institution readiness remains incomplete until CAC Certificate and Proof of Address are uploaded.</p>
              </div>
              <span className={kycReadiness?.is_complete ? 'rounded-full bg-[#ECFDF3] px-2.5 py-1 text-xs font-semibold text-[#027A48] dark:bg-emerald-950/60 dark:text-emerald-300' : 'rounded-full bg-[#FFF4D6] px-2.5 py-1 text-xs font-semibold text-[#7A1C1C] dark:bg-amber-900/50 dark:text-amber-100'}>
                {kycReadiness?.is_complete ? 'Complete' : 'Required'}
              </span>
            </div>
            {missingKycDocuments.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {missingKycDocuments.map((documentType) => (
                  <span key={documentType} className="rounded-full border border-[#BFD8C2] bg-white/80 px-2.5 py-1 text-xs font-medium text-[#14532D] dark:border-emerald-800 dark:bg-slate-950 dark:text-emerald-100">
                    Missing {requiredKycDocumentLabels[documentType] ?? documentType.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#027A48] dark:text-emerald-300">All required KYC documents have been uploaded.</p>
            )}
          </Card>
          <Card className="space-y-2 p-5 text-sm text-[#475467] dark:text-slate-300">
            <p><span className="font-medium text-[#344054] dark:text-slate-200">Institution:</span> {profile?.name ?? '—'}</p>
            <p><span className="font-medium text-[#344054] dark:text-slate-200">Licence ID:</span> {profile?.licence_id ?? '—'}</p>
            <p><span className="font-medium text-[#344054] dark:text-slate-200">Onboarding status:</span> {profile?.onboarding_status ?? '—'}</p>
            <p><span className="font-medium text-[#344054] dark:text-slate-200">Account status:</span> {profile?.account_status ?? '—'}</p>
          </Card>
        </div>
      </div>
    </div>
  );
}