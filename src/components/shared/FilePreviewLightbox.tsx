import { Download, ExternalLink } from 'lucide-react';
import { Modal } from '@/components/shared/Modal';
import { Button } from '@/components/ui/button';
import { resolveFileUrl } from '@/utils/fileUrl';

function isImage(url: string) {
  return /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(url);
}

export function FilePreviewLightbox({ open, onClose, url, title, downloadUrl }: { open: boolean; onClose: () => void; url?: string | null; title: string; downloadUrl?: string | null }) {
  const resolvedUrl = resolveFileUrl(url);
  const resolvedDownloadUrl = resolveFileUrl(downloadUrl);

  return (
    <Modal open={open} onClose={onClose} title={title} subtitle="Preview loaded from the backend-provided file URL." size="lg">
      {resolvedUrl ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={resolvedUrl ?? undefined} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Open in new tab</a>
            </Button>
            {resolvedDownloadUrl ? <Button asChild variant="outline" size="sm"><a href={resolvedDownloadUrl ?? undefined} target="_blank" rel="noreferrer"><Download className="mr-2 h-4 w-4" />Download</a></Button> : null}
          </div>
          <div className="overflow-hidden rounded-2xl border border-[#EAECF0] dark:border-slate-800 bg-[#F8FAFC]">
            {isImage(resolvedUrl) ? (
              <img src={resolvedUrl ?? undefined} alt={title} className="max-h-[72vh] w-full object-contain" />
            ) : (
              <iframe src={resolvedUrl ?? undefined} title={title} className="h-[72vh] w-full bg-white dark:bg-slate-950" />
            )}
          </div>
        </div>
      ) : (
        <p className="text-sm text-[#667085] dark:text-slate-300">No preview URL is available for this file.</p>
      )}
    </Modal>
  );
}
