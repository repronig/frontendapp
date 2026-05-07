import type { FieldValues, Path, UseFormReturn } from 'react-hook-form';
import { getApiErrorMessage, normalizeApiError } from '@/api/error';

/** Maps Laravel-style `errors` bag keys onto react-hook-form fields; returns a message suitable for a toast. */
export function applyServerValidationErrorsToForm<T extends FieldValues>(form: UseFormReturn<T>, error: unknown): string {
  const apiError = normalizeApiError(error);

  Object.entries(apiError.errors ?? {}).forEach(([field, messages]) => {
    const message = Array.isArray(messages) ? messages[0] : typeof messages === 'string' ? messages : undefined;
    if (typeof message === 'string' && message.trim()) {
      form.setError(field as Path<T>, { type: 'server', message: message.trim() });
    }
  });

  return getApiErrorMessage(error);
}
