import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function Card({ className, style, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          "sd-card rounded-[var(--sd-radius)] border bg-[var(--bg-card)] transition-[transform,box-shadow] duration-200 ease-in-out",
          className
        )}
        style={{ borderColor: "var(--border-color)", ...style }}
        {...props}
      />
    );
  }
);
