import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "outline" | "danger";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
}

export function Button({
  variant = "primary",
  fullWidth,
  className,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 ease-in-out active:scale-[0.99] disabled:pointer-events-none disabled:opacity-55",
        fullWidth && "w-full min-h-[52px]",
        variant === "primary" &&
          "sd-btn-primary border-0 text-white shadow-md hover:shadow-lg",
        variant === "outline" &&
          "border-[1.5px] border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:opacity-95",
        variant === "danger" &&
          "border-0 bg-[var(--sd-gider)] text-white shadow-md hover:brightness-105",
        className
      )}
      {...props}
    />
  );
}
