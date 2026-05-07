/**
 * Allowed `per_page` values for list APIs (see `BaseApiController::perPage` in `api.repronig`).
 * Module tables pass these through {@link PaginationBar}; keep in sync with the backend allowlist.
 */
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number];

export const DEFAULT_PAGE_SIZE: PageSizeOption = 10;

export function normalizeClientPageSize(value: number): PageSizeOption {
  if (PAGE_SIZE_OPTIONS.includes(value as PageSizeOption)) {
    return value as PageSizeOption;
  }

  return DEFAULT_PAGE_SIZE;
}
