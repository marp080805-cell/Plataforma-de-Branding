import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40 select-none',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-white hover:bg-primary/90 shadow-[0_0_0_1px_rgba(23,105,104,0.3),0_1px_3px_rgba(0,0,0,0.2)] hover:shadow-[0_0_20px_rgba(23,105,104,0.22),0_0_0_1px_rgba(23,105,104,0.45)]',
        destructive:
          'bg-destructive text-white hover:bg-destructive/90 shadow-[0_0_0_1px_rgba(201,48,48,0.3)]',
        outline:
          'border border-primary/40 bg-transparent text-primary hover:bg-primary hover:text-white hover:border-primary',
        secondary:
          'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 hover:border-primary/30',
        ghost:
          'text-primary/70 hover:bg-primary/10 hover:text-primary',
        link: 'text-primary underline-offset-4 hover:underline hover:text-primary/80',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-11 rounded-lg px-8 text-sm',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
