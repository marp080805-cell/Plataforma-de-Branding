import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        'flex h-9 w-full rounded-lg border border-white/[0.09] bg-white/[0.04] px-3 py-2 text-sm text-[#d8ecea] ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#4a6a68] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176968]/60 focus-visible:ring-offset-0 focus-visible:border-[#176968]/50 disabled:cursor-not-allowed disabled:opacity-40 transition-all duration-200',
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = 'Input';

export { Input };
