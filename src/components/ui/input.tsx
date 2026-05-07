import * as React from 'react';
import { cn } from '@/utils/cn';

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        'flex h-12 w-full rounded-md border border-[#222222] bg-white dark:bg-slate-950 px-4 py-3 text-base text-[#1E2024] dark:text-slate-100 outline-none transition placeholder:text-[#94A0B4] hover:border-[#444] focus:border-[#AF1512] focus:ring-2 focus:ring-[rgba(175,21,18,0.12)] disabled:cursor-not-allowed disabled:bg-[#F8F9FB] disabled:text-[#9AA3B2] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-500',
        className,
      )}
      {...props}
    />
  );
});
Input.displayName = 'Input';

export { Input };
