import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/utils/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md border text-[15px] font-semibold transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(175,21,18,0.24)] cursor-pointer',
  {
    variants: {
      variant: {
        default: 'border-[#AF1512] bg-[#AF1512] text-white hover:bg-[#96110f] hover:border-[#96110f] shadow-[0_10px_22px_rgba(175,21,18,0.18)]',
        secondary: 'border-[#EAECF0] dark:border-slate-800 bg-[#FCFCF7] text-[#2B2B2D] dark:text-slate-100 hover:bg-white dark:bg-slate-950',
        outline: 'border-[#D7DCE3] bg-white dark:bg-slate-950 text-[#2B2B2D] dark:text-slate-100 hover:border-[#AF1512] hover:text-[#AF1512]',
        ghost: 'border-transparent bg-transparent text-[#5A6477] dark:text-slate-300 hover:bg-[#F4F5F7] hover:text-[#2B2B2D] dark:text-slate-100',
        destructive: 'border-[#8f1210] bg-[#8f1210] text-white hover:bg-[#79100e]',
      },
      size: {
        default: 'h-11 px-5',
        sm: 'h-9 px-3.5 text-sm',
        lg: 'h-12 px-6 text-base',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button';
  return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
});
Button.displayName = 'Button';

export { Button, buttonVariants };
