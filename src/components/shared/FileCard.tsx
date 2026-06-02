import { useState } from 'react';
import { Download, ExternalLink, FileText, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FilePreviewLightbox } from '@/components/shared/FilePreviewLightbox';
import { resolveFileUrl } from '@/utils/fileUrl';

export function FileCard({
  title,
  subtitle,
  fileUrl,
  downloadUrl,
  viewOnly = false,
  onDelete,
  onPreview,
  deleting = false,
}: {
  title: string;
  subtitle?: string;
  fileUrl?: string | null;
  downloadUrl?: string | null;
  /** Hide download actions (e.g. association portal view-only documents). */
  viewOnly?: boolean;
  onDelete?: () => void;
  onPreview?: () => void;
  deleting?: boolean;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const resolvedFileUrl = resolveFileUrl(fileUrl);
  const resolvedDownloadUrl = viewOnly ? null : resolveFileUrl(downloadUrl);
  const previewHandler = onPreview ?? (resolvedFileUrl ? () => setPreviewOpen(true) : undefined);

  return (
    <>
      <Card className="flex flex-col gap-4 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:text-slate-300">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-slate-900 dark:text-slate-50">{title}</p>
            {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {resolvedFileUrl ? (
            previewHandler ? (
              <Button variant="outline" size="sm" onClick={previewHandler}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Preview
              </Button>
            ) : null
          ) : null}
          {resolvedDownloadUrl ? (
            <Button asChild variant="outline" size="sm">
              <a href={resolvedDownloadUrl ?? undefined} target="_blank" rel="noreferrer">
                <Download className="mr-2 h-4 w-4" />
                Download
              </a>
            </Button>
          ) : null}
          {onDelete ? (
            <Button variant="destructive" size="sm" onClick={onDelete} disabled={deleting}>
              <Trash2 className="mr-2 h-4 w-4" />
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          ) : null}
        </div>
      </Card>
      {!onPreview ? (
        <FilePreviewLightbox
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          url={resolvedFileUrl}
          downloadUrl={resolvedDownloadUrl}
          viewOnly={viewOnly}
          title={title}
        />
      ) : null}
    </>
  );
}
