import { toast } from 'sonner';
import { normalizeApiError } from '@/api/error';

/** Sonner error toast backed by {@link normalizeApiError} (Axios, validation payload, generic errors). */
export function toastApiError(error: unknown, fallbackMessage?: string): void {
  toast.error(normalizeApiError(error, fallbackMessage).message);
}

/** Consistent success toast for mutations (same channel as {@link toastApiError}). */
export function toastActionSuccess(message: string): void {
  toast.success(message);
}

/** Default TanStack Query mutation `onError` that surfaces the same normalized message via Sonner. */
export function onMutationApiError(fallbackMessage?: string): (error: unknown) => void {
  return (error: unknown) => {
    toastApiError(error, fallbackMessage);
  };
}

/** When the server rejects an upload (size, type, validation), prefer this copy over a generic API line. */
export const FILE_UPLOAD_ERROR_FALLBACK =
  'Could not upload the file. Check the file size and type, then try again.';

/** Mutation `onError` for document / asset uploads. */
export function onMutationFileUploadError(): (error: unknown) => void {
  return onMutationApiError(FILE_UPLOAD_ERROR_FALLBACK);
}
