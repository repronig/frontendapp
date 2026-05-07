import { useEffect, useRef, useState } from 'react';
import { useTablePagination } from '@/hooks/useTablePagination';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Bold, Heading2, Italic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable';
import { FormField } from '@/components/shared/FormField';
import { FormSelectField } from '@/components/shared/FormSelectField';
import { Modal } from '@/components/shared/Modal';
import { ModalFormActions, ModalFormRoot, ModalFormScrollBody, ModalFormSection } from '@/components/shared/ModalForm';
import { PaginationBar } from '@/components/shared/PaginationBar';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { createTermsAndCondition, listTermsAndConditions, updateTermsAndCondition, type TermsAndConditionPayload, type TermsAndConditionResource } from '@/features/admin/api';
import { termsAndConditionUpsertSchema, type TermsAndConditionUpsertFormValues } from '@/features/admin/schemas';
import { onMutationApiError } from '@/lib/mutationFeedback';
import { formatDate } from '@/utils/format';
import { queryKeys } from '@/lib/queryKeys';

const audienceOptions = [
  { label: 'All users', value: 'all' },
  { label: 'Members', value: 'member' },
  { label: 'Institutions', value: 'institution' },
];

export function AdminTermsAndConditionsPage() {
  const queryClient = useQueryClient();
  const editorRef = useRef<HTMLDivElement | null>(null);
  const { page, setPage, perPage, setPerPage } = useTablePagination();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TermsAndConditionResource | null>(null);
  const form = useForm<TermsAndConditionUpsertFormValues>({
    resolver: zodResolver(termsAndConditionUpsertSchema) as Resolver<TermsAndConditionUpsertFormValues>,
    defaultValues: { title: '', version: '1.0', audience: 'all', content: '', is_active: false },
  });

  const listQuery = usePaginatedList({ queryKey: [...queryKeys.termsAndConditions, page, perPage], queryFn: listTermsAndConditions, params: { page, per_page: perPage } });

  useEffect(() => {
    if (!editing) return;
    form.reset({ title: editing.title, version: editing.version, audience: editing.audience, content: editing.content, is_active: editing.is_active });
    if (editorRef.current) editorRef.current.innerHTML = editing.content ?? '';
  }, [editing, form]);

  const mutation = useMutation({
    mutationFn: (values: TermsAndConditionPayload) => (editing ? updateTermsAndCondition(editing.id, values) : createTermsAndCondition(values)),
    onSuccess: async (response) => {
      toast.success(response.message);
      if (!editing) setPage(1);
      setModalOpen(false);
      setEditing(null);
      form.reset({ title: '', version: '1.0', audience: 'all', content: '', is_active: false });
      if (editorRef.current) editorRef.current.innerHTML = '';
      await queryClient.invalidateQueries({ queryKey: queryKeys.termsAndConditions });
      await listQuery.refetch();
    },
    onError: onMutationApiError(),
  });

  function openCreate() {
    setEditing(null);
    form.reset({ title: '', version: '1.0', audience: 'all', content: '', is_active: false });
    if (editorRef.current) editorRef.current.innerHTML = '';
    setModalOpen(true);
  }

  function openEdit(row: TermsAndConditionResource) {
    setEditing(row);
    setModalOpen(true);
  }

  function syncEditorContent() {
    form.setValue('content', editorRef.current?.innerHTML ?? '', { shouldDirty: true, shouldValidate: true });
  }

  function applyEditorCommand(command: 'bold' | 'italic' | 'formatBlock', value?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    syncEditorContent();
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Terms and Conditions" description="Registration legal text." action={<Button onClick={openCreate}>New terms</Button>} />
      <DataTable
        columns={[
          { key: 'title', header: 'Title', render: (row) => <div><p className="font-semibold text-foreground">{row.title}</p><p className="text-sm text-muted-foreground">Version {row.version}</p></div> },
          { key: 'audience', header: 'Audience', render: (row) => row.audience.replaceAll('_', ' ') },
          { key: 'is_active', header: 'Status', render: (row) => <StatusBadge value={row.is_active ? 'active' : 'draft'} /> },
          { key: 'published_at', header: 'Published', render: (row) => formatDate(row.published_at) },
        ]}
        rows={listQuery.data?.data ?? []}
        getRowKey={(row) => row.id}
        onRowClick={openEdit}
        isLoading={listQuery.isLoading}
        exportTitle="Terms and conditions"
      />
      <PaginationBar meta={listQuery.data?.meta} onPageChange={setPage} perPage={perPage} onPerPageChange={setPerPage} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit terms' : 'Create terms'} size="lg">
        <ModalFormRoot
          onSubmit={(event) => {
            const html = editorRef.current?.innerHTML ?? '';
            form.setValue('content', html, { shouldValidate: true });
            form.handleSubmit((values) => mutation.mutate(values as TermsAndConditionPayload))(event);
          }}
        >
          <ModalFormScrollBody>
            <ModalFormSection badge="1" title="Document metadata" description="Title, version, and which audience this terms set applies to.">
              <FormField label="Title" requiredIndicator {...form.register('title')} error={form.formState.errors.title?.message} />
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <FormField label="Version" requiredIndicator {...form.register('version')} error={form.formState.errors.version?.message} />
                <FormSelectField label="Audience" requiredIndicator options={audienceOptions} {...form.register('audience')} error={form.formState.errors.audience?.message} />
              </div>
            </ModalFormSection>
            <ModalFormSection badge="2" title="Terms content" description="Use the toolbar for basic formatting. Content is stored as HTML.">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 rounded-t-md border border-b-0 border-input bg-muted/40 px-3 py-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => applyEditorCommand('formatBlock', 'h2')}><Heading2 className="mr-1 h-4 w-4" /> Heading</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => applyEditorCommand('bold')}><Bold className="mr-1 h-4 w-4" /> Bold</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => applyEditorCommand('italic')}><Italic className="mr-1 h-4 w-4" /> Italic</Button>
                </div>
                <div
                  ref={editorRef}
                  className="min-h-60 w-full rounded-b-md border border-input bg-background px-3 py-2 text-sm leading-6 text-foreground focus:outline-none focus:ring-2 focus:ring-ring [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold"
                  contentEditable
                  suppressContentEditableWarning
                  onInput={syncEditorContent}
                  onBlur={syncEditorContent}
                  dangerouslySetInnerHTML={{ __html: form.getValues('content') || '' }}
                />
                <input type="hidden" {...form.register('content')} />
                {form.formState.errors.content ? <p className="text-sm text-destructive">{form.formState.errors.content.message}</p> : null}
              </div>
            </ModalFormSection>
            <ModalFormSection badge="3" title="Publishing" description="Active terms are shown where the app links to legal text for that audience.">
              <Controller
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={Boolean(field.value)} onChange={(event) => field.onChange(event.target.checked)} />
                    Publish as active terms
                  </label>
                )}
              />
            </ModalFormSection>
          </ModalFormScrollBody>
          <ModalFormActions>
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Saving...' : 'Save terms'}</Button>
          </ModalFormActions>
        </ModalFormRoot>
      </Modal>
    </div>
  );
}
