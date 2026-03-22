"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-4xl" aria-hidden>
        ⚠️
      </p>
      <h1 className="sd-heading text-xl text-[var(--sd-text)]">Bir şeyler ters gitti</h1>
      <p className="max-w-sm text-sm font-medium text-black/55">{error.message}</p>
      <Button type="button" onClick={reset}>
        Tekrar dene
      </Button>
    </div>
  );
}
