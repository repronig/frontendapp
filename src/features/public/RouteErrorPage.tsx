import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom';
import { getApiErrorMessage } from '@/api/error';

export function RouteErrorPage() {
  const error = useRouteError();

  const title = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : 'Request could not be completed';

  const message = isRouteErrorResponse(error)
    ? error.data?.message || 'The requested route could not be completed.'
    : getApiErrorMessage(error, 'An unexpected routing error occurred.');

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-medium uppercase tracking-wide text-slate-500">REPRONIG</p>
      <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-50">{title}</h1>
      <p className="mt-3 text-sm text-slate-600">{message}</p>
      <Link
        to="/"
        className="mt-6 inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
      >
        Back to app
      </Link>
    </div>
  );
}
