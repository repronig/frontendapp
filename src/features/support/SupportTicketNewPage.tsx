import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FormField } from '@/components/shared/FormField';
import { FieldError, FieldLabel } from '@/components/shared/FieldLabel';
import { FormTextareaField } from '@/components/shared/FormTextareaField';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { createPortalSupportTicket } from '@/features/support/api';
import { supportDetailPath, supportListPath } from '@/features/support/paths';
import { createSupportTicketSchema, type CreateSupportTicketFormValues } from '@/features/support/schemas';
import { queryKeys } from '@/lib/queryKeys';
import { onMutationApiError } from '@/lib/mutationFeedback';
import type { SupportTicketCategory, SupportTicketPortalContext } from '@/types/domain';
import { toast } from 'sonner';

const CATEGORY_OPTIONS: { value: SupportTicketCategory; label: string }[] = [
  { value: 'technical_issue_or_error', label: 'Technical issue or error' },
  { value: 'information_required', label: 'Information required' },
  { value: 'licensing', label: 'Licensing' },
  { value: 'access_or_account', label: 'Access or account' },
  { value: 'other', label: 'Other' },
];

export function SupportTicketNewPage({ portalContext }: { portalContext: SupportTicketPortalContext }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const form = useForm<CreateSupportTicketFormValues>({
    resolver: zodResolver(createSupportTicketSchema) as Resolver<CreateSupportTicketFormValues>,
    defaultValues: {
      subject: '',
      body: '',
      category: 'other',
    },
  });

  const mutation = useMutation({
    mutationFn: (values: CreateSupportTicketFormValues) =>
      createPortalSupportTicket({
        portal_context: portalContext,
        subject: values.subject.trim(),
        body: values.body.trim(),
        category: values.category,
      }),
    onSuccess: (res) => {
      toast.success(res.message || 'Support request submitted.');
      void queryClient.invalidateQueries({ queryKey: queryKeys.portalSupportTickets });
      const id = res.data?.id;
      if (typeof id === 'number' && id > 0) {
        navigate(supportDetailPath(portalContext, id), { replace: true });
      } else {
        navigate(supportListPath(portalContext), { replace: true });
      }
    },
    onError: onMutationApiError(),
  });

  return (
    <div className="space-y-6">
      <SectionHeader
        title="New support ticket"
        description="Describe your issue so our team can help. You can add more messages after the ticket is created."
        actions={
          <Button variant="outline" asChild>
            <Link to={supportListPath(portalContext)}>Back to list</Link>
          </Button>
        }
      />

      <Card className="p-6">
        <form
          className="space-y-5"
          onSubmit={form.handleSubmit((values) => {
            void mutation.mutateAsync(values);
          })}
        >
          <FormField
            label="Subject"
            error={form.formState.errors.subject?.message}
            placeholder="Short summary"
            autoComplete="off"
            {...form.register('subject')}
          />
          <label className="block space-y-2">
            <FieldLabel>Category</FieldLabel>
            <select
              className="w-full rounded-md border border-[#D0D5DD] bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              {...form.register('category')}
            >
              {CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <FieldError message={form.formState.errors.category?.message} />
          </label>
          <FormTextareaField
            label="Details"
            error={form.formState.errors.body?.message}
            rows={6}
            placeholder="Describe the issue or question."
            {...form.register('body')}
          />
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" asChild>
              <Link to={supportListPath(portalContext)}>Cancel</Link>
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Submitting…' : 'Submit ticket'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
