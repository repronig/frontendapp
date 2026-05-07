import { useQuery } from '@tanstack/react-query';
import type { PaginatedResponse } from '@/types/api';

export function usePaginatedList<T, P extends object>({
  queryKey,
  queryFn,
  params,
  enabled = true,
}: {
  queryKey: readonly unknown[];
  queryFn: (params: P) => Promise<PaginatedResponse<T>>;
  params: P;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: [...queryKey, params],
    queryFn: () => queryFn(params),
    enabled,
    placeholderData: (previousData) => previousData,
  });
}
