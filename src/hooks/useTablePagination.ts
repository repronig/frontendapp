import { useCallback, useState } from 'react';
import { DEFAULT_PAGE_SIZE, normalizeClientPageSize, type PageSizeOption } from '@/constants/pagination';

/** Page index + `per_page` for list UIs; changing page size resets to page 1 (matches backend pagination contract). */
export function useTablePagination(initialPerPage: PageSizeOption = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const [perPage, setPerPageOnly] = useState<PageSizeOption>(initialPerPage);

  const setPerPage = useCallback((next: number) => {
    setPerPageOnly(normalizeClientPageSize(next));
    setPage(1);
  }, []);

  return { page, setPage, perPage, setPerPage };
}
