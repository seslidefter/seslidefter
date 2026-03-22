"use client";

import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleReset() {
    if (!email.trim()) {
      toast.error("E-posta girin");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Geçerli e-posta girin");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const base = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${base}/auth/callback?type=recovery`,
    });
    if (error) {
      toast.error("Hata: " + error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="relative overflow-hidden bg-gradient-to-br from-green-900 via-green-700 to-green-600 px-6 pb-8 pt-12 text-center text-white">
        <div className="absolute right-0 top-0 h-40 w-40 translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10" />
        <div className="relative">
          <div className="mb-2 text-5xl">📒</div>
          <h1 className="text-2xl font-black">SesliDefter</h1>
          <p className="mt-1 text-sm opacity-80">Şifre Sıfırlama</p>
        </div>
      </div>

      <div className="flex-1 -mt-4 rounded-t-3xl bg-white px-6 pb-8 pt-8 dark:bg-gray-900">
        {!sent ? (
          <>
            <div className="mb-8 text-center">
              <div className="mb-3 text-4xl">🔑</div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Şifreni mi unuttun?</h2>
              <p className="mt-2 text-sm text-gray-500">E-posta adresine sıfırlama bağlantısı göndereceğiz.</p>
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-400">
                E-posta Adresi
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void handleReset()}
                placeholder="ornek@gmail.com"
                autoComplete="email"
                className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 transition-all focus:border-green-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <button
              type="button"
              onClick={() => void handleReset()}
              disabled={loading}
              className="mb-4 w-full rounded-xl bg-gradient-to-r from-green-800 to-green-600 py-4 text-base font-bold text-white shadow-lg disabled:opacity-50"
            >
              {loading ? "⏳ Gönderiliyor..." : "📧 Sıfırlama Bağlantısı Gönder"}
            </button>

            <Link href="/login" className="block text-center text-sm font-semibold text-green-600 dark:text-green-400">
              ← Giriş sayfasına dön
            </Link>
          </>
        ) : (
          <div className="py-8 text-center">
            <div className="mb-4 text-6xl">📬</div>
            <h2 className="mb-3 text-xl font-bold text-gray-900 dark:text-white">E-posta Gönderildi!</h2>
            <p className="mb-2 text-sm text-gray-500">
              <strong>{email}</strong> adresine sıfırlama bağlantısı gönderdik.
            </p>
            <p className="mb-8 text-sm text-gray-400">Spam klasörünü de kontrol etmeyi unutma.</p>
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left dark:border-amber-700 dark:bg-amber-900/20">
              <p className="mb-1 text-sm font-semibold text-amber-700 dark:text-amber-400">📌 Sonraki adım:</p>
              <p className="text-xs text-amber-600 dark:text-amber-500">
                E-postadaki bağlantıya tıkla → Yeni şifreni belirle → Giriş yap
              </p>
            </div>
            <Link
              href="/login"
              className="inline-block rounded-xl bg-gradient-to-r from-green-800 to-green-600 px-8 py-3 font-bold text-white"
            >
              Giriş Sayfasına Dön
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
