import { AuthShell } from "@/components/auth/AuthShell";
import { Skeleton } from "@/components/ui/Skeleton";

export default function LoginLoading() {
  return (
    <AuthShell activeTab="login">
      <div className="space-y-4">
        <Skeleton className="h-[52px] w-full rounded-xl" />
        <Skeleton className="h-[52px] w-full rounded-xl" />
      </div>
    </AuthShell>
  );
}
