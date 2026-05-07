import { toast } from 'sonner';
import { normalizeApiError } from '@/api/error';

const GENERIC_ERROR_MESSAGES = new Set([
  'the given data was invalid.',
  'request failed.',
  'an unexpected error occurred.',
]);

function isSecurityCancellationMessage(message: string) {
  return message.trim().toLowerCase() === 'security confirmation cancelled.';
}

export function showAdminActionSuccess(message: string, responseMessage?: string | null) {
  toast.success(responseMessage?.trim() || message);
}

export function getAdminFieldError(error: unknown, fieldNames: string[]) {
  const errors = normalizeApiError(error).errors;

  for (const fieldName of fieldNames) {
    const message = errors?.[fieldName]?.find((entry) => entry?.trim());
    if (message) return message.trim();
  }

  return undefined;
}

export function showAdminActionError(error: unknown, fallbackMessage: string) {
  const message = normalizeApiError(error).message?.trim();

  if (isSecurityCancellationMessage(message)) {
    toast.info('Protected action was cancelled. No changes were made.');
    return;
  }

  if (!message || GENERIC_ERROR_MESSAGES.has(message.toLowerCase())) {
    toast.error(fallbackMessage);
    return;
  }

  toast.error(message);
}

export function showAdminExportSuccess(subject: string) {
  toast.success(`${subject} CSV downloaded successfully.`);
}

export function showAdminExportError(subject: string) {
  toast.error(`${subject} CSV could not be downloaded. Try again.`);
}
