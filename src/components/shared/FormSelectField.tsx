import { forwardRef } from 'react';
import { FieldError, FieldHint, FieldLabel } from '@/components/shared/FieldLabel';

type Option = { label: string; value: string; subText?: string };

export const FormSelectField = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string; helperText?: string; options?: Option[]; placeholder?: string; requiredIndicator?: boolean; }>(function FormSelectField({ label, error, helperText, className, children, options, placeholder, requiredIndicator, ...props }, ref) {
  return (
    <label className="block space-y-2">
      <FieldLabel required={requiredIndicator ?? props.required}>{label}</FieldLabel>
      <select ref={ref} className={`h-12 w-full rounded-md border border-[#222222] bg-white dark:bg-slate-950 px-4 text-[15px] outline-none transition focus:border-[#9B2C24] focus:ring-2 focus:ring-[#9B2C24]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 ${className ?? ''}`} {...props}>
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options ? options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>) : children}
      </select>
      <FieldError message={error} />
      {!error ? <FieldHint>{helperText}</FieldHint> : null}
    </label>
  );
});
