"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";

type Status = "loading" | "confirm" | "deleting" | "done" | "error";

export function DeleteAccountClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    const confirmParam = searchParams.get("confirm");
    if (confirmParam !== "true") {
      setStatus("error");
      return;
    }
    const supabase = createClient();
    void supabase.auth.getSession().then(({ data }) => {
      if (!data.session) setStatus("error");
      else setStatus("confirm");
    });
  }, [searchParams]);

  async function deleteAccount() {
    setStatus("deleting");
    const supabase = createClient();
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Oturum bulunamadı");

      const uid = user.id;
      for (const t of ["transactions", "contacts", "budgets"] as const) {
        const { error } = await supabase.from(t).delete().eq("user_id", uid);
        if (error) console.error(`[delete ${t}]`, error);
      }

      const { data: plans } = await supabase.from("payment_plans").select("id").eq("user_id", uid);
      const planIds = (plans ?? []).map((p: { id: string }) => p.id);
      if (planIds.length > 0) {
        await supabase.from("payment_plan_payments").delete().in("plan_id", planIds);
      }
      await supabase.from("payment_plans").delete().eq("user_id", uid);

      const { error: pErr } = await supabase.from("profiles").delete().eq("id", uid);
      if (pErr) console.error("[delete profile]", pErr);

      await supabase.auth.signOut();
      setStatus("done");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
      toast.error("Hata: " + msg);
      setStatus("error");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800">
        {status === "loading" ? (
          <div className="py-8 text-center text-gray-400">Yükleniyor...</div>
        ) : null}

        {status === "confirm" ? (
          <>
            <div className="mb-6 text-center">
              <div className="mb-3 text-5xl">🗑️</div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white">Hesabı Sil</h2>
              <p className="mt-2 text-sm text-gray-500">
                Bu işlem geri alınamaz. Tüm verileriniz kalıcı olarak silinecek.
              </p>
            </div>
            <div className="mb-6 rounded-xl bg-red-50 p-4 dark:bg-red-900/20">
              <p className="text-xs font-semibold text-red-600 dark:text-red-400">Silinecekler:</p>
              <ul className="mt-1 space-y-1 text-xs text-red-500">
                <li>• Tüm işlem kayıtları</li>
                <li>• Alacak/verecek verileri</li>
                <li>• Ödeme planları</li>
                <li>• Profil bilgileri</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-600 dark:border-gray-600 dark:text-gray-400"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => void deleteAccount()}
                className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-bold text-white"
              >
                Evet, Sil
              </button>
            </div>
          </>
        ) : null}

        {status === "deleting" ? (
          <div className="py-8 text-center">
            <div className="mb-3 text-4xl">⏳</div>
            <p className="text-gray-600 dark:text-gray-400">Veriler siliniyor...</p>
          </div>
        ) : null}

        {status === "done" ? (
          <div className="py-8 text-center">
            <div className="mb-3 text-4xl">✅</div>
            <h2 className="mb-2 text-lg font-bold text-gray-900 dark:text-white">Hesap Silindi</h2>
            <p className="mb-4 text-sm text-gray-500">Verileriniz silindi. Oturum kapatıldı.</p>
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="rounded-xl bg-green-700 px-6 py-3 text-sm font-bold text-white"
            >
              Giriş Sayfası
            </button>
          </div>
        ) : null}

        {status === "error" ? (
          <div className="py-8 text-center">
            <div className="mb-3 text-4xl">❌</div>
            <p className="mb-4 text-gray-600 dark:text-gray-400">
              Geçersiz veya süresi dolmuş bağlantı. Önce giriş yapın veya profilden tekrar deneyin.
            </p>
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="rounded-xl bg-green-700 px-6 py-3 text-sm font-bold text-white"
            >
              Geri Dön
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
