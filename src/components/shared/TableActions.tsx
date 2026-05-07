import type { MouseEvent, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';

export function TableActions({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex justify-end gap-2', className)}>{children}</div>;
}

export function TableActionButton({
  children,
  className,
  disabled,
  onClick,
  variant = 'outline',
}: {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  variant?: 'default' | 'outline' | 'ghost';
}) {
  return (
    <Button size="sm" variant={variant} className={className} disabled={disabled} onClick={onClick}>
      {children}
    </Button>
  );
}
