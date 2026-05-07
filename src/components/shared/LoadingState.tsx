export function LoadingState({ label = 'Loading data', hint }: { label?: string; hint?: string }) {
  return (
    <div className="flex min-h-[40vh] w-full items-center justify-center px-4 py-10">
      <div className="flex max-w-xl items-center gap-4 rounded-3xl border border-[#D6E6FF] bg-[linear-gradient(180deg,#F8FBFF_0%,#F4F8FF_100%)] px-5 py-4 text-left shadow-sm dark:border-slate-800 dark:bg-none dark:bg-slate-900">
        <img src="/assets/loading-spinner.gif" alt="Loading" className="h-10 w-10 rounded-full" />
        <div>
          <p className="text-base font-semibold text-[#1E3A8A] dark:text-sky-200">{label}…</p>
          <p className="mt-1 text-sm text-[#3B82F6] dark:text-sky-300">{hint ?? 'Please wait…preparing selected resource.'}</p>
        </div>
      </div>
    </div>
  );
}
