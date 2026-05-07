import { Upload } from 'lucide-react';
import { FieldError, FieldHint, FieldLabel } from '@/components/shared/FieldLabel';

type FileUploadFieldProps = {
  label: string;
  file?: File | null;
  accept?: string;
  required?: boolean;
  disabled?: boolean;
  helperText?: string;
  error?: string;
  placeholder?: string;
  onFileChange: (file: File | null) => void;
};

export function FileUploadField({
  label,
  file,
  accept,
  required = false,
  disabled = false,
  helperText,
  error,
  placeholder = 'Choose file',
  onFileChange,
}: FileUploadFieldProps) {
  return (
    <label className="block space-y-2">
      <FieldLabel required={required}>{label}</FieldLabel>
      <span className="flex min-h-12 cursor-pointer items-center gap-3 rounded-md border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
        <Upload className="h-4 w-4 shrink-0" />
        <span className="truncate">{file?.name ?? placeholder}</span>
        <input
          type="file"
          accept={accept}
          disabled={disabled}
          className="sr-only"
          onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
        />
      </span>
      <FieldError message={error} />
      {!error ? <FieldHint>{helperText}</FieldHint> : null}
    </label>
  );
}
