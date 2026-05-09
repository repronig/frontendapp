import { env } from '@/utils/env';

function getApiOrigin() {
  try {
    return new URL(env.apiBaseUrl).origin;
  } catch {
    return window.location.origin;
  }
}

/** Strip "/storage/" when the real object key is "documents/..." (S3, CloudFront, etc.). */
function stripErroneousRemoteStoragePrefix(pathname: string) {
  return pathname.replace(
    /^\/storage\/(documents|user_avatars|work-files|works|member-application-documents|institution-documents)\//i,
    '/$1/',
  );
}

function normalizeStoragePath(pathname: string, options?: { prependLocalStorage?: boolean }) {
  const prependLocalStorage = options?.prependLocalStorage ?? true;
  let path = pathname.trim();
  if (!path) return path;
  path = path.startsWith('/') ? path : `/${path}`;

  path = path.replace(/^\/api\/v\d+\/storage\//i, '/storage/');
  path = path.replace(/^\/api\/storage\//i, '/storage/');
  path = path.replace(/^\/medium\/storage\//i, '/storage/');

  if (!path.startsWith('/storage/') && prependLocalStorage) {
    const bareStorageFolders = ['user_avatars', 'work-files', 'documents', 'member-application-documents', 'institution-documents'];
    if (bareStorageFolders.some((folder) => path === `/${folder}` || path.startsWith(`/${folder}/`))) {
      path = `/storage${path}`;
    }
  }

  return path.replace(/\/+/g, '/');
}

export function resolveFileUrl(input?: string | null) {
  if (!input) return null;
  const value = input.trim();
  if (!value) return null;

  if (/^(data:|blob:)/i.test(value)) {
    return value;
  }

  const apiOrigin = getApiOrigin();

  if (/^https?:\/\//i.test(value)) {
    try {
      const parsed = new URL(value);
      const api = new URL(apiOrigin);
      if (['localhost', '127.0.0.1', '0.0.0.0'].includes(parsed.hostname)) {
        parsed.protocol = window.location.protocol;
        parsed.host = api.host;
      }
      const isApiHost = parsed.hostname === api.hostname;
      let pathname = parsed.pathname;
      if (!isApiHost) {
        pathname = stripErroneousRemoteStoragePrefix(pathname);
      }
      parsed.pathname = normalizeStoragePath(pathname, { prependLocalStorage: isApiHost });
      return parsed.toString();
    } catch {
      return value;
    }
  }

  const normalizedPath = normalizeStoragePath(value);
  return `${apiOrigin}${normalizedPath}`.replace(/([^:]\/)\/+/g, '$1');
}
