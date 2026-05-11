import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { FieldError, FieldHint, FieldLabel } from '@/components/shared/FieldLabel';

export const FormField = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; helperText?: string; requiredIndicator?: boolean; }>(function FormField({ label, error, helperText, className, requiredIndicator, children: _omitChildren, ...props }, ref) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isPasswordField = props.type === 'password';
  const resolvedType = isPasswordField ? (passwordVisible ? 'text' : 'password') : props.type;

  return (
    <label className="block space-y-2">
      <FieldLabel required={requiredIndicator ?? props.required}>{label}</FieldLabel>
      <div className="relative">
        <Input
          ref={ref}
          className={isPasswordField ? `${className ?? ''} pr-12` : className}
          {...props}
          type={resolvedType}
        />
        {isPasswordField ? (
          <button
            type="button"
            aria-label={passwordVisible ? 'Hide password' : 'Show password'}
            onClick={() => setPasswordVisible((current) => !current)}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            {passwordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        ) : null}
      </div>
      <FieldError message={error} />
      {!error ? <FieldHint>{helperText}</FieldHint> : null}
    </label>
  );
});
