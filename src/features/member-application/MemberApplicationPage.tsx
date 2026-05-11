import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createMemberApplication, deleteMemberApplicationDocument, downloadMemberApplicationMandate, getMyMemberApplication, submitMemberApplication, updateMemberApplication, uploadMemberApplicationDocument } from '@/features/member/api';
import { getPublicAssociations, getActiveTerms } from '@/features/public/api';
import { onMutationApiError } from '@/lib/mutationFeedback';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { FormTextareaField } from '@/components/shared/FormTextareaField';
import { Modal } from '@/components/shared/Modal';
import { ModalFormSection, PortalFormFooter } from '@/components/shared/ModalForm';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { FileCard } from '@/components/shared/FileCard';
import { FieldError, FieldLabel, RequiredMark } from '@/components/shared/FieldLabel';
import { FileUploadField } from '@/components/shared/FileUploadField';
import { memberApplicationSchema, type MemberApplicationFormValues } from '@/features/member-application/schemas';
import { memberApplicationQueryKeys } from '@/features/member-application/queries';
import { formatDate, formatFileSize } from '@/utils/format';
import { formatTermsContent } from '@/utils/termsContentHtml';
import { mergedFirstLastFromUsers } from '@/utils/userNamesFromUser';
import { FormField } from '@/components/shared/FormField';
import { useAuthStore } from '@/store/auth.store';
import { queryKeys } from '@/lib/queryKeys';
import { parseFilenameFromContentDisposition, triggerBlobDownload } from '@/utils/download';

const applicantTypeOptions = [
  { label: 'Author', value: 'author' },
  { label: 'Publisher', value: 'publisher' },
];

const authorTypeOptions = [
  { label: 'Individual', value: 'individual' },
  { label: 'Corporate', value: 'corporate' },
  { label: 'Agent', value: 'agent' },
];

const authorCategoryOptions = [
  { label: 'Author', value: 'author' },
  { label: 'Journalist', value: 'journalist' },
  { label: 'Photographer', value: 'photographer' },
  { label: 'Illustrator', value: 'illustrator' },
  { label: 'Carver', value: 'carver' },
  { label: 'Painter', value: 'painter' },
  { label: 'Sculptor', value: 'sculptor' },
  { label: 'Other', value: 'other' },
];

const documentTypeOptions = [
  { label: 'Proof of ID', value: 'proof_of_id', subText: "This can be NIN, International Passport, Driver's Licence, or Voter’s Card" },
  { label: 'Proof of Address', value: 'proof_of_address', subText: 'This can be Nepa Bill, Bank statement, Phone Bill' },
] as const;

const requiredDocumentTypes = documentTypeOptions.map((option) => option.value);


export function MemberApplicationPage() {
  const currentUser = useAuthStore((state) => state.currentUser);
  const queryClient = useQueryClient();
  const [termsOpen, setTermsOpen] = useState(false);
  const [documentFiles, setDocumentFiles] = useState<Record<string, File | undefined>>({});
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [submissionSuccessOpen, setSubmissionSuccessOpen] = useState(false);

  const applicationQuery = useQuery({
    queryKey: memberApplicationQueryKeys.me,
    queryFn: getMyMemberApplication,
  });

  const termsQuery = useQuery({
    queryKey: queryKeys.activeTermsMemberMandate,
    queryFn: async () => (await getActiveTerms('member')).data,
    enabled: termsOpen,
  });

  const termsHtml = useMemo(() => formatTermsContent(termsQuery.data?.content), [termsQuery.data?.content]);

  const associationsQuery = useQuery({
    queryKey: queryKeys.publicAssociationsAll,
    queryFn: async () => {
      const response = await getPublicAssociations({ per_page: 100, page: 1 });
      return response.data;
    },
  });

  const application = applicationQuery.data?.data ?? null;
  const canEdit = !application || ['draft', 'changes_requested'].includes(application.application_status);
  const reviewFeedbackNote = useMemo(() => {
    if (!application) return '';
    if (!['rejected', 'changes_requested'].includes(application.application_status)) return '';
    return (application.notes ?? '').trim();
  }, [application]);
  const uploadedDocumentTypes = useMemo(() => new Set((application?.documents ?? []).map((document) => document.document_type).filter(Boolean)), [application?.documents]);
  const missingDocumentLabels = documentTypeOptions.filter((option) => !uploadedDocumentTypes.has(option.value)).map((option) => option.label);
  const hasAllKycDocuments = requiredDocumentTypes.every((documentType) => uploadedDocumentTypes.has(documentType));
  const canSubmit = Boolean(application && ['draft', 'changes_requested'].includes(application.application_status) && hasAllKycDocuments && application.consent_accepted && application.consent_date);

  const form = useForm<MemberApplicationFormValues>({
    resolver: zodResolver(memberApplicationSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      association_id: 0,
      applicant_type: 'author',
      member_author_type: '',
      member_author_category: '',
      nationality: 'Nigeria',
      country_of_residence: '',
      is_diaspora: false,
      bank_name: '',
      bank_account_number: '',
      bank_account_owner_name: '',
      next_of_kin_name: '',
      next_of_kin_phone: '',
      publisher_organisation_name: '',
      publisher_tin: '',
      publisher_location_address: '',
      publisher_postal_address: '',
      publisher_email: '',
      publisher_phone: '',
      consent_accepted: false,
      consent_date: '',
      notes: '',
      member_provided_id: '',
    },
  });

  const applicantType = form.watch('applicant_type');
  const selectedAssociationId = form.watch('association_id');
  const signupAssociationId = Number(currentUser?.member_application?.association?.id ?? 0);
  const selectedAssociation = useMemo(() => {
    const associationId = Number(selectedAssociationId || application?.association?.id || signupAssociationId || 0);
    return application?.association ?? associationsQuery.data?.find((association) => association.id === associationId) ?? null;
  }, [application?.association, application?.association?.id, associationsQuery.data, selectedAssociationId, signupAssociationId]);
  const selectedAssociationName = selectedAssociation?.name ?? 'your association';

  useEffect(() => {
    if (!application) return;
    // Prevent background refetches (e.g. document uploads) from wiping unsaved form edits.
    if (form.formState.isDirty) return;
    const { first_name, last_name } = mergedFirstLastFromUsers(
      application.user,
      currentUser?.member_profile?.user,
      currentUser?.user,
    );
    form.reset({
      first_name,
      last_name,
      association_id: application.association?.id ?? 0,
      applicant_type: application.applicant_type as MemberApplicationFormValues['applicant_type'],
      member_author_type: (application.member_author_type ?? '') as MemberApplicationFormValues['member_author_type'],
      member_author_category: (application.member_author_category ?? '') as MemberApplicationFormValues['member_author_category'],
      nationality: application.nationality ?? 'Nigeria',
      country_of_residence: application.country_of_residence ?? '',
      is_diaspora: Boolean(application.is_diaspora),
      bank_name: application.bank_name ?? '',
      bank_account_number: application.bank_account_number ?? '',
      bank_account_owner_name: application.bank_account_owner_name ?? '',
      next_of_kin_name: application.next_of_kin_name ?? '',
      next_of_kin_phone: application.next_of_kin_phone ?? '',
      publisher_organisation_name: application.publisher_organisation_name ?? '',
      publisher_tin: application.publisher_tin ?? '',
      publisher_location_address: application.publisher_location_address ?? '',
      publisher_postal_address: application.publisher_postal_address ?? '',
      publisher_email: application.publisher_email ?? '',
      publisher_phone: application.publisher_phone ?? '',
      consent_accepted: Boolean(application.consent_accepted),
      consent_date: application.consent_date ?? '',
      notes: application.notes ?? '',
      member_provided_id: application.member_provided_id ?? '',
    });
  }, [
    application,
    application?.user?.id,
    application?.user?.first_name,
    application?.user?.last_name,
    application?.user?.name,
    currentUser?.user?.id,
    currentUser?.user?.first_name,
    currentUser?.user?.last_name,
    currentUser?.user?.name,
    form.formState.isDirty,
    form,
  ]);

  useEffect(() => {
    if (application) return;
    const { first_name, last_name } = mergedFirstLastFromUsers(
      null,
      currentUser?.member_profile?.user,
      currentUser?.user,
    );
    if (first_name) form.setValue('first_name', first_name);
    if (last_name) form.setValue('last_name', last_name);
    if (signupAssociationId > 0 && !form.getValues('association_id')) {
      form.setValue('association_id', signupAssociationId);
    }
  }, [
    application,
    currentUser?.user?.id,
    currentUser?.user?.first_name,
    currentUser?.user?.last_name,
    currentUser?.user?.name,
    currentUser?.member_application?.association?.id,
    signupAssociationId,
    form,
  ]);

  const saveMutation = useMutation({
    mutationFn: async (values: MemberApplicationFormValues) => {
      if (application) return updateMemberApplication(application.id, values);
      return createMemberApplication(values);
    },
    onSuccess: (response) => {
      toast.success(response.message);
      queryClient.invalidateQueries({ queryKey: memberApplicationQueryKeys.me });
      queryClient.invalidateQueries({ queryKey: queryKeys.currentUser });
    },
    onError: onMutationApiError(),
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!application) throw new Error('No application available to submit.');
      if (!hasAllKycDocuments) throw new Error(`Upload all required application documents before submitting: ${missingDocumentLabels.join(', ')}.`);
      return submitMemberApplication(application.id);
    },
    onSuccess: (response) => {
      toast.success(response.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setSubmissionSuccessOpen(true);
      queryClient.invalidateQueries({ queryKey: memberApplicationQueryKeys.me });
      queryClient.invalidateQueries({ queryKey: queryKeys.currentUser });
    },
    onError: onMutationApiError(),
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ document_type, file }: { document_type: string; file: File }) => {
      if (!application) throw new Error('Create the application before uploading documents.');
      return uploadMemberApplicationDocument(application.id, { document_type, file });
    },
    onSuccess: (response) => {
      toast.success(response.message);
      setDocumentFiles((current) => ({ ...current, [uploadingType ?? '']: undefined }));
      queryClient.invalidateQueries({ queryKey: memberApplicationQueryKeys.me });
    },
    onError: onMutationApiError(),
    onSettled: () => setUploadingType(null),
  });

  const deleteMutation = useMutation({
    mutationFn: async (documentId: number) => {
      if (!application) throw new Error('No application available.');
      return deleteMemberApplicationDocument(application.id, documentId);
    },
    onSuccess: (response) => {
      toast.success(response.message);
      queryClient.invalidateQueries({ queryKey: memberApplicationQueryKeys.me });
    },
    onError: onMutationApiError(),
  });

  const mandateDownloadMutation = useMutation({
    mutationFn: async (app: NonNullable<typeof application>) => downloadMemberApplicationMandate(app.id),
    onSuccess: (response, app) => {
      const disposition = String(
        response.headers['content-disposition'] ?? (response.headers as Record<string, string>)['Content-Disposition'] ?? '',
      );
      const fromHeader = parseFilenameFromContentDisposition(disposition);
      const ref = (app.application_reference ?? `id-${app.id}`).replace(/[^\w.-]+/g, '-');
      const fallbackPdf = `repronig-member-mandate-${ref}.pdf`;
      const filename = fromHeader && fromHeader.toLowerCase().endsWith('.pdf') ? fromHeader : fallbackPdf;
      triggerBlobDownload(response.data as Blob, filename);
      toast.success('Mandate PDF downloaded.');
    },
    onError: onMutationApiError(),
  });

  function uploadDocument(documentType: string) {
    const file = documentFiles[documentType];
    if (!file) {
      toast.error('Select a file before uploading.');
      return;
    }
    setUploadingType(documentType);
    uploadMutation.mutate({ document_type: documentType, file });
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Membership and Mandate"
        description="Fill and submit your mandate."
        actions={application ? <div className="flex items-center gap-2"><StatusBadge value={application.application_status} />{application.application_reference ? <span className="text-xs text-slate-500">Ref: {application.application_reference}</span> : null}</div> : null}
      />

      {application && ['rejected', 'changes_requested'].includes(application.application_status) ? (
        <Alert
          title={application.application_status === 'rejected' ? 'Application rejected' : 'Changes requested on your application'}
          description={reviewFeedbackNote || 'No reason was provided yet. Please contact your association for details.'}
          className="border-2"
        />
      ) : null}
      {application && !hasAllKycDocuments && canEdit ? <Alert title="Application documents required" description={`Upload all required application documents before submitting: ${missingDocumentLabels.join(', ') || 'None'}.`} /> : null}
      {application && !canEdit ? <Alert title="Editing is locked" description="This application/mandate cannot be edited right now." /> : null}

      <Card className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-slate-500">Current status</p>
            <div className="mt-2 flex items-center gap-2"><StatusBadge value={application?.application_status ?? 'draft'} />{application?.submission_stage ? <StatusBadge value={application.submission_stage} /> : null}</div>
          </div>
          <div className="grid gap-1 text-sm text-slate-600 dark:text-slate-300">
            <p>Submitted: {formatDate(application?.submitted_at)}</p>
            <p>Reviewed: {formatDate(application?.reviewed_at)}</p>
            <p>Association: {application?.association?.name ?? 'Not selected yet'}</p>
          </div>
        </div>

        <form className="space-y-8" onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}>
          <ModalFormSection badge="1" title="Consent & mandate" description="Confirm you have read the data protection policy before continuing.">
          <div className="space-y-3">
            <h3 className="sr-only">Consent/Mandate</h3>
            <label className="flex items-start gap-3 text-sm leading-6 text-[#344054] dark:text-slate-200">
              <input type="checkbox" className="mt-1 h-4 w-4 rounded border-slate-300" disabled={!canEdit} {...form.register('consent_accepted')} />
              <span>
                Having read the data protection policy attached to the link below, I give consent for the use of my personal data, and the transfer of data overseas, for the purpose outlined in the policy.
                <br /><br />Please <button type="button" className="font-semibold text-[#AF1512] underline-offset-2 hover:underline" onClick={() => setTermsOpen(true)}>click this link</button> to read the policy before consenting. REPRONIG shall not be held liable for any damages caused by your negligence to read and understand this policy before submitting your data.<RequiredMark />
              </span>
            </label>
            <FieldError message={form.formState.errors.consent_accepted?.message} />
            <label className="block space-y-2 max-w-sm">
              <FieldLabel required>Consent date</FieldLabel>
              <Input type="date" disabled={!canEdit} {...form.register('consent_date')} />
              <FieldError message={form.formState.errors.consent_date?.message} />
            </label>
          </div>
          </ModalFormSection>

          <ModalFormSection badge="2" title="Association & applicant" description="Choose your association and how you are applying.">
          <div className="grid gap-5 md:grid-cols-2">
            <FormField label="First name" requiredIndicator disabled={!canEdit} error={form.formState.errors.first_name?.message} {...form.register('first_name')} />
            <FormField label="Last name" requiredIndicator disabled={!canEdit} error={form.formState.errors.last_name?.message} {...form.register('last_name')} />
          <label className="block space-y-2">
            <FieldLabel required>Association</FieldLabel>
            <select className="h-12 w-full rounded-md border border-[#222222] bg-white px-4 text-base text-[#1E2024] outline-none transition focus:border-[#AF1512] focus:ring-2 focus:ring-[rgba(175,21,18,0.12)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" disabled={!canEdit || associationsQuery.isLoading} {...form.register('association_id', { valueAsNumber: true })}>
              <option value={0}>Select association</option>
              {(associationsQuery.data ?? []).map((association) => <option key={association.id} value={association.id}>{association.name}</option>)}
            </select>
            <FieldError message={form.formState.errors.association_id?.message} />
          </label>

          <label className="block space-y-2">
            <FieldLabel required>Applicant type</FieldLabel>
            <select className="h-12 w-full rounded-md border border-[#222222] bg-white px-4 text-base text-[#1E2024] outline-none transition focus:border-[#AF1512] focus:ring-2 focus:ring-[rgba(175,21,18,0.12)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" disabled={!canEdit} {...form.register('applicant_type')}>
              {applicantTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <FieldError message={form.formState.errors.applicant_type?.message} />
          </label>

          {applicantType === 'author' ? (
            <>
              <label className="block space-y-2"><FieldLabel required>Author Type</FieldLabel><select className="h-12 w-full rounded-md border border-[#222222] bg-white px-4 text-base dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" disabled={!canEdit} {...form.register('member_author_type')}><option value="">Select author type</option>{authorTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><FieldError message={form.formState.errors.member_author_type?.message} /></label>
              <label className="block space-y-2"><FieldLabel required>Category</FieldLabel><select className="h-12 w-full rounded-md border border-[#222222] bg-white px-4 text-base dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" disabled={!canEdit} {...form.register('member_author_category')}><option value="">Select category</option>{authorCategoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><FieldError message={form.formState.errors.member_author_category?.message} /></label>
              <label className="block space-y-2"><FieldLabel>Nationality</FieldLabel><Input disabled={!canEdit} {...form.register('nationality')} /><FieldError message={form.formState.errors.nationality?.message} /></label>
              <label className="block space-y-2"><FieldLabel required>Name of Next of Kin</FieldLabel><Input disabled={!canEdit} {...form.register('next_of_kin_name')} /><FieldError message={form.formState.errors.next_of_kin_name?.message} /></label>
              <label className="block space-y-2"><FieldLabel required>Next of Kin’s Contact Number</FieldLabel><Input disabled={!canEdit} {...form.register('next_of_kin_phone')} /><FieldError message={form.formState.errors.next_of_kin_phone?.message} /></label>
            </>
          ) : null}

          {applicantType === 'publisher' ? (
            <>
              <label className="block space-y-2"><FieldLabel required>Name of Organization</FieldLabel><Input disabled={!canEdit} {...form.register('publisher_organisation_name')} /><FieldError message={form.formState.errors.publisher_organisation_name?.message} /></label>
              <label className="block space-y-2"><FieldLabel required>Tax Identification Number</FieldLabel><Input disabled={!canEdit} {...form.register('publisher_tin')} /><FieldError message={form.formState.errors.publisher_tin?.message} /></label>
              <label className="block space-y-2 md:col-span-2"><FieldLabel required>Location Address</FieldLabel><Input disabled={!canEdit} {...form.register('publisher_location_address')} /><FieldError message={form.formState.errors.publisher_location_address?.message} /></label>
              <label className="block space-y-2 md:col-span-2"><FieldLabel required>Postal Address</FieldLabel><Input disabled={!canEdit} {...form.register('publisher_postal_address')} /><FieldError message={form.formState.errors.publisher_postal_address?.message} /></label>
              <label className="block space-y-2"><FieldLabel required>Organization Email</FieldLabel><Input type="email" disabled={!canEdit} {...form.register('publisher_email')} /><FieldError message={form.formState.errors.publisher_email?.message} /></label>
              <label className="block space-y-2"><FieldLabel required>Organization Phone Number</FieldLabel><Input disabled={!canEdit} {...form.register('publisher_phone')} /><FieldError message={form.formState.errors.publisher_phone?.message} /></label>
            </>
          ) : null}

          <label className="block space-y-2"><FieldLabel required>Country of residence</FieldLabel><Input disabled={!canEdit} {...form.register('country_of_residence')} /><FieldError message={form.formState.errors.country_of_residence?.message} /></label>
          <label className="flex items-center gap-2 md:col-span-2 text-sm font-medium text-slate-700 dark:text-slate-300"><input type="checkbox" className="h-4 w-4 rounded border-slate-300" disabled={!canEdit} {...form.register('is_diaspora')} />I am applying from the diaspora</label>

          <label className="block space-y-2 md:col-span-2">
            <FieldLabel>Your Association member / reference ID (optional)</FieldLabel>
            <Input placeholder="e.g. Association ID" disabled={!canEdit} {...form.register('member_provided_id')} />
            <p className="text-xs text-slate-500 dark:text-slate-400">If your institution or society gave you an ID, enter it here so reviewers can match your record.</p>
            <FieldError message={form.formState.errors.member_provided_id?.message} />
          </label>
          </div>
          </ModalFormSection>

          <ModalFormSection badge="3" title="Royalty payment account" description="Bank details for royalty payouts.">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="block space-y-2"><FieldLabel required>Bank name</FieldLabel><Input disabled={!canEdit} {...form.register('bank_name')} /><FieldError message={form.formState.errors.bank_name?.message} /></label>
            <label className="block space-y-2"><FieldLabel required>Bank Account Number</FieldLabel><Input disabled={!canEdit} {...form.register('bank_account_number')} /><FieldError message={form.formState.errors.bank_account_number?.message} /></label>
            <label className="block space-y-2"><FieldLabel required>Account Owner Name</FieldLabel><Input disabled={!canEdit} {...form.register('bank_account_owner_name')} /><FieldError message={form.formState.errors.bank_account_owner_name?.message} /></label>
          </div>
          </ModalFormSection>

          <ModalFormSection badge="4" title="Notes" description="Optional context for reviewers.">
            <FormTextareaField label="Notes" disabled={!canEdit} error={form.formState.errors.notes?.message} {...form.register('notes')} />
          </ModalFormSection>

          <ModalFormSection badge="5" title="Application documents" description="Each mandatory document has its own file selector and upload button.">
          <div className="space-y-5">
                  {!application ? <Alert title="Create your application first" description="You can upload documents after the application record has been created." /> : null}
                  <div className="grid gap-4 md:grid-cols-2">
                    {documentTypeOptions.map((documentType) => {
                      const existingDocument = application?.documents?.find((document) => document.document_type === documentType.value);
                      return (
                        <div key={documentType.value} className="rounded-md border border-[#EAECF0] p-4 dark:border-slate-800">
                          <div className="mb-3 flex items-start justify-between gap-3"><div><FieldLabel required>{documentType.label}</FieldLabel><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{documentType.subText}</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">PDF, JPG, JPEG, or PNG. Max 10MB.</p></div>{existingDocument ? <StatusBadge value="uploaded" label="Uploaded" /> : null}</div>
                          <FileUploadField
                            label="File"
                            file={documentFiles[documentType.value]}
                            accept=".pdf,.jpg,.jpeg,.png"
                            disabled={!application || !canEdit}
                            placeholder="Choose file"
                            onFileChange={(file) => setDocumentFiles((current) => ({ ...current, [documentType.value]: file ?? undefined }))}
                          />
                          <div className="mt-3 flex gap-2"><Button type="button" size="sm" disabled={!application || !canEdit || uploadMutation.isPending || !documentFiles[documentType.value]} onClick={() => uploadDocument(documentType.value)}>{uploadingType === documentType.value && uploadMutation.isPending ? 'Uploading...' : existingDocument ? 'Replace file' : 'Upload file'}</Button></div>
                          {existingDocument ? <div className="mt-4"><FileCard title={existingDocument.file_name ?? documentType.label} subtitle={`${documentType.label} · ${formatFileSize(existingDocument.file_size)} · ${formatDate(existingDocument.created_at)}`} fileUrl={existingDocument.file_url} downloadUrl={existingDocument.download_url} onDelete={canEdit ? () => deleteMutation.mutate(existingDocument.id) : undefined} deleting={deleteMutation.isPending} /></div> : null}
                        </div>
                      );
                    })}
                  </div>
          </div>
          </ModalFormSection>

          <PortalFormFooter className="-mx-5 -mb-5 rounded-b-xl">
            <Button type="submit" disabled={!canEdit || saveMutation.isPending}>{saveMutation.isPending ? 'Saving...' : application ? 'Update application' : 'Create application'}</Button>
            <Button type="button" className="border-[#D4AF37] bg-[#D4AF37] text-[#7A1F1A] hover:bg-[#C9A227] hover:text-[#7A1F1A]" disabled={!canSubmit || submitMutation.isPending} onClick={() => submitMutation.mutate()} title={!hasAllKycDocuments ? 'Upload all application documents before submitting.' : undefined}>{submitMutation.isPending ? 'Submitting...' : 'Submit application'}</Button>
            {application?.application_status === 'approved' ? (
              <Button
                type="button"
                variant="outline"
                disabled={mandateDownloadMutation.isPending || !application}
                onClick={() => {
                  if (application) mandateDownloadMutation.mutate(application);
                }}
              >
                {mandateDownloadMutation.isPending ? 'Downloading...' : 'Download Mandate'}
              </Button>
            ) : null}
          </PortalFormFooter>

        </form>
      </Card>

      <Modal open={submissionSuccessOpen} onClose={() => setSubmissionSuccessOpen(false)} title="Application submitted" subtitle="Your membership application is now under affiliation validation." size="sm">
        <div className="space-y-4 text-sm leading-6 text-[#344054] dark:text-slate-200">
          <p>
            Your application has been submitted. {selectedAssociationName} will now validate your affiliation with them, then REPRONIG Admin will complete the final review.
          </p>
          <p>You will receive email and in-app updates when our admin requests changes, rejects, or approves your application.</p>
          <div className="flex justify-end">
            <Button type="button" onClick={() => setSubmissionSuccessOpen(false)}>Okay</Button>
          </div>
        </div>
      </Modal>

      <Modal open={termsOpen} onClose={() => setTermsOpen(false)} title={termsQuery.data?.title ?? 'REPRONIG Terms and Conditions'} subtitle={termsQuery.data?.version ? `Version ${termsQuery.data.version}` : undefined} size="xl">
        {termsQuery.isLoading ? (
          <div className="text-sm leading-7 text-[#344054] dark:text-slate-200">Loading terms and conditions...</div>
        ) : (
          <div
            className="prose prose-sm max-w-none text-[#344054] dark:prose-invert prose-headings:text-[#2B2B2D] dark:text-slate-200 dark:prose-headings:text-slate-100 prose-a:text-[#AF1512] dark:prose-a:text-red-300 prose-p:leading-relaxed"
            dangerouslySetInnerHTML={{ __html: termsHtml }}
          />
        )}
      </Modal>
    </div>
  );
}
