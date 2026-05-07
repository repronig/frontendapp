import { forwardRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { FieldError, FieldHint, FieldLabel } from '@/components/shared/FieldLabel';

export const FormTextareaField = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string; helperText?: string; requiredIndicator?: boolean; }>(function FormTextareaField({ label, error, helperText, className, requiredIndicator, ...props }, ref) {
  return (
    <label className="block space-y-2">
      <FieldLabel required={requiredIndicator ?? props.required}>{label}</FieldLabel>
      <Textarea ref={ref} className={className} {...props} />
      <FieldError message={error} />
      {!error ? <FieldHint>{helperText}</FieldHint> : null}
    </label>
  );
});
