import { useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm, type Resolver, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createInstitutionDeclaration, getInstitutionDeclaration, listInstitutionDeclarations, submitInstitutionDeclaration, updateInstitutionDeclaration } from '@/features/institution/api';
import { getApiErrorMessage, normalizeApiError } from '@/api/error';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { useTablePagination } from '@/hooks/useTablePagination';
import { Button } from '@/components/ui/button';
import { ModalFormActions, ModalFormRoot, ModalFormScrollBody, ModalFormSection } from '@/components/shared/ModalForm';
import { Alert } from '@/components/ui/alert';
import { DataTable } from '@/components/shared/DataTable';
import { FormField } from '@/components/shared/FormField';
import { Modal } from '@/components/shared/Modal';
import { PaginationBar } from '@/components/shared/PaginationBar';
import { SearchFilterBar } from '@/components/shared/SearchFilterBar';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { institutionDeclarationSchema, type InstitutionDeclarationFormValues } from '@/features/institution/schemas';
import type { InstitutionAnnualDeclarationResource } from '@/types/domain';
import { formatCurrency, formatDate } from '@/utils/format';
import { useAuthStore } from '@/store/auth.store';
import { queryKeys } from '@/lib/queryKeys';
import { toastApiError } from '@/lib/mutationFeedback';

const academicDeclarationTypes = ['university', 'polytechnic', 'college_of_education', 'research_institute'];

function usesAcademicDeclarationFields(institutionType?: string | null) {
  return Boolean(institutionType && academicDeclarationTypes.includes(institutionType));
}

const declarationStatusOptions = [
  { label: 'Draft', value: 'draft' },
  { label: 'Submitted', value: 'submitted' },
  { label: 'Under review', value: 'under_review' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Changes requested', value: 'changes_requested' },
];

function canEditDeclaration(declaration?: InstitutionAnnualDeclarationResource | null) {
  return Boolean(declaration && ['draft', 'changes_requested'].includes(declaration.declaration_status ?? ''));
}

function createEmptyDeclarationValues(usesAcademicFields = true): InstitutionDeclarationFormValues {
  return {
    licensing_year: new Date().getFullYear(),
    declared_students_count: undefined,
    declared_members_count: undefined,
    declared_branches_count: undefined,
    faculties: usesAcademicFields ? [{ faculty_name: '', student_count: 0 }] : [],
    supporting_document: undefined,
  };
}

function cleanDeclarationPayload(values: InstitutionDeclarationFormValues, usesAcademicFields: boolean): InstitutionDeclarationFormValues {
  const cleanedFaculties = (values.faculties ?? [])
    .map((faculty) => ({
      faculty_name: faculty.faculty_name.trim(),
      student_count: Number(faculty.student_count ?? 0),
    }))
    .filter((faculty) => faculty.faculty_name || faculty.student_count > 0);

  return {
    licensing_year: values.licensing_year,
    declared_students_count: usesAcademicFields ? values.declared_students_count : undefined,
    declared_members_count: usesAcademicFields ? undefined : values.declared_members_count,
    declared_branches_count: usesAcademicFields ? undefined : values.declared_branches_count,
    faculties: usesAcademicFields ? cleanedFaculties : [],
    supporting_document: values.supporting_document,
  };
}


function applyServerValidationErrors(form: UseFormReturn<InstitutionDeclarationFormValues>, error: unknown) {
  const apiError = normalizeApiError(error);

  Object.entries(apiError.errors ?? {}).forEach(([field, messages]) => {
    const message = Array.isArray(messages) ? messages[0] : undefined;
    if (message) {
      form.setError(field as keyof InstitutionDeclarationFormValues, { type: 'server', message });
    }
  });

  return getApiErrorMessage(error);
}


function validateDeclarationValues(form: UseFormReturn<InstitutionDeclarationFormValues>, values: InstitutionDeclarationFormValues, usesAcademicFields: boolean): boolean {
  let valid = true;

  if (usesAcademicFields) {
    const faculties = values.faculties ?? [];
    const declaredStudents = Number(values.declared_students_count ?? 0);
    const facultyTotal = faculties.reduce((sum, faculty) => sum + (Number(faculty?.student_count ?? 0) || 0), 0);

    if (declaredStudents <= 0) {
      form.setError('declared_students_count', { type: 'manual', message: 'Declared students count is required for this institution type.' });
      valid = false;
    }

    if (!faculties.length) {
      form.setError('faculties', { type: 'manual', message: 'At least one faculty is required for this institution type.' });
      valid = false;
    }

    if (faculties.length && facultyTotal !== declaredStudents) {
      form.setError('faculties', { type: 'manual', message: 'The sum of faculty student counts must equal the declared students count.' });
      valid = false;
    }

    return valid;
  }

  if (Number(values.declared_members_count ?? 0) <= 0) {
    form.setError('declared_members_count', { type: 'manual', message: 'Declared members count is required for this institution type.' });
    valid = false;
  }

  if (Number(values.declared_branches_count ?? 0) <= 0) {
    form.setError('declared_branches_count', { type: 'manual', message: 'Declared branches count is required for this institution type.' });
    valid = false;
  }

  return valid;
}

function SupportingDocumentField({ form, disabled, existingDocument }: { form: UseFormReturn<InstitutionDeclarationFormValues>; disabled?: boolean; existingDocument?: InstitutionAnnualDeclarationResource['supporting_document']; }) {
  const selectedFile = form.watch('supporting_document');

  return (
    <div className="space-y-3 md:col-span-2">
      <p className="text-sm font-medium text-slate-900 dark:text-slate-50">Supporting Document Upload</p>
      <p className="mt-1 text-sm text-slate-500">Accepted files: PDF, Word, JPG, or PNG.</p>
      <input
        type="file"
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
        disabled={disabled}
        className="mt-3 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:file:bg-slate-800 dark:file:text-slate-200"
        onChange={(event) => form.setValue('supporting_document', event.target.files?.[0], { shouldDirty: true, shouldValidate: true })}
      />
      {form.formState.errors.supporting_document?.message ? <p className="mt-2 text-sm text-rose-600">{form.formState.errors.supporting_document.message}</p> : null}
      {selectedFile ? <p className="mt-2 text-xs text-slate-500">Selected: {selectedFile.name}</p> : null}
      {!selectedFile && existingDocument?.file_name ? (
        <p className="mt-2 text-xs text-slate-500">Current document: {existingDocument.file_name}</p>
      ) : null}
    </div>
  );
}

function FacultyFields({ form, disabled }: { form: UseFormReturn<InstitutionDeclarationFormValues>; disabled?: boolean }) {
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'faculties' });
  const facultyValues = form.watch('faculties') ?? [];
  const totalStudents = useMemo(
    () => facultyValues.reduce((sum, item) => sum + (Number(item?.student_count ?? 0) || 0), 0),
    [facultyValues],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-slate-50">Faculties</p>
          <p className="mt-1 text-sm text-slate-500">Add as many faculties as needed and capture the student count for each one.</p>
        </div>
        <Button type="button" variant="outline" disabled={disabled} onClick={() => append({ faculty_name: '', student_count: 0 })}>Add faculty</Button>
      </div>
      <div className="mt-4 space-y-4">
        {fields.length ? fields.map((field, index) => (
          <div key={field.id} className="grid gap-3 rounded-xl border border-slate-200 p-3 md:grid-cols-[1fr_180px_auto] md:items-end">
            <FormField label={`Faculty ${index + 1} name`} error={form.formState.errors.faculties?.[index]?.faculty_name?.message} disabled={disabled} {...form.register(`faculties.${index}.faculty_name` as const)} />
            <FormField label="Student count" requiredIndicator type="number" error={form.formState.errors.faculties?.[index]?.student_count?.message} disabled={disabled} {...form.register(`faculties.${index}.student_count` as const, { valueAsNumber: true })} />
            <Button type="button" variant="outline" disabled={disabled || fields.length === 1} onClick={() => remove(index)}>Remove</Button>
          </div>
        )) : (
          <p className="text-sm text-slate-500">No faculties added yet.</p>
        )}
      </div>
      <div className="mt-4 text-sm text-slate-500">Faculty student total: <span className="font-medium text-slate-900 dark:text-slate-50">{totalStudents}</span></div>
      <p className="mt-1 text-xs text-slate-500">For universities, polytechnics, colleges of education, and research institutes, this total must match the declared students count.</p>
      {form.formState.errors.faculties?.message ? <p className="mt-2 text-sm text-rose-600">{form.formState.errors.faculties.message}</p> : null}
    </div>
  );
}

function DeclarationForm({ form, selectedDeclaration, editable, savePending, submitPending, usesAcademicFields, onSave, onSubmit }: {
  form: UseFormReturn<InstitutionDeclarationFormValues>;
  selectedDeclaration?: InstitutionAnnualDeclarationResource | null;
  editable: boolean;
  savePending: boolean;
  submitPending?: boolean;
  usesAcademicFields: boolean;
  onSave: (values: InstitutionDeclarationFormValues) => void;
  onSubmit?: () => void;
}) {
  return (
    <ModalFormRoot
      onSubmit={form.handleSubmit((values) => {
        if (!values.supporting_document && !selectedDeclaration?.supporting_document) {
          form.setError('supporting_document', { type: 'manual', message: 'Supporting document is required.' });
          return;
        }

        if (!validateDeclarationValues(form, values, usesAcademicFields)) {
          return;
        }

        onSave(values);
      })}
    >
      <ModalFormScrollBody>
        <ModalFormSection badge="1" title="Declaration period" description="The licensing year this declaration covers.">
          <FormField label="Licensing year" type="number" error={form.formState.errors.licensing_year?.message} disabled={Boolean(selectedDeclaration) && !editable} {...form.register('licensing_year', { valueAsNumber: true })} />
        </ModalFormSection>
        <ModalFormSection
          badge="2"
          title={usesAcademicFields ? 'Declared students & faculties' : 'Declared members & branches'}
          description={usesAcademicFields ? 'Student totals must align with faculty rows where applicable.' : 'Membership scale.'}
        >
          {usesAcademicFields ? (
            <div className="space-y-5">
              <FormField label="Declared students" type="number" error={form.formState.errors.declared_students_count?.message} disabled={Boolean(selectedDeclaration) && !editable} {...form.register('declared_students_count', { valueAsNumber: true })} />
              <FacultyFields form={form} disabled={Boolean(selectedDeclaration) && !editable} />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Declared members" type="number" error={form.formState.errors.declared_members_count?.message} disabled={Boolean(selectedDeclaration) && !editable} {...form.register('declared_members_count', { valueAsNumber: true })} />
              <FormField label="Declared branches" type="number" error={form.formState.errors.declared_branches_count?.message} disabled={Boolean(selectedDeclaration) && !editable} {...form.register('declared_branches_count', { valueAsNumber: true })} />
            </div>
          )}
        </ModalFormSection>
        <ModalFormSection badge="3" title="Supporting document" description="Upload the statutory supporting document (PDF, Word, JPG, or PNG).">
          <SupportingDocumentField form={form} disabled={Boolean(selectedDeclaration) && !editable} existingDocument={selectedDeclaration?.supporting_document} />
        </ModalFormSection>
      </ModalFormScrollBody>
      <ModalFormActions>
        <Button type="submit" className="bg-[#F2C94C] text-[#8A1538] hover:bg-[#E0B83F] dark:bg-[#F2C94C] dark:text-[#8A1538] dark:hover:bg-[#E0B83F]" disabled={Boolean(selectedDeclaration) && !editable || savePending}>{savePending ? 'Saving...' : selectedDeclaration ? 'Update declaration' : 'Create declaration'}</Button>
        {selectedDeclaration && onSubmit ? (
          <Button
            type="button"
            className="bg-[#F2C94C] text-[#8A1538] hover:bg-[#E0B83F] dark:bg-[#F2C94C] dark:text-[#8A1538] dark:hover:bg-[#E0B83F]"
            disabled={!editable || submitPending}
            onClick={() => {
              if (!form.getValues('supporting_document') && !selectedDeclaration?.supporting_document) {
                form.setError('supporting_document', { type: 'manual', message: 'Supporting document is required before submission.' });
                return;
              }
              onSubmit();
            }}
          >
            {submitPending ? 'Submitting...' : 'Submit declaration'}
          </Button>
        ) : null}
      </ModalFormActions>
    </ModalFormRoot>
  );
}

export function InstitutionDeclarationsPage() {
  const queryClient = useQueryClient();
  const { page, setPage, perPage, setPerPage } = useTablePagination();
  const [status, setStatus] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [newlyCreatedDeclarationId, setNewlyCreatedDeclarationId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [approvalGuardOpen, setApprovalGuardOpen] = useState(false);
  const currentUser = useAuthStore((state) => state.currentUser);
  const institutionAccountStatus = currentUser?.institution_context?.account_status ?? currentUser?.onboarding_status.institution_account_status ?? currentUser?.institution_profile?.account_status ?? null;
  const institutionCanCreateDeclarations = institutionAccountStatus === 'active';
  const institutionType = currentUser?.institution_profile?.institution_type ?? null;
  const usesAcademicFields = usesAcademicDeclarationFields(institutionType);

  const listQuery = usePaginatedList({
    queryKey: [...queryKeys.institutionDeclarations, page, perPage, status],
    queryFn: listInstitutionDeclarations,
    params: { page, per_page: perPage, status: status || undefined },
    enabled: institutionCanCreateDeclarations,
  });

  const detailQuery = useQuery({
    queryKey: queryKeys.institutionDeclaration(selectedId),
    queryFn: async () => {
      if (!selectedId) throw new Error('Declaration id is required.');
      return getInstitutionDeclaration(selectedId);
    },
    enabled: Boolean(selectedId),
  });

  const selectedDeclaration = detailQuery.data?.data ?? null;
  const editable = canEditDeclaration(selectedDeclaration);

  const createForm = useForm<InstitutionDeclarationFormValues>({
    resolver: zodResolver(institutionDeclarationSchema) as Resolver<InstitutionDeclarationFormValues>,
    defaultValues: createEmptyDeclarationValues(usesAcademicFields),
  });

  const editForm = useForm<InstitutionDeclarationFormValues>({
    resolver: zodResolver(institutionDeclarationSchema) as Resolver<InstitutionDeclarationFormValues>,
    defaultValues: createEmptyDeclarationValues(usesAcademicFields),
  });

  useEffect(() => {
    if (!selectedDeclaration) {
      editForm.reset(createEmptyDeclarationValues(usesAcademicFields));
      return;
    }
    editForm.reset({
      licensing_year: selectedDeclaration.licensing_year,
      declared_students_count: selectedDeclaration.declared_students_count ?? undefined,
      declared_members_count: selectedDeclaration.declared_members_count ?? undefined,
      declared_branches_count: selectedDeclaration.declared_branches_count ?? undefined,
      faculties: usesAcademicFields ? (selectedDeclaration.faculties?.length ? selectedDeclaration.faculties : [{ faculty_name: '', student_count: 0 }]).map((item) => ({ faculty_name: item.faculty_name, student_count: item.student_count })) : [],
      supporting_document: undefined,
    });
  }, [editForm, selectedDeclaration, usesAcademicFields]);

  const createMutation = useMutation({
    mutationFn: async (values: InstitutionDeclarationFormValues) => createInstitutionDeclaration(cleanDeclarationPayload(values, usesAcademicFields)),
    onSuccess: (response) => {
      toast.success(response.message);
      queryClient.invalidateQueries({ queryKey: queryKeys.institutionDeclarations });
      queryClient.invalidateQueries({ queryKey: queryKeys.institutionDeclaration(response.data.id) });
      setNewlyCreatedDeclarationId(response.data.id);
      setSelectedId(response.data.id);
      setCreateOpen(false);
      createForm.reset(createEmptyDeclarationValues(usesAcademicFields));
    },
    onError: (error) => toast.error(applyServerValidationErrors(createForm, error)),
  });

  const saveMutation = useMutation({
    mutationFn: async (values: InstitutionDeclarationFormValues) => {
      if (!selectedDeclaration) throw new Error('Select a declaration first.');
      return updateInstitutionDeclaration(selectedDeclaration.id, cleanDeclarationPayload(values, usesAcademicFields));
    },
    onSuccess: (response) => {
      toast.success(response.message);
      queryClient.invalidateQueries({ queryKey: queryKeys.institutionDeclarations });
      queryClient.invalidateQueries({ queryKey: queryKeys.institutionDeclaration(response.data.id) });
      setSelectedId(response.data.id);
    },
    onError: (error) => toast.error(applyServerValidationErrors(editForm, error)),
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDeclaration) throw new Error('Select a declaration first.');
      return submitInstitutionDeclaration(selectedDeclaration.id);
    },
    onSuccess: (response) => {
      toast.success(response.message);
      queryClient.invalidateQueries({ queryKey: queryKeys.institutionDeclarations });
      queryClient.invalidateQueries({ queryKey: queryKeys.institutionDeclaration(selectedId) });
      if (selectedId && selectedId !== newlyCreatedDeclarationId) {
        setSelectedId(null);
      }
    },
    onError: (error) => toastApiError(error),
  });

  return (
    <div className="space-y-6">
      <SectionHeader title="Institution declarations" description="Annual licensing declarations." actions={<Button variant="outline" onClick={() => { if (!institutionCanCreateDeclarations) { setApprovalGuardOpen(true); return; } createForm.reset(createEmptyDeclarationValues(usesAcademicFields)); setCreateOpen(true); }}>New declaration</Button>} />
      {!institutionCanCreateDeclarations ? (
        <Alert title="Institution Account is under review" description="Declaration will be available after approval. You will be notified once your application has been approved." />
      ) : null}
      <SearchFilterBar search="" onSearchChange={() => undefined} searchPlaceholder="Search is not exposed here" status={status} onStatusChange={(value) => { setStatus(value); setPage(1); }} statusOptions={declarationStatusOptions} onReset={() => { setStatus(''); setPage(1); }} />

      <DataTable
        columns={[
          { key: 'id', header: 'ID', render: (row) => row.id },
          { key: 'licensing_year', header: 'Year', render: (row) => row.licensing_year },
          { key: 'declaration_status', header: 'Status', render: (row) => <StatusBadge value={row.declaration_status as string} /> },
          { key: 'expected_amount', header: 'Expected', render: (row) => formatCurrency(row.expected_amount as number | null) },
          { key: 'outstanding_amount', header: 'Outstanding', render: (row) => formatCurrency(row.outstanding_amount as number | null) },
        ]}
        rows={institutionCanCreateDeclarations ? (listQuery.data?.data ?? []) : []}
        isLoading={listQuery.isLoading}
        exportTitle="Institution declarations"
        getRowKey={(row) => row.id}
        onRowClick={(row) => {
          setNewlyCreatedDeclarationId((current) => (current === row.id ? current : null));
          setSelectedId(row.id);
        }}
        selectedRowKey={selectedId ?? undefined}
      />
      <PaginationBar meta={listQuery.data?.meta} onPageChange={setPage} perPage={perPage} onPerPageChange={setPerPage} />

      <Modal
        open={Boolean(selectedDeclaration)}
        onClose={() => setSelectedId(null)}
        title="Declaration details"
        subtitle="Review or update the selected annual declaration."
        size="lg"
      >
        {selectedDeclaration ? (
          <div className="space-y-5">
            {!editable ? <Alert title="Declaration editing is locked" description="Only draft and changes requested declarations remain editable in this portal." /> : null}

        
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge value={selectedDeclaration.declaration_status ?? 'draft'} />
            <span className="text-sm text-slate-500">Submitted: {formatDate(selectedDeclaration.submitted_at)}</span>
            <span className="text-sm text-slate-500">Approved: {formatDate(selectedDeclaration.approved_at)}</span>
          </div>
          <DeclarationForm
            form={editForm}
            selectedDeclaration={selectedDeclaration}
            editable={editable}
            savePending={saveMutation.isPending}
            submitPending={submitMutation.isPending}
            usesAcademicFields={usesAcademicFields}
            onSave={(values) => saveMutation.mutate(values)}
            onSubmit={() => submitMutation.mutate()}
          />
                  </div>
        ) : null}
      </Modal>

      <Modal
        open={approvalGuardOpen}
        onClose={() => setApprovalGuardOpen(false)}
        title="Institution Account is under review"
        subtitle="Declaration will be available after approval. You will be notified once your application has been approved."
        size="sm"
      >
        <div className="flex justify-end">
          <Button type="button" onClick={() => setApprovalGuardOpen(false)}>Close</Button>
        </div>
      </Modal>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New declaration"
        subtitle="Create a new annual declaration and attach the required supporting document before saving."
        size="lg"
      >
        <DeclarationForm
          form={createForm}
          editable
          savePending={createMutation.isPending}
          usesAcademicFields={usesAcademicFields}
          onSave={(values) => createMutation.mutate(values)}
        />
      </Modal>
    </div>
  );
}
