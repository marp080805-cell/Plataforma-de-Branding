import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-lg border border-white/[0.09] bg-white/[0.04] px-3 py-2 text-sm text-[#d8d8ec] ring-offset-background placeholder:text-[#50506a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7c6ef5]/60 focus-visible:ring-offset-0 focus-visible:border-[#7c6ef5]/50 disabled:cursor-not-allowed disabled:opacity-40 transition-all duration-200 resize-none',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };
