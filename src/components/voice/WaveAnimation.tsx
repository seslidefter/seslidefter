"use client";

import { cn } from "@/lib/utils";

interface WaveAnimationProps {
  levels: number[];
  active?: boolean;
  className?: string;
}

export function WaveAnimation({ levels, active, className }: WaveAnimationProps) {
  return (
    <div
      className={cn(
        "flex h-14 items-end justify-center gap-1",
        className
      )}
      aria-hidden
    >
      {levels.map((h, i) => (
        <span
          key={i}
          className={cn(
            "w-1.5 rounded-full bg-white/95 transition-[height] duration-100",
            !active && "opacity-40"
          )}
          style={{ height: `${8 + h * 44}px` }}
        />
      ))}
    </div>
  );
}
