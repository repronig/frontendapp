# Web UX consistency (REPRONIG `app.repronig`)

Lightweight rules so feedback, retries, and refresh behave the same across portals. This is not a visual redesign—reuse existing components and tokens.

## Toasts (Sonner)

- **API / mutation errors:** use `toastApiError` or `onMutationApiError(fallback?)` from `@/lib/mutationFeedback` so messages match `normalizeApiError` (validation fields, Laravel payloads, Axios).
- **Mutation success:** prefer `toastActionSuccess(message)` so success and error both go through the same module (tuning duration/copy later stays centralized).
- **File uploads:** use `onMutationFileUploadError()` for upload mutations so users get `FILE_UPLOAD_ERROR_FALLBACK` when the API message is generic.
- Global **`<Toaster />`** styling lives in `AppProviders.tsx`—do not mount a second toaster.

## Query error + retry

- **Dashboard-style full sections:** use `DashboardError` from `@/features/dashboard/DashboardState` with `message`, optional `onRetry={() => void query.refetch()}`, and `isRetrying={query.isFetching && !query.isLoading}`.
- **Tight layouts (dropdown, modal body, gate):** use `QueryRetryBanner` from `@/components/shared/QueryRetryBanner` with the same retry semantics.
- **Retry label:** default **Try again** on `DashboardError`; payment checkout uses **Retry** where already established.

## Refresh (pull-to-refresh analogue)

- Web lists rarely use OS pull-to-refresh. Prefer an explicit **Refresh** control that refetches active queries:
  - `QueryRefreshButton` from `@/components/shared/QueryRefreshButton` — calls the `onRefresh` you pass (typically `refetch()` or `invalidateQueries` for the page’s keys).
- After mutations that change list data, keep **invalidating** the relevant `queryKeys` (existing pattern).

## File uploads

- Field-level validation: keep **react-hook-form + Zod** on the form; show field errors via existing `FormField` / `FileUploadField`.
- Server rejection after submit: **`onMutationFileUploadError()`** on the upload mutation in addition to, or instead of, generic `onMutationApiError()` for clearer copy.

## When to add new shared UI

- If you copy the same “red box + paragraph + button” more than once, switch to `DashboardError` or `QueryRetryBanner` instead of ad-hoc markup.

## Mobile (`mobile.repronig`)

Flutter mirrors these rules in [`mobile.repronig/docs/UX_CONSISTENCY.md`](../../mobile.repronig/docs/UX_CONSISTENCY.md) (SnackBars, retry, refresh). This file remains the **contract** both apps converge toward.
