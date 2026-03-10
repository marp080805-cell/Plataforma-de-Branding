import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-[#7c6ef5]/[0.15] text-[#a898ff] border border-[#7c6ef5]/[0.25]',
        secondary: 'bg-white/[0.06] text-[#9090b0] border border-white/[0.08]',
        destructive: 'bg-[#c93030]/[0.15] text-[#ff8080] border border-[#c93030]/[0.25]',
        outline: 'text-[#9090b0] border border-white/[0.1]',
        anthropic: 'bg-[#f59e0b]/[0.12] text-[#fbbf24] border border-[#f59e0b]/[0.2]',
        openai: 'bg-[#10b981]/[0.12] text-[#34d399] border border-[#10b981]/[0.2]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
