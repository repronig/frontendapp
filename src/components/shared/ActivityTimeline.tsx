import { Alert } from '@/components/ui/alert';
import type { TimelineEventResource } from '@/types/domain';
import { formatDateTime, humanizeLabel } from '@/utils/format';


function timelineTitle(item: TimelineEventResource) {
  return humanizeLabel(item.label || item.action || item.type);
}

function timelineMeta(item: TimelineEventResource) {
  const actorName = item.actor?.name?.trim() || 'System';
  return `By ${actorName} • ${formatDateTime(item.timestamp ?? item.created_at)}`;
}

function dotTone(type?: string | null) {
  switch (type) {
    case 'status_change':
      return 'bg-[#175CD3]';
    case 'payment':
      return 'bg-[#117A46]';
    case 'document':
      return 'bg-[#B76E00]';
    case 'profile':
      return 'bg-[#7A5AF8]';
    default:
      return 'bg-[#6A1025]';
  }
}

export function ActivityTimeline({ items, isLoading, emptyTitle = 'No activity yet' }: { items?: TimelineEventResource[]; isLoading?: boolean; emptyTitle?: string; }) {
  if (isLoading) return <Alert title="Loading timeline" description="Recent timeline activity is being fetched for this record." />;
  if (!items?.length) return <Alert title={emptyTitle} description="Timeline entries will appear here after review, status, and operational actions are recorded." />;

  return (
    <div className="rounded-2xl border border-[#EAECF0] bg-white dark:bg-slate-950 p-5 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-sm font-semibold text-[#344054] dark:text-slate-200 dark:text-slate-200">Activity timeline</p>
      <div className="mt-4 space-y-4">
        {items.map((item) => (
          <div key={item.id} className="flex gap-3">
            <div className={`mt-1 h-2.5 w-2.5 rounded-full ${dotTone(item.type)}`} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#101828] dark:text-slate-100">{timelineTitle(item)}</p>
              {item.description ? <p className="mt-1 text-sm text-[#475467] dark:text-slate-300 dark:text-slate-300">{item.description}</p> : null}
              <p className="mt-1 text-sm text-[#667085] dark:text-slate-300 dark:text-slate-400">{timelineMeta(item)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
