import { AuthShell } from "@/components/auth/AuthShell";
import { Skeleton } from "@/components/ui/Skeleton";

export default function ForgotPasswordLoading() {
  return (
    <AuthShell activeTab="login">
      <Skeleton className="h-[52px] w-full rounded-xl" />
    </AuthShell>
  );
}
