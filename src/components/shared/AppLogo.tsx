import { cn } from '@/utils/cn';

export function AppLogo({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'sm' ? 'h-10' : size === 'lg' ? 'h-16 md:h-[4.5rem]' : 'h-12 md:h-14';

  return (
    <img
      src="/assets/repronig-logo.png"
      alt="REPRONIG"
      className={cn('block w-auto max-w-full object-contain', sizeClass, className)}
      draggable={false}
    />
  );
}
