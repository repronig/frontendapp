import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-medium uppercase tracking-wide text-slate-500">404</p>
      <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-50">Page not found</h1>
      <p className="mt-3 text-sm text-slate-600">
        The page you requested does not exist or may have moved.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
      >
        Go to home
      </Link>
    </div>
  );
}
