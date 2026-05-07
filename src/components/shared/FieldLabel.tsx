import type { ReactNode } from 'react';

export function RequiredMark() {
  return <span className="ml-1 text-red-600 dark:text-red-400">*</span>;
}

export function FieldLabel({ children, required = false }: { children: ReactNode; required?: boolean }) {
  return (
    <span className="text-[15px] font-semibold text-[#2B2B2D] dark:text-slate-100">
      {children}{required ? <RequiredMark /> : null}
    </span>
  );
}

export function FieldError({ message }: { message?: string }) {
  return message ? <span className="text-sm text-[#B42318] dark:text-rose-300">{message}</span> : null;
}

export function FieldHint({ children }: { children?: ReactNode }) {
  return children ? <span className="text-sm text-[#6B788E] dark:text-slate-300">{children}</span> : null;
}
