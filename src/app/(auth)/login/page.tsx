import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
          <div className="sd-spinner h-10 w-10" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
