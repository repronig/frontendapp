import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FormTextareaField } from '@/components/shared/FormTextareaField';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { getPortalSupportTicket, postPortalSupportTicketReply } from '@/features/support/api';
import { formatSupportTicketRef } from '@/features/support/formatTicketRef';
import { supportListPath, supportNewPath } from '@/features/support/paths';
import { queryKeys } from '@/lib/queryKeys';
import { onMutationApiError } from '@/lib/mutationFeedback';
import type { SupportTicketPortalContext } from '@/types/domain';
import { formatDateTime } from '@/utils/format';
import { toast } from 'sonner';
import { cn } from '@/utils/cn';

function statusLabel(status: string) {
  return status.replace(/_/g, ' ');
}

function displayName(user?: { first_name?: string | null; last_name?: string | null; email?: string } | null) {
  if (!user) return 'User';
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  return name || user.email || 'User';
}

function SupportTicketDetailSkeleton({ ticketRef }: { ticketRef: number }) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-8 max-w-md animate-pulse rounded-md bg-slate-200 dark:bg-slate-700" />
        <p className="text-sm text-[#667085] dark:text-slate-400">Ticket {formatSupportTicketRef(ticketRef)}</p>
        <div className="h-4 w-52 animate-pulse rounded-md bg-slate-100 dark:bg-slate-800" />
      </div>
      <Card className="space-y-5 p-6">
        <div className="h-4 w-36 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-28 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
        <div className="h-4 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-20 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
        <div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-24 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
      </Card>
    </div>
  );
}

function parseTicketId(param: string | undefined, legacyQuery: string | null): number | null {
  if (param) {
    const id = Number.parseInt(param, 10);
    if (Number.isFinite(id) && id > 0) return id;
  }
  if (legacyQuery) {
    const id = Number.parseInt(legacyQuery, 10);
    if (Number.isFinite(id) && id > 0) return id;
  }
  return null;
}

export function SupportTicketDetailPage({ portalContext }: { portalContext: SupportTicketPortalContext }) {
  const { ticketId: ticketIdParam } = useParams<{ ticketId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const legacyTicket = searchParams.get('ticket');
  const ticketId = useMemo(
    () => parseTicketId(ticketIdParam, legacyTicket),
    [ticketIdParam, legacyTicket],
  );

  const queryClient = useQueryClient();
  const [replyBody, setReplyBody] = useState('');

  useEffect(() => {
    if (!ticketIdParam || !legacyTicket || ticketIdParam === legacyTicket) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('ticket');
        return next;
      },
      { replace: true },
    );
  }, [ticketIdParam, legacyTicket, setSearchParams]);

  const detailQuery = useQuery({
    queryKey: queryKeys.portalSupportTicket(ticketId),
    queryFn: () => getPortalSupportTicket(ticketId as number),
    enabled: Boolean(ticketId),
  });

  const ticket = detailQuery.data?.data ?? null;

  const replyMutation = useMutation({
    mutationFn: () => postPortalSupportTicketReply(ticketId as number, replyBody.trim()),
    onSuccess: () => {
      toast.success('Reply posted.');
      setReplyBody('');
      void queryClient.invalidateQueries({ queryKey: queryKeys.portalSupportTicket(ticketId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.portalSupportTickets });
    },
    onError: onMutationApiError(),
  });

  if (ticketId === null) {
    return (
      <div className="space-y-4">
        <SectionHeader title="Support" description="Invalid ticket link." />
        <Card className="p-6 text-sm text-[#667085] dark:text-slate-400">
          <p>This ticket could not be found.</p>
          <Button asChild className="mt-4" variant="outline">
            <Link to={supportListPath(portalContext)}>Back to support</Link>
          </Button>
        </Card>
      </div>
    );
  }

  if (detailQuery.isLoading) {
    return <SupportTicketDetailSkeleton ticketRef={ticketId} />;
  }

  if (detailQuery.isError || !ticket) {
    return (
      <div className="space-y-4">
        <SectionHeader title="Support" description="Ticket not available." />
        <Card className="p-6 text-sm text-[#B42318]">
          Unable to load this ticket. It may have been removed or you may not have access.
          <div className="mt-4">
            <Button asChild variant="outline">
              <Link to={supportListPath(portalContext)}>Back to list</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title={ticket.subject}
        description={`Ticket ${formatSupportTicketRef(ticket.id)} · Updated ${formatDateTime(ticket.updated_at)}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <StatusBadge value={ticket.status} label={statusLabel(ticket.status)} />
            <Button variant="outline" size="sm" asChild>
              <Link to={supportListPath(portalContext)}>Back to list</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to={supportNewPath(portalContext)}>New ticket</Link>
            </Button>
          </div>
        }
      />

      <Card className="space-y-6 p-6">
        <div>
          <h3 className="text-sm font-semibold text-[#344054] dark:text-slate-200">Original message</h3>
          <div className="mt-2 rounded-lg border border-[#EAECF0] bg-[#F9FAFB] p-4 text-sm text-[#344054] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
            <p className="whitespace-pre-wrap">{ticket.body}</p>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-[#344054] dark:text-slate-200">Conversation</h3>
          {(ticket.replies ?? []).length === 0 ? (
            <p className="text-sm text-[#667085] dark:text-slate-400">No replies yet. REPRONIG support will post here when they respond.</p>
          ) : (
            <ul className="space-y-3">
              {(ticket.replies ?? []).map((r) => (
                <li
                  key={r.id}
                  className={cn(
                    'rounded-lg border p-3 text-sm',
                    r.is_staff
                      ? 'border-[#E9D7FE] bg-[#F4EBFF] dark:border-violet-900 dark:bg-violet-950/30'
                      : 'border-[#EAECF0] bg-white dark:border-slate-800 dark:bg-slate-950',
                  )}
                >
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs text-[#667085] dark:text-slate-400">
                    <span className="font-medium text-[#344054] dark:text-slate-200">
                      {r.is_staff ? 'REPRONIG support' : displayName(r.user)}
                    </span>
                    <span>{formatDateTime(r.created_at)}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-[#101828] dark:text-slate-100">{r.body}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-2 border-t border-[#EAECF0] pt-4 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-[#344054] dark:text-slate-200">Your reply</h3>
          <FormTextareaField label="Message" value={replyBody} onChange={(e) => setReplyBody(e.target.value)} rows={4} />
          <div className="flex justify-end">
            <Button type="button" disabled={replyMutation.isPending || !replyBody.trim()} onClick={() => void replyMutation.mutateAsync(undefined)}>
              {replyMutation.isPending ? 'Sending…' : 'Send reply'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
