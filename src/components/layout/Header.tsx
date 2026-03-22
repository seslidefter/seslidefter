"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDateTr } from "@/lib/utils";
import type { ProfileRow } from "@/types/database";
import { useAuthStore } from "@/store/authStore";

export function Header() {
  const user = useAuthStore((s) => s.user);
  const [profile, setProfile] = useState<Pick<ProfileRow, "full_name"> | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const { data } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
      if (!cancelled) setProfile(data as Pick<ProfileRow, "full_name"> | null);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const name =
    profile?.full_name?.trim() ||
    (user?.user_metadata?.full_name as string | undefined)?.trim() ||
    user?.email?.split("@")[0] ||
    "Misafir";

  const today = formatDateTr(new Date(), {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <header
      className="sticky top-0 z-20 border-b px-4 py-3 backdrop-blur-md md:px-8"
      style={{
        borderColor: "var(--border-color)",
        background: "color-mix(in srgb, var(--bg-card) 88%, transparent)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-lg font-bold leading-tight text-[var(--text-primary)] md:text-xl">
            Merhaba, {name} <span aria-hidden>👋</span>
          </p>
          <p className="text-xs font-semibold capitalize text-[var(--text-secondary)] md:text-sm">
            {today}
          </p>
        </div>
        <Link
          href="/profil"
          className="shrink-0 rounded-xl px-3 py-2 text-sm font-bold text-[var(--sd-primary)] hover:bg-[color-mix(in_srgb,var(--sd-primary)_10%,var(--bg-secondary))] md:hidden"
        >
          Profil
        </Link>
      </div>
    </header>
  );
}
