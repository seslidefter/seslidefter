"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const fieldId = id ?? `field-${label.replace(/\s+/g, "-").toLowerCase()}`;
    return (
      <div className="w-full">
        <label htmlFor={fieldId} className="mb-1.5 block text-sm font-bold">
          {label}
        </label>
        <input
          ref={ref}
          id={fieldId}
          className={cn(
            "min-h-[52px] w-full rounded-xl border-[1.5px] border-black/12 bg-[var(--sd-card)] px-4 py-3 text-sm font-medium transition",
            "focus:border-[var(--sd-primary)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--sd-primary)_25%,transparent)]",
            error &&
              "border-[var(--sd-gider)] focus:border-[var(--sd-gider)] focus:ring-[color-mix(in_srgb,var(--sd-gider)_22%,transparent)]",
            className
          )}
          {...props}
        />
        {error ? (
          <p className="mt-1.5 text-xs font-bold text-[var(--sd-gider)]">{error}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
