import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

interface Options {
  defaultTab?: string;
}

export function useListUrlState(options: Options = {}) {
  const [searchParams, setSearchParams] = useSearchParams();

  const values = useMemo(() => ({
    tab: searchParams.get('tab') ?? options.defaultTab ?? '',
    page: Number(searchParams.get('page') ?? '1') || 1,
    search: searchParams.get('search') ?? '',
    status: searchParams.get('status') ?? '',
    dateFrom: searchParams.get('date_from') ?? '',
    dateTo: searchParams.get('date_to') ?? '',
  }), [options.defaultTab, searchParams]);

  function update(next: Partial<typeof values>, resetPage = false) {
    const params = new URLSearchParams(searchParams);
    const merged = { ...values, ...next };
    const finalValues = { ...merged, page: resetPage ? 1 : merged.page };

    Object.entries({
      tab: finalValues.tab,
      page: finalValues.page > 1 ? String(finalValues.page) : '',
      search: finalValues.search,
      status: finalValues.status,
      date_from: finalValues.dateFrom,
      date_to: finalValues.dateTo,
    }).forEach(([key, value]) => {
      if (!value) params.delete(key);
      else params.set(key, String(value));
    });

    setSearchParams(params, { replace: true });
  }

  return {
    ...values,
    setTab: (tab: string) => update({ tab, page: 1 }),
    setPage: (page: number) => update({ page }),
    setSearch: (search: string) => update({ search }, true),
    setStatus: (status: string) => update({ status }, true),
    setDateFrom: (dateFrom: string) => update({ dateFrom }, true),
    setDateTo: (dateTo: string) => update({ dateTo }, true),
    resetFilters: () => update({ search: '', status: '', dateFrom: '', dateTo: '', page: 1 }),
  };
}
