import React from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const alertVariants = cva(
  "w-full rounded-xl border p-4 flex items-start gap-3 text-sm leading-5",
  {
    variants: {
      variant: {
        default: "bg-muted text-foreground border-border",
        info: "bg-sky-50 text-sky-900 border-sky-200",
        success: "bg-emerald-50 text-emerald-900 border-emerald-200",
        warning: "bg-amber-50 text-amber-900 border-amber-200",
        destructive: "bg-rose-50 text-rose-900 border-rose-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export const Alert = ({ variant = "default", className = "", children, icon = null }) => {
  return (
    <div className={cn(alertVariants({ variant }), className)}>
      {icon && <span className="mt-0.5 flex-shrink-0">{icon}</span>}
      <div className="space-y-1 text-sm leading-5">{children}</div>
    </div>
  );
};

export default Alert;
