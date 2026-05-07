import { type ClipboardEvent, type KeyboardEvent, useEffect, useRef } from 'react';
import { cn } from '@/utils/cn';

/** Large masked dot (password bullets do not scale with font-size). */
const PIN_MASK_GLYPH = '\u25CF';

export type PinInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helperText?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  length?: number;
  /** When set, label and digit row are centered (e.g. security modals). */
  align?: 'start' | 'center';
  /** Larger, heavier digit glyphs without changing box dimensions. */
  emphasizeDigits?: boolean;
};

export function PinInput({
  label,
  value,
  onChange,
  helperText,
  autoFocus,
  disabled,
  length = 6,
  align = 'start',
  emphasizeDigits = false,
}: PinInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length }, (_, index) => value[index] ?? '');

  useEffect(() => {
    if (autoFocus && !disabled) {
      inputRefs.current[0]?.focus();
    }
  }, [autoFocus, disabled]);

  function commit(nextDigits: string[]) {
    onChange(nextDigits.join('').replace(/\D/g, '').slice(0, length));
  }

  function updateDigit(index: number, nextDigit: string) {
    const nextDigits = [...digits];
    nextDigits[index] = nextDigit;
    commit(nextDigits);
  }

  function handleChange(index: number, rawValue: string) {
    const numericValue = rawValue.replace(/\D/g, '');

    if (!numericValue) {
      updateDigit(index, '');
      return;
    }

    if (numericValue.length > 1) {
      const nextDigits = [...digits];
      numericValue.slice(0, length - index).split('').forEach((digit, offset) => {
        nextDigits[index + offset] = digit;
      });
      commit(nextDigits);
      inputRefs.current[Math.min(index + numericValue.length, length - 1)]?.focus();
      return;
    }

    updateDigit(index, numericValue);
    inputRefs.current[Math.min(index + 1, length - 1)]?.focus();
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (emphasizeDigits && event.key >= '0' && event.key <= '9') {
      event.preventDefault();
      updateDigit(index, event.key);
      inputRefs.current[Math.min(index + 1, length - 1)]?.focus();
      return;
    }

    if (event.key === 'Backspace' && digits[index]) {
      event.preventDefault();
      updateDigit(index, '');
      return;
    }

    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      event.preventDefault();
      updateDigit(index - 1, '');
      inputRefs.current[index - 1]?.focus();
      return;
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      inputRefs.current[index - 1]?.focus();
      return;
    }

    if (event.key === 'ArrowRight' && index < length - 1) {
      event.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handlePaste(index: number, event: ClipboardEvent<HTMLInputElement>) {
    const pastedValue = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, length - index);

    if (!pastedValue) {
      return;
    }

    event.preventDefault();
    const nextDigits = [...digits];
    pastedValue.split('').forEach((digit, offset) => {
      nextDigits[index + offset] = digit;
    });
    commit(nextDigits);
    inputRefs.current[Math.min(index + pastedValue.length, length - 1)]?.focus();
  }

  const centered = align === 'center';

  return (
    <div className={cn('space-y-2', centered && 'flex flex-col items-center')}>
      <label
        className={cn(
          'block text-sm font-medium text-[#344054] dark:text-slate-200',
          centered && 'w-full text-center',
        )}
      >
        {label}
      </label>
      <div className={cn('flex items-center gap-2', emphasizeDigits && 'gap-2.5 sm:gap-3', centered && 'justify-center')} aria-label={label}>
        {digits.map((digit, index) => {
          const displayValue = emphasizeDigits ? (digit ? PIN_MASK_GLYPH : '') : digit;
          return (
            <input
              key={index}
              ref={(element) => {
                inputRefs.current[index] = element;
              }}
              type={emphasizeDigits ? 'text' : 'password'}
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              spellCheck={false}
              autoCorrect="off"
              maxLength={1}
              value={displayValue}
              disabled={disabled}
              onChange={(event) => handleChange(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(index, event)}
              onPaste={(event) => handlePaste(index, event)}
              onFocus={emphasizeDigits ? (event) => event.currentTarget.select() : undefined}
              className={cn(
                'h-12 w-10 rounded-xl border border-[#D0D5DD] bg-white text-center text-lg font-semibold text-[#101828] shadow-sm outline-none transition focus:border-[#7A1C1C] focus:ring-2 focus:ring-[#7A1C1C]/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:disabled:bg-slate-900 sm:h-14 sm:w-12',
                emphasizeDigits &&
                  'h-14 w-[3.25rem] text-[42px] font-black leading-none tracking-normal text-[#0f172a] antialiased sm:h-[4.25rem] sm:w-16 sm:text-[52px] dark:text-slate-100',
              )}
              aria-label={`${label} digit ${index + 1}`}
            />
          );
        })}
      </div>
      {helperText ? (
        <p className={cn('text-xs text-[#64748B] dark:text-slate-400', centered && 'max-w-sm text-center')}>{helperText}</p>
      ) : null}
    </div>
  );
}
