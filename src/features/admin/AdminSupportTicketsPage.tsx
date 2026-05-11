import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/EmptyState';
import { FormField } from '@/components/shared/FormField';
import { FieldError, FieldLabel } from '@/components/shared/FieldLabel';
import { formatSupportTicketRef } from '@/features/support/formatTicketRef';
import { FormTextareaField } from '@/components/shared/FormTextareaField';
import { LoadingState } from '@/components/shared/LoadingState';
import { PaginationBar } from '@/components/shared/PaginationBar';
import { SearchFilterBar } from '@/components/shared/SearchFilterBar';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { DEFAULT_PAGE_SIZE, normalizeClientPageSize } from '@/constants/pagination';
import {
  getAdminSupportTicket,
  listAdminSupportTickets,
  patchAdminSupportTicket,
  postAdminSupportTicketInternalNote,
  postAdminSupportTicketReply,
} from '@/features/admin/api';
import { getAdminFieldError, showAdminActionError, showAdminActionSuccess } from '@/features/admin/action-feedback';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { queryKeys } from '@/lib/queryKeys';
import type { SupportTicketPortalContext, SupportTicketResource } from '@/types/domain';
import { formatDateTime } from '@/utils/format';
import { coerceUserLike } from '@/utils/userNamesFromUser';
import { cn } from '@/utils/cn';

/** Canonical staff inbox (super-admins use the same path; see `portal-nav` + router). */
const ADMIN_SUPPORT_BASE = '/admin/support';

const STATUS_FILTER = [
  { label: 'All statuses', value: '' },
  { label: 'Open', value: 'open' },
  { label: 'In progress', value: 'in_progress' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Closed', value: 'closed' },
];

function statusLabel(status: string) {
  return status.replace(/_/g, ' ');
}

function displayName(user?: { first_name?: string | null; last_name?: string | null; email?: string; name?: string } | null) {
  return coerceUserLike(user)?.name || user?.email || 'User';
}

const PORTAL_QUEUE_BADGE: Record<
  SupportTicketPortalContext,
  { label: string; className: string }
> = {
  member: {
    label: 'Member',
    className:
      'border-[#B2DDFF] bg-[#EFF8FF] text-[#175CD3] shadow-[0_1px_2px_rgba(23,92,211,0.08)] dark:border-sky-800 dark:bg-sky-950/70 dark:text-sky-200',
  },
  association: {
    label: 'Association',
    className:
      'border-[#E9D7FE] bg-[#F4EBFF] text-[#6927DA] shadow-[0_1px_2px_rgba(105,39,218,0.08)] dark:border-violet-800 dark:bg-violet-950/70 dark:text-violet-200',
  },
  institution: {
    label: 'Institution',
    className:
      'border-[#ABEFC6] bg-[#ECFDF3] text-[#067647] shadow-[0_1px_2px_rgba(6,118,71,0.08)] dark:border-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-200',
  },
};

function PortalQueueBadge({ context }: { context?: SupportTicketPortalContext | string | null }) {
  const raw = (context ?? '') as SupportTicketPortalContext;
  const cfg = PORTAL_QUEUE_BADGE[raw] ?? {
    label: 'Portal',
    className:
      'border-[#D0D5DD] bg-[#F9FAFB] text-[#475467] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
  };

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-[11px] font-bold leading-none tracking-wide',
        cfg.className,
      )}
    >
      {cfg.label}
    </span>
  );
}

export function AdminSupportTicketsPage() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const { ticketId: ticketIdParam } = useParams<{ ticketId?: string }>();
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [statusEdit, setStatusEdit] = useState('open');
  const [staffReply, setStaffReply] = useState('');
  const [internalNote, setInternalNote] = useState('');

  const listQuery = usePaginatedList({
    queryKey: [...queryKeys.adminSupportTickets, page, perPage, search, status],
    queryFn: listAdminSupportTickets,
    params: {
      page,
      per_page: perPage,
      search: search.trim() || undefined,
      status: status || undefined,
    },
  });

  const detailQuery = useQuery({
    queryKey: queryKeys.adminSupportTicket(selectedId),
    queryFn: () => getAdminSupportTicket(selectedId as number),
    enabled: Boolean(selectedId),
  });

  const ticket = detailQuery.data?.data ?? null;

  useEffect(() => {
    const legacy = searchParams.get('ticket');
    if (legacy && !ticketIdParam) {
      const id = Number.parseInt(legacy, 10);
      if (Number.isFinite(id) && id > 0) {
        navigate(`${ADMIN_SUPPORT_BASE}/${id}`, { replace: true });
      }
    }
  }, [navigate, searchParams, ticketIdParam]);

  useEffect(() => {
    if (!ticketIdParam) {
      setSelectedId(null);
      return;
    }
    const id = Number.parseInt(ticketIdParam, 10);
    if (!Number.isFinite(id) || id < 1) {
      setSelectedId(null);
      return;
    }
    setSelectedId((current) => (current === id ? current : id));
  }, [ticketIdParam]);

  useEffect(() => {
    if (selectedId === null) {
      return;
    }
    const expected = `${ADMIN_SUPPORT_BASE}/${selectedId}`;
    if (location.pathname !== expected) {
      navigate({ pathname: expected, search: '' }, { replace: true });
    }
  }, [location.pathname, navigate, selectedId]);

  useEffect(() => {
    setStaffReply('');
    setInternalNote('');
  }, [selectedId]);

  useEffect(() => {
    if (ticket?.status) {
      setStatusEdit(ticket.status);
    }
  }, [ticket?.id, ticket?.status]);

  const setPerPageSafe = useCallback((next: number) => {
    setPerPage(normalizeClientPageSize(next));
    setPage(1);
  }, []);

  const invalidateTicket = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.adminSupportTickets });
    if (selectedId) void queryClient.invalidateQueries({ queryKey: queryKeys.adminSupportTicket(selectedId) });
  }, [queryClient, selectedId]);

  const statusMutation = useMutation({
    mutationFn: () => patchAdminSupportTicket(selectedId as number, { status: statusEdit }),
    onSuccess: (res) => {
      showAdminActionSuccess('Status updated.', res.message);
      const next = res.data?.status;
      if (typeof next === 'string') setStatusEdit(next);
      invalidateTicket();
    },
    onError: (e) => showAdminActionError(e, 'Could not update status.'),
  });

  const staffReplyMutation = useMutation({
    mutationFn: () => postAdminSupportTicketReply(selectedId as number, staffReply.trim()),
    onSuccess: (res) => {
      showAdminActionSuccess('Reply sent.', res.message);
      setStaffReply('');
      invalidateTicket();
    },
    onError: (e) => showAdminActionError(e, 'Could not post reply.'),
  });

  const noteMutation = useMutation({
    mutationFn: () => postAdminSupportTicketInternalNote(selectedId as number, internalNote.trim()),
    onSuccess: (res) => {
      showAdminActionSuccess('Internal note saved.', res.message);
      setInternalNote('');
      invalidateTicket();
    },
    onError: (e) => showAdminActionError(e, 'Could not save internal note.'),
  });

  const tickets = listQuery.data?.data ?? [];
  const meta = listQuery.data?.meta;

  const rows = tickets as SupportTicketResource[];

  if (listQuery.isLoading && !listQuery.data) {
    return <LoadingState label="support tickets" />;
  }

  if (listQuery.isError) {
    return (
      <div className="space-y-4">
        <SectionHeader title="Support" description="Review and respond to portal support requests." />
        <Card className="p-6 text-sm text-[#B42318]">Could not load tickets.</Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Support" description="Search tickets, update status, reply as staff, and add internal notes (not visible to users)." />

      <SearchFilterBar
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        status={status}
        onStatusChange={(v) => {
          setStatus(v);
          setPage(1);
        }}
        statusOptions={STATUS_FILTER}
        searchPlaceholder="Search subject or description"
        onReset={() => {
          setSearch('');
          setStatus('');
          setPage(1);
        }}
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="p-0 lg:col-span-2">
          <div className="border-b border-[#EAECF0] px-4 py-3 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-[#344054] dark:text-slate-200">Queue</h3>
          </div>
          {rows.length === 0 ? (
            <div className="p-6">
              <EmptyState title="No tickets" description="Tickets opened from member, association, and institution portals appear here." />
            </div>
          ) : (
            <ul className="max-h-[70vh] divide-y divide-[#EAECF0] overflow-y-auto dark:divide-slate-800">
              {rows.map((t) => (
                <li key={t.id}>
                  <Link
                    to={`${ADMIN_SUPPORT_BASE}/${t.id}`}
                    className={cn(
                      'flex w-full flex-col gap-1 px-4 py-3 text-left text-sm transition hover:bg-[#F9FAFB] dark:hover:bg-slate-900',
                      selectedId === t.id && 'bg-[#F4EBFF] dark:bg-violet-950/30',
                    )}
                  >
                    <span className="line-clamp-2 font-medium text-[#101828] dark:text-slate-100">{t.subject}</span>
                    <span className="text-xs text-[#667085] dark:text-slate-400">
                      {t.user ? displayName(t.user) : 'Unknown'} · {formatDateTime(t.updated_at)}
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <PortalQueueBadge context={t.portal_context} />
                      <StatusBadge value={t.status} label={statusLabel(t.status)} className="w-fit" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {meta ? (
            <div className="border-t border-[#EAECF0] p-4 dark:border-slate-800">
              <PaginationBar meta={meta} onPageChange={setPage} perPage={perPage} onPerPageChange={setPerPageSafe} subject="tickets" />
            </div>
          ) : null}
        </Card>

        <Card className="min-h-[360px] space-y-6 p-6 lg:col-span-3">
          {!selectedId ? (
            <EmptyState title="Select a ticket" description="Pick a row from the queue to review details and respond." />
          ) : detailQuery.isLoading ? (
            <div className="space-y-5">
              <div className="h-7 max-w-lg animate-pulse rounded-md bg-slate-200 dark:bg-slate-700" />
              <p className="text-sm text-[#667085] dark:text-slate-400">Ticket {formatSupportTicketRef(selectedId)}</p>
              <div className="h-4 w-full max-w-md animate-pulse rounded-md bg-slate-100 dark:bg-slate-800" />
              <div className="h-32 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
              <div className="flex gap-3">
                <div className="h-10 w-48 animate-pulse rounded-md bg-slate-200 dark:bg-slate-700" />
                <div className="h-10 w-28 animate-pulse rounded-md bg-slate-200 dark:bg-slate-700" />
              </div>
            </div>
          ) : detailQuery.isError || !ticket ? (
            <p className="text-sm text-[#B42318]">Unable to load this ticket.</p>
          ) : (
            <>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-xl font-semibold text-[#101828] dark:text-slate-100">{ticket.subject}</h2>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-[#667085]"
                    onClick={() => {
                      setSelectedId(null);
                      navigate(ADMIN_SUPPORT_BASE, { replace: true });
                    }}
                  >
                    Back to queue
                  </Button>
                </div>
                <p className="text-sm text-[#667085] dark:text-slate-400">
                  Ticket {formatSupportTicketRef(ticket.id)} · From {ticket.user ? displayName(ticket.user) : 'Unknown'} · Portal: {ticket.portal_context} ·{' '}
                  {formatDateTime(ticket.created_at)}
                </p>
              </div>

              <div className="rounded-lg border border-[#EAECF0] bg-[#F9FAFB] p-4 text-sm text-[#344054] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                <p className="whitespace-pre-wrap">{ticket.body}</p>
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <label className="block min-w-[200px] space-y-2">
                  <FieldLabel>Ticket status</FieldLabel>
                  <select
                    className="h-10 w-full rounded-md border border-[#D0D5DD] bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                    value={statusEdit}
                    onChange={(e) => setStatusEdit(e.target.value)}
                  >
                    {STATUS_FILTER.filter((o) => o.value).map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <FieldError message={getAdminFieldError(statusMutation.error, ['status'])} />
                </label>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={statusMutation.isPending || statusEdit === ticket.status}
                  onClick={() => void statusMutation.mutateAsync(undefined)}
                >
                  {statusMutation.isPending ? 'Saving…' : 'Update status'}
                </Button>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-[#344054] dark:text-slate-200">Thread</h3>
                {(ticket.replies ?? []).length === 0 ? (
                  <p className="text-sm text-[#667085] dark:text-slate-400">No replies yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {(ticket.replies ?? []).map((r) => (
                      <li
                        key={r.id}
                        className={cn(
                          'rounded-lg border p-3 text-sm',
                          r.is_staff
                            ? 'border-[#D1FAE5] bg-[#ECFDF5] dark:border-emerald-900 dark:bg-emerald-950/30'
                            : 'border-[#EAECF0] bg-white dark:border-slate-800 dark:bg-slate-950',
                        )}
                      >
                        <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs text-[#667085] dark:text-slate-400">
                          <span className="font-medium text-[#344054] dark:text-slate-200">
                            {r.is_staff ? `Staff (${displayName(r.user)})` : displayName(r.user)}
                          </span>
                          <span>{formatDateTime(r.created_at)}</span>
                        </div>
                        <p className="whitespace-pre-wrap text-[#101828] dark:text-slate-100">{r.body}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <FormTextareaField label="Staff reply (visible to user)" value={staffReply} onChange={(e) => setStaffReply(e.target.value)} rows={4} />
              <div className="flex justify-end">
                <Button type="button" disabled={staffReplyMutation.isPending || !staffReply.trim()} onClick={() => void staffReplyMutation.mutateAsync(undefined)}>
                  {staffReplyMutation.isPending ? 'Sending…' : 'Send staff reply'}
                </Button>
              </div>

              <div className="border-t border-dashed border-[#FEDF89] pt-4 dark:border-amber-900">
                <h3 className="mb-2 text-sm font-semibold text-[#B45309] dark:text-amber-200">Internal notes (staff only)</h3>
                {(ticket.internal_notes ?? []).length === 0 ? (
                  <p className="mb-3 text-sm text-[#667085] dark:text-slate-400">No internal notes.</p>
                ) : (
                  <ul className="mb-3 space-y-2">
                    {(ticket.internal_notes ?? []).map((n) => (
                      <li key={n.id} className="rounded-md border border-[#FEDF89] bg-[#FFFAEB] p-2 text-sm dark:border-amber-900 dark:bg-amber-950/40">
                        <div className="text-xs text-[#92400E] dark:text-amber-200/90">
                          {displayName(n.user)} · {formatDateTime(n.created_at)}
                        </div>
                        <p className="whitespace-pre-wrap text-[#78350F] dark:text-amber-100">{n.body}</p>
                      </li>
                    ))}
                  </ul>
                )}
                <FormTextareaField label="Add internal note" value={internalNote} onChange={(e) => setInternalNote(e.target.value)} rows={3} />
                <div className="mt-2 flex justify-end">
                  <Button type="button" variant="outline" disabled={noteMutation.isPending || !internalNote.trim()} onClick={() => void noteMutation.mutateAsync(undefined)}>
                    {noteMutation.isPending ? 'Saving…' : 'Save internal note'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
