"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
      else router.replace("/forgot-password");
    });
  }, [router]);

  function getStrength(p: string): number {
    let s = 0;
    if (p.length >= 8) s++;
    if (p.length >= 12) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  }

  async function handleReset() {
    if (password.length < 8) {
      toast.error("Şifre en az 8 karakter olmalı");
      return;
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      toast.error("En az 1 büyük harf gerekli");
      return;
    }
    if (!/(?=.*\d)/.test(password)) {
      toast.error("En az 1 rakam gerekli");
      return;
    }
    if (password !== confirm) {
      toast.error("Şifreler eşleşmiyor");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error("Hata: " + error.message);
    } else {
      toast.success("✅ Şifren güncellendi!");
      setTimeout(() => router.push("/dashboard"), 1500);
    }
    setLoading(false);
  }

  const strength = getStrength(password);
  const strengthLabels = ["", "Çok Zayıf", "Zayıf", "Orta", "Güçlü", "Çok Güçlü"];
  const strengthColors = ["", "bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-green-500", "bg-green-700"];

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-400">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="relative overflow-hidden bg-gradient-to-br from-green-900 via-green-700 to-green-600 px-6 pb-8 pt-12 text-center text-white">
        <div className="absolute right-0 top-0 h-40 w-40 translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10" />
        <div className="relative">
          <div className="mb-2 text-5xl">📒</div>
          <h1 className="text-2xl font-black">SesliDefter</h1>
          <p className="mt-1 text-sm opacity-80">Yeni Şifre Belirle</p>
        </div>
      </div>

      <div className="flex-1 -mt-4 rounded-t-3xl bg-white px-6 pb-8 pt-8 dark:bg-gray-900">
        <div className="mb-8 text-center">
          <div className="mb-3 text-4xl">🔐</div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Yeni Şifreni Belirle</h2>
          <p className="mt-2 text-sm text-gray-500">Güvenli bir şifre seç</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-400">
              Yeni Şifre
            </label>
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="En az 8 karakter"
                autoComplete="new-password"
                className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 transition-all focus:border-green-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                aria-label={show ? "Gizle" : "Göster"}
              >
                {show ? "🙈" : "👁️"}
              </button>
            </div>
            {password ? (
              <div className="mt-2 space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-all ${
                        i <= strength ? strengthColors[strength] : "bg-gray-200 dark:bg-gray-700"
                      }`}
                    />
                  ))}
                </div>
                <p
                  className={`text-xs font-semibold ${
                    strength <= 2 ? "text-red-500" : strength <= 3 ? "text-yellow-500" : "text-green-600"
                  }`}
                >
                  {strengthLabels[strength]}
                </p>
              </div>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-400">
              Şifre Tekrar
            </label>
            <input
              type={show ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Şifreyi tekrar girin"
              autoComplete="new-password"
              className={`w-full rounded-xl border-2 bg-gray-50 px-4 py-3 text-sm text-gray-900 transition-all focus:outline-none dark:bg-gray-800 dark:text-white ${
                confirm && confirm !== password
                  ? "border-red-400 focus:border-red-500"
                  : "border-gray-200 focus:border-green-500 dark:border-gray-700"
              }`}
            />
            {confirm && confirm !== password ? (
              <p className="mt-1 text-xs text-red-500">Şifreler eşleşmiyor</p>
            ) : null}
            {confirm && confirm === password && password.length >= 8 ? (
              <p className="mt-1 text-xs text-green-600">✅ Şifreler eşleşiyor</p>
            ) : null}
          </div>

          <div className="rounded-xl bg-blue-50 p-4 dark:bg-blue-900/20">
            <p className="mb-2 text-xs font-semibold text-blue-700 dark:text-blue-400">💡 Güçlü şifre için:</p>
            <div className="space-y-1">
              {[
                { ok: password.length >= 8, text: "En az 8 karakter" },
                { ok: /[A-Z]/.test(password), text: "En az 1 büyük harf" },
                { ok: /[0-9]/.test(password), text: "En az 1 rakam" },
                { ok: /[^A-Za-z0-9]/.test(password), text: "Özel karakter (!@#$)" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span>{item.ok ? "✅" : "⬜"}</span>
                  <span className={item.ok ? "text-green-600" : "text-gray-500"}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleReset()}
          disabled={loading || password.length < 8 || password !== confirm}
          className="mt-6 w-full rounded-xl bg-gradient-to-r from-green-800 to-green-600 py-4 text-base font-bold text-white shadow-lg transition-all disabled:opacity-50"
        >
          {loading ? "⏳ Güncelleniyor..." : "🔐 Şifremi Güncelle"}
        </button>
      </div>
    </div>
  );
}
