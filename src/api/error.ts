import axios from 'axios';
import type { ApiError } from '@/types/api';

type ApiErrorBag = Record<string, string[] | string | undefined | null>;

const GENERIC_API_MESSAGES = new Set([
  'the given data was invalid.',
  'request failed.',
  'server error',
  'something went wrong',
  'an unexpected error occurred.',
]);

function firstValidationError(errors?: ApiErrorBag | null): string | undefined {
  if (!errors) return undefined;

  for (const value of Object.values(errors)) {
    if (Array.isArray(value)) {
      const message = value.find((entry) => typeof entry === 'string' && entry.trim());
      if (message) return message.trim();
      continue;
    }

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function cleanMessage(message?: string | null): string | undefined {
  const trimmed = message?.trim();
  return trimmed || undefined;
}

function isGenericApiMessage(message?: string | null) {
  const normalized = cleanMessage(message)?.toLowerCase();
  return normalized ? GENERIC_API_MESSAGES.has(normalized) : false;
}

function apiErrorFromJsonPayload(
  data: unknown,
  status: number | undefined,
  fallbackMessage: string,
  axiosMessage?: string | null,
): ApiError {
  const payload = data && typeof data === 'object' ? (data as Partial<ApiError>) : {};
  const errors = payload.errors as ApiError['errors'] | undefined;
  const responseMessage = cleanMessage(typeof payload.message === 'string' ? payload.message : null);
  const validationMessage = firstValidationError(errors as ApiErrorBag | undefined);
  const fallback = cleanMessage(fallbackMessage) || 'An unexpected error occurred.';

  const message = responseMessage && !isGenericApiMessage(responseMessage)
    ? responseMessage
    : validationMessage || fallback || cleanMessage(axiosMessage) || 'An unexpected error occurred.';

  return {
    message,
    errors,
    status,
  };
}

export function normalizeApiError(error: unknown, fallbackMessage = 'An unexpected error occurred.'): ApiError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data;

    if (data instanceof Blob) {
      const fallback = cleanMessage(fallbackMessage) || 'An unexpected error occurred.';
      return {
        message: cleanMessage(error.message) || fallback,
        status,
      };
    }

    return apiErrorFromJsonPayload(data, status, fallbackMessage, error.message);
  }

  if (error instanceof Error) {
    return { message: cleanMessage(error.message) || fallbackMessage };
  }

  return { message: fallbackMessage };
}

/**
 * Like {@link normalizeApiError}, but when the server returned JSON inside a Blob (typical for
 * `responseType: 'blob'` requests such as PDF downloads), reads the blob and parses validation /
 * forbidden messages.
 */
export async function normalizeApiErrorAsync(error: unknown, fallbackMessage = 'An unexpected error occurred.'): Promise<ApiError> {
  if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
    const blob = error.response.data as Blob;
    const status = error.response.status;

    if (blob.size > 0) {
      try {
        const text = await blob.text();
        const trimmed = text.trim();
        if (trimmed.startsWith('{')) {
          const parsed = JSON.parse(trimmed) as unknown;
          return apiErrorFromJsonPayload(parsed, status, fallbackMessage, error.message);
        }
      } catch {
        // fall through to generic blob handling
      }
    }

    const fallback = cleanMessage(fallbackMessage) || 'An unexpected error occurred.';
    return {
      message: cleanMessage(error.message) || fallback,
      status,
    };
  }

  return normalizeApiError(error, fallbackMessage);
}

export async function getApiErrorMessageAsync(error: unknown, fallbackMessage = 'An unexpected error occurred.') {
  return (await normalizeApiErrorAsync(error, fallbackMessage)).message;
}

export function getFirstValidationErrorMessage(error: unknown): string | undefined {
  return firstValidationError(normalizeApiError(error).errors as ApiErrorBag | undefined);
}

export function getApiErrorMessage(error: unknown, fallbackMessage = 'An unexpected error occurred.') {
  return normalizeApiError(error, fallbackMessage).message;
}
