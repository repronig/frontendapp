import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormTextareaField } from '@/components/shared/FormTextareaField';
import { Modal } from '@/components/shared/Modal';
import { approvalActionButtonClass } from '@/components/shared/tableActionStyles';

export function ActionDialog({
  open,
  onClose,
  title,
  description,
  actionLabel,
  actionVariant = 'default',
  reasonLabel = 'Reason',
  requireReason = false,
  showReason = false,
  isSubmitting = false,
  initialReason = '',
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  actionLabel: string;
  actionVariant?: 'default' | 'outline' | 'destructive';
  reasonLabel?: string;
  requireReason?: boolean;
  showReason?: boolean;
  isSubmitting?: boolean;
  initialReason?: string;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState(initialReason);
  const destructive = actionVariant === 'destructive';
  const isApprovalAction = /approve/i.test(actionLabel);
  const actionDescription = useMemo(() => {
    if (!destructive) return null;
    return requireReason
      ? 'This action cannot be undone. Provide a clear internal reason before you continue.'
      : 'This action cannot be undone. Review the details carefully before you continue.';
  }, [destructive, requireReason]);

  useEffect(() => {
    if (open) setReason(initialReason);
  }, [initialReason, open]);

  return (
    <Modal open={open} onClose={onClose} title={title} subtitle={description} size="sm">
      <div className="space-y-5">
        {actionDescription ? (
          <div className="rounded-2xl border border-[#F7D4D2] bg-[#FFF6F5] px-4 py-3 text-sm text-[#B42318]">
            <p className="font-semibold text-[#912018]">Destructive action</p>
            <p className="mt-1">{actionDescription}</p>
          </div>
        ) : null}
        {showReason ? <FormTextareaField label={reasonLabel} value={reason} onChange={(event) => setReason(event.target.value)} rows={4} /> : null}
        <div className="flex flex-wrap justify-end gap-3 border-t border-[#EAECF0] dark:border-slate-800 pt-5">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button
            variant={actionVariant}
            className={isApprovalAction && actionVariant !== 'destructive' ? approvalActionButtonClass : undefined}
            onClick={() => onConfirm(reason)}
            disabled={isSubmitting || (requireReason && !reason.trim())}
          >
            {isSubmitting ? 'Saving…' : actionLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
