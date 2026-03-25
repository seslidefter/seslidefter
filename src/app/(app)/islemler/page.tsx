"use client";

import { useEffect, useState } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { Skeleton } from "@/components/ui/Skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { IslemlerView } from "./islemler-view";

export default function IslemlerPage() {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <PageShell
        title={t("transactions.title")}
        variant="narrow"
        contentClassName="flex flex-col gap-4 pb-32"
        titleClassName="hidden md:block"
      >
        <div className="mx-auto w-full max-w-4xl space-y-2 px-4 py-5">
          <Skeleton className="h-12 w-full rounded-2xl" />
          <Skeleton className="h-10 w-full rounded-full" />
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </PageShell>
    );
  }

  return <IslemlerView />;
}
