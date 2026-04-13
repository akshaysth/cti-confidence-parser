import * as React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

// Minimalist underline input per DESIGN.md:
// No full box. surface-low background with primary underline on focus.
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'w-full bg-muted px-3 py-2 text-sm text-foreground font-meta',
          'border-0 border-b-2 border-border',
          'rounded-t-sm rounded-b-none',
          'placeholder:text-muted-foreground',
          'focus:outline-none focus:border-primary',
          'transition-colors duration-150',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
