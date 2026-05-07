import { toast } from 'sonner';

type SensitiveActionConfirmOptions = {
  title?: string;
  description?: string;
  confirmLabel?: string;
  pinLabel?: string;
  codeLabel?: string;
};

type Controller = (options?: SensitiveActionConfirmOptions) => Promise<boolean>;

let openSensitiveActionDialog: Controller | null = null;

export function registerAdminSensitiveActionDialog(controller: Controller | null) {
  openSensitiveActionDialog = controller;
}

export async function confirmAdminSensitiveAction(options?: SensitiveActionConfirmOptions) {
  if (!openSensitiveActionDialog) {
    toast.error('Security confirmation is not available right now. Reload the page and try again.');
    return false;
  }

  return openSensitiveActionDialog(options);
}

export type { SensitiveActionConfirmOptions };
