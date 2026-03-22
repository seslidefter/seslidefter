import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type PageShellVariant = "default" | "narrow" | "wide";

export function PageShell({
  title,
  children,
  className,
  contentClassName,
  variant = "default",
  titleClassName,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  variant?: PageShellVariant;
  /** Örn. gizli başlık: `hidden md:block` */
  titleClassName?: string;
}) {
  const max = "max-w-[1200px]";

  return (
    <div className={cn("sd-page-container mx-auto w-full", max, className)}>
      {title ? (
        <header className="sd-page-header">
          <h1 className={cn("sd-page-title", titleClassName)}>{title}</h1>
        </header>
      ) : null}
      <div className={cn("sd-page-content", contentClassName)}>{children}</div>
    </div>
  );
}
