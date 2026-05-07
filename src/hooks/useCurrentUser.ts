import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCurrentUser } from '@/features/auth/api';
import { queryKeys } from '@/lib/queryKeys';
import { useAuthStore } from '@/store/auth.store';

/**
 * Fetches `/me` via TanStack Query (server source of truth, cache, refetch).
 * When fresh data arrives, it is copied into the persisted auth store so
 * {@link useAuthStore} `currentUser` stays available for guards, axios-free
 * layout, and hydration before the next query run.
 */
export function useCurrentUser(enabled = true) {
  const token = useAuthStore((state) => state.token);
  const setCurrentUser = useAuthStore((state) => state.setCurrentUser);

  const query = useQuery({
    queryKey: queryKeys.currentUser,
    queryFn: async () => {
      const response = await getCurrentUser();
      return response.data;
    },
    enabled: enabled && Boolean(token),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (query.data) {
      setCurrentUser(query.data);
    }
  }, [query.data, setCurrentUser]);

  return query;
}
