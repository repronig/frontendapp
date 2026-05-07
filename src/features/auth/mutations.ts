/**
 * Canonical mutation feedback for auth-adjacent flows (toast + normalized API errors).
 * Keep feature-specific `invalidateQueries` next to each `useMutation` that needs it.
 */
export { onMutationApiError, toastApiError } from '@/lib/mutationFeedback';
