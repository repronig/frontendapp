import { useMemo, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { onMutationApiError, onMutationFileUploadError, toastActionSuccess } from '@/lib/mutationFeedback';
import { FileCard } from '@/components/shared/FileCard';
import { FileUploadField } from '@/components/shared/FileUploadField';
import { FormField } from '@/components/shared/FormField';
import { FormSelectField } from '@/components/shared/FormSelectField';
import { FormTextareaField } from '@/components/shared/FormTextareaField';
import { Modal } from '@/components/shared/Modal';
import { ModalFormActions, ModalFormRoot, ModalFormScrollBody, ModalFormSection } from '@/components/shared/ModalForm';
import { PaginationBar } from '@/components/shared/PaginationBar';
import { SearchFilterBar } from '@/components/shared/SearchFilterBar';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { useTablePagination } from '@/hooks/useTablePagination';
import type { ListParams, PaginatedResponse } from '@/types/api';
import type { DocumentResource } from '@/types/domain';
import { formatFileSize } from '@/utils/format';

const schema = z.object({
  category: z.string().min(1, 'Category is required.'),
  title: z.string().min(1, 'Title is required.'),
  document_type: z.string().optional(),
  visibility: z.enum(['private', 'restricted', 'internal']).default('private'),
  description: z.string().optional(),
  file: z.instanceof(File, { message: 'A file is required.' }),
});

type FormValues = z.infer<typeof schema>;

const defaultCategoryOptions = [
  { label: 'All categories', value: '' },
  { label: 'Compliance', value: 'compliance' },
  { label: 'Verification', value: 'verification' },
  { label: 'Profile', value: 'profile' },
  { label: 'Governance', value: 'governance' },
  { label: 'Licensing', value: 'licensing' },
  { label: 'Other', value: 'other' },
];

const visibilityOptions = [
  { label: 'Private', value: 'private' },
  { label: 'Restricted', value: 'restricted' },
  { label: 'Internal', value: 'internal' },
];

export function DocumentManager({
  title,
  description,
  queryKey,
  listQuery,
  uploadDocument,
  deleteDocument,
  categoryOptions = defaultCategoryOptions,
  documentTypeOptions,
  allowUpload = true,
}: {
  title: string;
  description: string;
  queryKey: readonly unknown[];
  listQuery: (params: ListParams) => Promise<PaginatedResponse<DocumentResource>>;
  uploadDocument: (payload: FormValues) => Promise<unknown>;
  deleteDocument: (documentId: number) => Promise<unknown>;
  categoryOptions?: { label: string; value: string; subText?: string }[];
  documentTypeOptions?: { label: string; value: string; subText?: string }[];
  /** When false, listing/deletion still works; “Add document” is disabled (e.g. missing admin attach target). */
  allowUpload?: boolean;
}) {
  const queryClient = useQueryClient();
  const { page, setPage, perPage, setPerPage } = useTablePagination();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      category: categoryOptions.find((option) => option.value)?.value ?? 'compliance',
      title: '',
      document_type: '',
      visibility: 'private',
      description: '',
    },
  });

  const documentsQuery = usePaginatedList({
    queryKey: [...queryKey, page, perPage, search, category],
    queryFn: listQuery,
    params: {
      page,
      per_page: perPage,
      search: search || undefined,
      category: category || undefined,
    } as ListParams,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey });

  const uploadMutation = useMutation({
    mutationFn: uploadDocument,
    onSuccess: () => {
      const currentCategory = form.getValues('category');
      form.reset({ category: currentCategory || 'compliance', title: '', document_type: '', visibility: 'private', description: '' });
      setUploadOpen(false);
      refresh();
      toastActionSuccess('Document uploaded successfully.');
    },
    onError: onMutationFileUploadError(),
  });

  const deleteMutation = useMutation({
    mutationFn: async (documentId: number) => {
      setDeletingId(documentId);
      return deleteDocument(documentId);
    },
    onSuccess: () => {
      refresh();
      toastActionSuccess('Document deleted successfully.');
    },
    onError: onMutationApiError(),
    onSettled: () => setDeletingId(null),
  });

  const items = documentsQuery.data?.data ?? [];
  const cards = useMemo(() => items.map((document) => ({
    ...document,
    subtitle: [
      document.category ?? document.document_type ?? 'document',
      document.mime_type ?? null,
      typeof document.file_size === 'number' ? formatFileSize(document.file_size) : null,
    ].filter(Boolean).join(' • '),
  })), [items]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title={title}
        description={description}
        actions={<Button type="button" disabled={!allowUpload} onClick={() => allowUpload && setUploadOpen(true)}>Add document</Button>}
      />

      <SearchFilterBar
        search={search}
        onSearchChange={(value) => { setSearch(value); setPage(1); }}
        searchPlaceholder="Search documents"
        status={category}
        onStatusChange={(value) => { setCategory(value); setPage(1); }}
        statusOptions={categoryOptions}
        onReset={() => { setSearch(''); setCategory(''); setPage(1); }}
      />

      <div className="grid gap-4 md:grid-cols-2">
        {documentsQuery.isLoading && cards.length === 0 ? Array.from({ length: 4 }).map((_, index) => (
          <Card key={`document-skeleton-${index}`} className="space-y-3 p-5">
            <div className="h-4 w-2/3 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
            <div className="h-3 w-1/2 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
            <div className="h-10 w-full animate-pulse rounded-md bg-slate-100 dark:bg-slate-800" />
          </Card>
        )) : null}
        {cards.map((document) => (
          <FileCard
            key={document.id}
            title={document.title ?? document.file_name ?? `Document ${document.id}`}
            subtitle={document.subtitle}
            fileUrl={document.file_url}
            downloadUrl={document.download_url}
            onDelete={() => {
              if (window.confirm(`Delete “${document.title ?? document.file_name ?? 'this document'}”?`)) {
                deleteMutation.mutate(document.id);
              }
            }}
            deleting={deletingId === document.id}
          />
        ))}
      </div>

      {!documentsQuery.isLoading && cards.length === 0 ? (
        <Card className="p-8 text-center text-sm text-[#64748B] dark:text-slate-300">No documents found yet. Upload the first record to get started.</Card>
      ) : null}

      <PaginationBar meta={documentsQuery.data?.meta} onPageChange={setPage} perPage={perPage} onPerPageChange={setPerPage} />

      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title="Add document" subtitle={description} size="lg">
        <ModalFormRoot onSubmit={form.handleSubmit((values) => uploadMutation.mutate(values))}>
          <ModalFormScrollBody>
            <ModalFormSection badge="1" title="Classification" description="How this document is categorized and shown in the portal.">
              <div className="space-y-4">
                <FormSelectField label="Category" requiredIndicator options={categoryOptions.filter((option) => option.value)} error={form.formState.errors.category?.message} {...form.register('category')} />
                <FormField label="Title" requiredIndicator error={form.formState.errors.title?.message} {...form.register('title')} />
                {documentTypeOptions?.length ? <FormSelectField label="Document type" requiredIndicator options={documentTypeOptions} placeholder="Select document type" error={form.formState.errors.document_type?.message} {...form.register('document_type')} /> : <FormField label="Document type" requiredIndicator error={form.formState.errors.document_type?.message} {...form.register('document_type')} />}
                <FormSelectField label="Visibility" requiredIndicator options={visibilityOptions} error={form.formState.errors.visibility?.message} {...form.register('visibility')} />
              </div>
            </ModalFormSection>
            <ModalFormSection badge="2" title="Details & file" description="Optional description and the file to upload.">
              <FormTextareaField label="Description" error={form.formState.errors.description?.message} {...form.register('description')} />
              <div className="mt-5">
                <FileUploadField
                  label="File"
                  required
                  file={form.watch('file')}
                  error={form.formState.errors.file?.message}
                  helperText="Choose the document file to upload."
                  onFileChange={(file) => {
                    if (file) form.setValue('file', file, { shouldValidate: true });
                  }}
                />
              </div>
            </ModalFormSection>
          </ModalFormScrollBody>
          <ModalFormActions>
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={uploadMutation.isPending} className="w-full sm:w-auto">{uploadMutation.isPending ? 'Uploading...' : 'Upload document'}</Button>
          </ModalFormActions>
        </ModalFormRoot>
      </Modal>
    </div>
  );
}
