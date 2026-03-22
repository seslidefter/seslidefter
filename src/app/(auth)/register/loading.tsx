import { AuthShell } from "@/components/auth/AuthShell";
import { Skeleton } from "@/components/ui/Skeleton";

export default function RegisterLoading() {
  return (
    <AuthShell activeTab="register">
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-[52px] w-full rounded-xl" />
        ))}
      </div>
    </AuthShell>
  );
}
