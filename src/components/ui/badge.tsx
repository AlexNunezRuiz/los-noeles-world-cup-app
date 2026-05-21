import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-marcador font-bold uppercase tracking-wide",
  {
    variants: {
      variant: {
        default: "bg-red text-white",
        secondary: "bg-surface-sunken text-ink-muted",
        outline: "border border-border text-ink-muted",
        success: "bg-green text-white",
        "success-soft": "bg-green/10 text-green border border-green/30",
        gold: "bg-gold/15 text-gold",
        info: "bg-blue/12 text-blue",
        destructive: "bg-red text-white",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
