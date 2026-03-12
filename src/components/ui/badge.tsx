import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'bg-primary/10 text-primary border border-primary/20 dark:bg-primary/15 dark:text-[#5bbfbe] dark:border-primary/25',
        secondary:
          'bg-muted text-muted-foreground border border-border/60',
        destructive:
          'bg-destructive/10 text-destructive border border-destructive/20',
        outline:
          'text-muted-foreground border border-border/60',
        anthropic:
          'bg-amber-500/10 text-amber-600 border border-amber-500/20 dark:text-amber-400',
        openai:
          'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:text-emerald-400',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
