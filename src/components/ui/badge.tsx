import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-meta font-medium transition-colors',
  {
    variants: {
      variant: {
        default:
          'bg-primary/10 text-primary',
        secondary:
          'bg-secondary text-secondary-foreground',
        outline:
          'border border-border text-foreground',
        certain:
          'bg-tier-certain/10 text-tier-certain',
        probable:
          'bg-tier-probable/10 text-tier-probable',
        even:
          'bg-tier-even/10 text-tier-even',
        unlikely:
          'bg-tier-unlikely/10 text-tier-unlikely',
        remote:
          'bg-tier-remote/10 text-tier-remote',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
