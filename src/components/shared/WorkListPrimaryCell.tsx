import { useState } from 'react';
import { ImageIcon } from 'lucide-react';
import type { WorkResource } from '@/types/domain';
import { resolveFileUrl } from '@/utils/fileUrl';
import { formatDisplayLabel } from '@/utils/display';

function getCoverImageUrl(work: WorkResource) {
  const cover = (work.files ?? []).find((file) => file.file_type === 'cover_image');
  return resolveFileUrl(cover?.file_url ?? cover?.download_url ?? null);
}

export function WorkListPrimaryCell({
  work,
  onClick,
  onCoverClick,
}: {
  work: WorkResource;
  onClick?: () => void;
  onCoverClick?: (url: string) => void;
}) {
  const coverUrl = getCoverImageUrl(work);
  const [imageFailed, setImageFailed] = useState(false);
  const titleBlock = (
    <div className="flex min-w-0 items-start gap-4">
      <button
        type="button"
        className="flex h-[82px] w-[64px] shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#E4E7EC] bg-[#F8F2E8]"
        onClick={(event) => {
          if (!coverUrl || !onCoverClick) return;
          event.stopPropagation();
          onCoverClick(coverUrl);
        }}
        aria-label={coverUrl ? `Preview cover for ${work.title}` : undefined}
      >
        {coverUrl && !imageFailed ? (
          <img src={coverUrl} alt={work.title} className="h-full w-full object-cover" onError={() => setImageFailed(true)} />
        ) : (
          <ImageIcon className="h-6 w-6 text-[#7A1F1A]/70" />
        )}
      </button>
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="truncate text-base font-semibold leading-6 text-slate-900 dark:text-slate-50 dark:text-slate-50">{work.title}</p>
        <p className="truncate text-sm leading-5 text-slate-600 dark:text-slate-300">{work.subtitle || 'No subtitle provided'}</p>
        <p className="text-sm leading-5 text-slate-500 dark:text-slate-400">{work.type_of_work_label ?? formatDisplayLabel(work.type_of_work)}</p>
        <p className="break-words text-sm font-medium leading-5 text-slate-700 dark:text-slate-300 dark:text-slate-200">
          {work.reference_number ?? work.identifier_value ?? 'Reference pending'}
        </p>
      </div>
    </div>
  );

  if (!onClick) return titleBlock;

  return (
    <div role="button" tabIndex={0} className="w-full text-left" onClick={onClick} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onClick(); }}>
      {titleBlock}
    </div>
  );
}
