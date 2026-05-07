import { DashboardList, DashboardListItem } from '@/components/shared/DashboardList';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatDateTime, humanizeActivityLabel, humanizeActivitySubject } from '@/utils/format';

export type DashboardActivityRow = {
  id: number;
  action: string;
  subject_type?: string | null;
  subject_id?: number | null;
  created_at?: string | null;
  actor?: { id: number; name: string; email?: string } | null;
};

function subjectLine(row: DashboardActivityRow) {
  const label = humanizeActivitySubject(row.subject_type);
  if (!label && row.subject_id == null) {
    return 'Platform event';
  }
  if (row.subject_id != null) {
    return `${label || 'Record'} #${row.subject_id}`;
  }
  return label || 'Record';
}

export function RecentDashboardActivityList({
  title,
  description,
  items,
  emptyTitle = 'No recent activity',
  emptyDescription = 'Audit events will appear here after actions are recorded on related records.',
}: {
  title: string;
  description: string;
  items: DashboardActivityRow[];
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  return (
    <DashboardList title={title} description={description}>
      {items.length ? (
        items.map((row) => (
          <DashboardListItem
            key={row.id}
            title={humanizeActivityLabel(row.action)}
            subtitle={subjectLine(row)}
            meta={<span className="text-xs text-[#667085] dark:text-slate-400">{row.actor?.name?.trim() ? row.actor.name : 'System'}</span>}
            trailing={<span className="text-xs text-[#98A2B3] dark:text-slate-500">{row.created_at ? formatDateTime(row.created_at) : '—'}</span>}
          />
        ))
      ) : (
        <div className="p-6">
          <EmptyState title={emptyTitle} description={emptyDescription} />
        </div>
      )}
    </DashboardList>
  );
}
