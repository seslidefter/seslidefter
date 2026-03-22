import { redirect } from "next/navigation";
import { AIAssistant } from "@/components/ai/AIAssistant";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { Sidebar } from "@/components/layout/Sidebar";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-full bg-[var(--bg-primary)]">
      <Sidebar />
      <div className="flex min-h-full min-w-0 flex-1 flex-col pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0">
        <Header />
        <main className="flex-1 w-full min-w-0 px-4 py-4 md:px-6 md:py-6">{children}</main>
      </div>
      <MobileNav />
      <AIAssistant />
    </div>
  );
}
