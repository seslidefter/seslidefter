import { Suspense } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { Skeleton } from "@/components/ui/Skeleton";
import { IslemlerView } from "./islemler-view";

export default function IslemlerPage() {
  return (
    <Suspense
      fallback={
        <PageShell
          title="İşlemler"
          variant="narrow"
          contentClassName="flex flex-col gap-4"
          titleClassName="hidden md:block"
        >
          <Skeleton className="h-12 w-full rounded-2xl" />
          <Skeleton className="mt-3 h-10 w-full rounded-full" />
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="mt-3 h-20 w-full rounded-2xl" />
          ))}
        </PageShell>
      }
    >
      <IslemlerView />
    </Suspense>
  );
}
