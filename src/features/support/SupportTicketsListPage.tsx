import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { queryKeys } from '@/lib/queryKeys';
import { listPortalSupportTickets } from '@/features/support/api';
import { supportDetailPath, supportListPath, supportNewPath } from '@/features/support/paths';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/utils/cn';
import { PaginationBar } from '@/components/shared/PaginationBar';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { DEFAULT_PAGE_SIZE, normalizeClientPageSize } from '@/constants/pagination';
import type { SupportTicketPortalContext, SupportTicketResource } from '@/types/domain';
import { formatDateTime } from '@/utils/format';

function statusLabel(status: string) {
  return status.replace(/_/g, ' ');
}

function SupportTicketsListSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-40 animate-pulse rounded-md bg-slate-200 dark:bg-slate-700" />
        <div className="h-4 max-w-xl animate-pulse rounded-md bg-slate-100 dark:bg-slate-800" />
      </div>
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="border-b border-[#EAECF0] bg-[#F9FAFB] text-xs font-semibold uppercase tracking-wide text-[#667085] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3 text-right"> </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAECF0] dark:divide-slate-800">
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={`sk-${i}`}>
                  <td className="px-4 py-3">
                    <div className={cn('h-4 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700', i % 2 === 0 ? 'w-[min(280px,55vw)]' : 'w-[min(220px,45vw)]')} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-6 w-24 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-32 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="ml-auto h-4 w-10 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export function SupportTicketsListPage({ portalContext }: { portalContext: SupportTicketPortalContext }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState(1);

  useEffect(() => {
    const legacy = searchParams.get('ticket');
    if (!legacy) return;
    const id = Number.parseInt(legacy, 10);
    if (!Number.isFinite(id) || id < 1) return;
    navigate(supportDetailPath(portalContext, id), { replace: true });
  }, [navigate, portalContext, searchParams]);
  const [perPage, setPerPage] = useState(DEFAULT_PAGE_SIZE);

  const listQuery = usePaginatedList({
    queryKey: [...queryKeys.portalSupportTickets, page, perPage],
    queryFn: listPortalSupportTickets,
    params: { page, per_page: perPage },
  });

  const setPerPageSafe = useCallback((next: number) => {
    setPerPage(normalizeClientPageSize(next));
    setPage(1);
  }, []);

  const tickets = (listQuery.data?.data ?? []) as SupportTicketResource[];
  const meta = listQuery.data?.meta;

  const rows = useMemo(
    () =>
      tickets.map((t) => ({
        id: t.id,
        subject: t.subject,
        status: t.status,
        updated_at: t.updated_at,
      })),
    [tickets],
  );

  if (listQuery.isLoading && !listQuery.data) {
    return <SupportTicketsListSkeleton />;
  }

  if (listQuery.isError) {
    return (
      <div className="space-y-4">
        <SectionHeader title="Support" description="Contact REPRONIG support from your portal." />
        <Card className="p-6 text-sm text-[#B42318]">Could not load tickets. Please try again.</Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Support"
        description="Open a ticket, track responses from REPRONIG staff, and add follow-up messages."
        actions={
          <Button asChild>
            <Link to={supportNewPath(portalContext)}>New ticket</Link>
          </Button>
        }
      />

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="border-b border-[#EAECF0] bg-[#F9FAFB] text-xs font-semibold uppercase tracking-wide text-[#667085] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3 text-right"> </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAECF0] dark:divide-slate-800">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-[#667085] dark:text-slate-400">
                    <p className="font-medium text-[#344054] dark:text-slate-200">No tickets yet</p>
                    <p className="mt-1">When you submit a request, it will appear here. Each ticket has a reference number (shown on the detail page and in email updates).</p>
                    <Button asChild variant="outline" size="sm" className="mt-4">
                      <Link to={supportNewPath(portalContext)}>Create your first ticket</Link>
                    </Button>
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="hover:bg-[#F9FAFB] dark:hover:bg-slate-900/80">
                    <td className="max-w-[280px] px-4 py-3 font-medium text-[#101828] dark:text-slate-100">
                      <span className="line-clamp-2">{row.subject}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge value={row.status} label={statusLabel(row.status)} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-[#667085] dark:text-slate-400">{formatDateTime(row.updated_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={supportDetailPath(portalContext, row.id)}
                        className="font-medium text-[#B01217] hover:underline dark:text-red-400"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {meta ? (
          <div className="border-t border-[#EAECF0] p-4 dark:border-slate-800">
            <PaginationBar meta={meta} onPageChange={setPage} perPage={perPage} onPerPageChange={setPerPageSafe} subject="tickets" />
          </div>
        ) : null}
      </Card>
    </div>
  );
}
