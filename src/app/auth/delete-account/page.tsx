import { Suspense } from "react";
import { DeleteAccountClient } from "./delete-account-client";

export default function DeleteAccountPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-gray-400">Yükleniyor...</div>
        </div>
      }
    >
      <DeleteAccountClient />
    </Suspense>
  );
}
