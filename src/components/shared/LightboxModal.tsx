import { Modal } from '@/components/shared/Modal';
import { Button } from '@/components/ui/button';

function isImageUrl(url: string) {
  return /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(url);
}

export function LightboxModal({
  open,
  onClose,
  title,
  url,
  fileName,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  url: string | null;
  fileName?: string | null;
}) {
  return (
    <Modal open={open && Boolean(url)} onClose={onClose} title={title} subtitle={fileName ?? undefined} size="xl">
      {url ? (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-[#EAECF0] bg-[#F8FAFC] dark:border-slate-800 dark:bg-slate-900">
            {isImageUrl(url) ? (
              <img src={url} alt={fileName ?? title} className="mx-auto max-h-[72vh] w-auto max-w-full object-contain" />
            ) : (
              <iframe src={url} title={fileName ?? title} className="h-[72vh] w-full bg-white" />
            )}
          </div>
          <div className="flex justify-end">
            <Button asChild variant="outline">
              <a href={url} target="_blank" rel="noreferrer">Open in new tab</a>
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
