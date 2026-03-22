import { Suspense } from "react";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
          <div className="sd-spinner h-10 w-10" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
