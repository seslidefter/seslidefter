"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { GoogleIcon } from "@/components/auth/google-icon";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/authStore";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/dashboard";
  const initialized = useAuthStore((s) => s.initialized);
  const user = useAuthStore((s) => s.user);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("sd_remember_email");
    if (saved) {
      setEmail(saved);
      setRemember(true);
    }
  }, []);

  useEffect(() => {
    if (initialized && user) {
      router.replace(redirectTo.startsWith("/") ? redirectTo : "/dashboard");
    }
  }, [initialized, user, router, redirectTo]);

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="sd-spinner h-10 w-10" />
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <div className="sd-spinner h-10 w-10" />
        <p className="text-sm text-gray-500">Yönlendiriliyor…</p>
      </div>
    );
  }

  async function handleLogin() {
    if (!email.trim() || !password) {
      toast.error("E-posta ve şifre gerekli");
      return;
    }
    setLoading(true);
    if (remember) localStorage.setItem("sd_remember_email", email.trim());
    else localStorage.removeItem("sd_remember_email");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        toast.error("E-posta veya şifre hatalı");
      } else {
        toast.error("Giriş hatası: " + error.message);
      }
      setLoading(false);
      return;
    }
    toast.success("Giriş başarılı");
    router.replace(redirectTo.startsWith("/") ? redirectTo : "/dashboard");
    router.refresh();
    setLoading(false);
  }

  function handleGoogleSignIn() {
    const supabase = createClient();
    const base = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
    void supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${base}/auth/callback` },
    });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="relative overflow-hidden bg-gradient-to-br from-green-900 via-green-700 to-green-600 px-6 pb-8 pt-12 text-center text-white">
        <div className="absolute right-0 top-0 h-40 w-40 translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10" />
        <div className="absolute bottom-0 left-0 h-24 w-24 -translate-x-1/2 translate-y-1/2 rounded-full bg-white/[0.08]" />
        <div className="relative">
          <div className="mb-2 text-5xl">📒</div>
          <h1 className="text-2xl font-black">SesliDefter</h1>
          <p className="mt-1 text-sm opacity-80">Tekrar hoş geldin</p>
        </div>
      </div>

      <div className="flex-1 -mt-4 rounded-t-3xl bg-white px-6 pb-8 pt-8 dark:bg-gray-900">
        <div className="mb-6 flex rounded-2xl bg-gray-100 p-1 dark:bg-gray-800">
          <div className="flex-1 rounded-xl bg-white py-2.5 text-center text-sm font-bold text-green-700 shadow-sm dark:bg-gray-700 dark:text-green-400">
            Giriş Yap
          </div>
          <Link
            href="/register"
            className="flex-1 rounded-xl py-2.5 text-center text-sm font-semibold text-gray-500 dark:text-gray-400"
          >
            Kayıt Ol
          </Link>
        </div>

        <button
          type="button"
          onClick={() => void handleGoogleSignIn()}
          className="mb-4 flex w-full items-center justify-center gap-3 rounded-xl border-2 border-gray-200 py-3.5 font-semibold text-gray-700 transition-all hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <GoogleIcon />
          Google ile devam
        </button>

        <div className="mb-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
          <span className="text-xs text-gray-400">veya e-posta ile</span>
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-400">
              E-posta
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="ornek@gmail.com"
              className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 transition-all focus:border-green-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-400">Şifre</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void handleLogin()}
                autoComplete="current-password"
                className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 pr-12 text-sm text-gray-900 transition-all focus:border-green-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-lg text-gray-400"
                aria-label={showPw ? "Gizle" : "Göster"}
              >
                {showPw ? "🙈" : "👁️"}
              </button>
            </div>
          </div>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          Beni hatırla
        </label>

        <button
          type="button"
          onClick={() => void handleLogin()}
          disabled={loading}
          className="mt-5 w-full rounded-xl bg-gradient-to-r from-green-800 to-green-600 py-4 text-base font-bold text-white shadow-lg shadow-green-500/30 transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? "⏳ Giriş yapılıyor..." : "Giriş Yap →"}
        </button>

        <div className="mt-4 text-center">
          <Link href="/forgot-password" className="text-sm font-semibold text-green-600 dark:text-green-400">
            Şifremi unuttum
          </Link>
        </div>
      </div>
    </div>
  );
}
