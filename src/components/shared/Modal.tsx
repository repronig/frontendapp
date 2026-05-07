import { PropsWithChildren, useEffect, useId, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';

const sizeClasses: Record<'sm' | 'md' | 'lg' | 'xl' | '2xl', string> = {
  sm: 'max-w-lg',
  md: 'max-w-3xl',
  lg: 'max-w-5xl',
  xl: 'max-w-6xl',
  '2xl': 'max-w-7xl',
};

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  size = 'lg',
  children,
}: PropsWithChildren<{
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}>) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!open) return;
    scrollAreaRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [open, title]);

  if (!open) return null;

  const sizeClass = sizeClasses[size] ?? sizeClasses.lg;

  // Portal to body so `fixed` is not clipped or re-rooted by ancestors (e.g. `backdrop-blur` on auth cards).
  // No `margin: auto` on the dialog: in a column flex scroller it vertically centers and hides the header.
  const modal = (
    <div className="fixed inset-0 z-[100] overflow-hidden" role="presentation">
      <button
        type="button"
        className="glass-overlay absolute inset-0 z-0 cursor-default border-0 p-0"
        onClick={onClose}
        aria-label="Close modal"
      />
      <div
        ref={scrollAreaRef}
        className="pointer-events-none absolute inset-0 z-10 flex min-h-full items-start justify-center overflow-y-auto overscroll-contain px-4 pb-10 pt-6 sm:px-6 sm:pb-12 sm:pt-8"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className={cn(
            'pointer-events-auto relative mt-0 flex max-h-[min(85dvh,calc(100dvh-3rem))] w-full flex-col overflow-hidden rounded-md bg-white enterprise-shadow dark:border dark:border-slate-800 dark:bg-slate-950 sm:max-h-[min(88dvh,calc(100dvh-4rem))]',
            sizeClass,
          )}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-5 top-5 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-[#EAECF0] bg-white text-[#667085] hover:text-[#2B2B2D] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="shrink-0 border-b border-[#EAECF0] px-5 py-5 sm:px-8 sm:py-6 dark:border-slate-800">
            <h3
              id={titleId}
              className="pr-12 text-[18px] font-semibold tracking-tight text-[#2B2B2D] dark:text-slate-100 md:text-[20px]"
            >
              {title}
            </h3>
            {subtitle ? (
              <p className="mt-2 max-w-3xl text-[15px] text-[#6B788E] dark:text-slate-400">{subtitle}</p>
            ) : null}
          </div>
          <div className="min-h-0 flex flex-1 flex-col overflow-y-auto overscroll-contain px-5 py-5 sm:px-8 sm:py-7 scrollbar-thin">
            {children}
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null;
}
