"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { GoogleIcon } from "@/components/auth/google-icon";
import { LanguageSelectorCompact } from "@/components/ui/LanguageSelector";
import { useLanguage } from "@/contexts/LanguageContext";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/authStore";

async function processInviteCode(
  supabase: ReturnType<typeof createClient>,
  rawCode: string | null | undefined,
  newUserId: string,
  successMessage: string
) {
  try {
    const code = rawCode?.trim().toUpperCase();
    if (!code) return;

    const { data: inviter, error: findError } = await supabase
      .from("profiles")
      .select("id, premium_until, invite_count")
      .eq("invite_code", code)
      .maybeSingle();

    if (findError || !inviter) {
      console.log("Davet kodu bulunamadı:", code);
      return;
    }

    if (inviter.id === newUserId) return;

    const { error: updateNewUser } = await supabase
      .from("profiles")
      .update({ invited_by: inviter.id })
      .eq("id", newUserId);

    if (updateNewUser) {
      console.error("Yeni kullanıcı güncellenemedi:", updateNewUser);
      return;
    }

    const now = new Date();
    const base =
      inviter.premium_until && new Date(inviter.premium_until) > now
        ? new Date(inviter.premium_until)
        : now;
    base.setDate(base.getDate() + 30);

    const currentCount = inviter.invite_count ?? 0;

    const { error: updateInviter } = await supabase
      .from("profiles")
      .update({
        premium_until: base.toISOString(),
        invite_count: currentCount + 1,
      })
      .eq("id", inviter.id);

    if (updateInviter) {
      console.error("Davet eden güncellenemedi:", updateInviter);
      return;
    }

    const selfPremium = new Date();
    selfPremium.setDate(selfPremium.getDate() + 30);
    const { error: selfPremErr } = await supabase
      .from("profiles")
      .update({ premium_until: selfPremium.toISOString() })
      .eq("id", newUserId);
    if (selfPremErr) {
      console.error("Davet alan premium güncellenemedi:", selfPremErr);
    }

    console.log("✅ Davet kodu başarıyla işlendi:", code);
    toast.success(successMessage);
  } catch (e) {
    console.error("Davet kodu işleme hatası:", e);
  }
}

function getPasswordStrength(password: string): number {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

function PasswordStrengthBar({ strength }: { strength: number }) {
  const labels = ["", "Çok Zayıf", "Zayıf", "Orta", "Güçlü", "Çok Güçlü"];
  const colors = ["", "bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-green-500", "bg-green-700"];

  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all ${
              i <= strength ? colors[strength] : "bg-gray-200 dark:bg-gray-700"
            }`}
          />
        ))}
      </div>
      <p
        className={`text-xs font-semibold ${
          strength <= 2 ? "text-red-500" : strength <= 3 ? "text-yellow-500" : "text-green-600"
        }`}
      >
        {labels[strength]}
      </p>
    </div>
  );
}

function FormInput({
  label,
  type = "text",
  value,
  onChange,
  error,
  placeholder,
  autoComplete,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  const { t } = useLanguage();
  const [show, setShow] = useState(false);
  const isPassword = type === "password";

  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-400">{label}</label>
      <div className="relative">
        <input
          type={isPassword ? (show ? "text" : "password") : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`w-full rounded-xl border-2 bg-gray-50 px-4 py-3 text-sm text-gray-900 transition-all focus:outline-none dark:bg-gray-800 dark:text-white ${
            isPassword ? "pe-12 " : ""
          } ${
            error
              ? "border-red-400 focus:border-red-500"
              : "border-gray-200 focus:border-green-500 dark:border-gray-700"
          }`}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute end-3 top-1/2 -translate-y-1/2 text-lg text-gray-400"
            aria-label={show ? t("auth.hidePassword") : t("auth.showPassword")}
          >
            {show ? "🙈" : "👁️"}
          </button>
        ) : null}
      </div>
      {error ? <p className="mt-1 text-xs text-red-500">{error}</p> : null}
    </div>
  );
}

export function RegisterForm() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialized = useAuthStore((s) => s.initialized);
  const user = useAuthStore((s) => s.user);

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    passwordConfirm: "",
    inviteCode: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) setForm((f) => ({ ...f, inviteCode: ref.toUpperCase() }));
  }, [searchParams]);

  useEffect(() => {
    if (initialized && user) router.replace("/dashboard");
  }, [initialized, user, router]);

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
        <p className="text-sm text-gray-500">{t("auth.redirecting")}</p>
      </div>
    );
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.fullName.trim()) e.fullName = "Ad soyad gerekli";
    if (!form.email.trim()) e.email = "E-posta gerekli";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Geçerli e-posta girin";
    if (form.password.length < 8) e.password = "Şifre en az 8 karakter olmalı";
    else if (!/(?=.*[A-Z])/.test(form.password)) e.password = "En az 1 büyük harf içermeli";
    else if (!/(?=.*\d)/.test(form.password)) e.password = "En az 1 rakam içermeli";
    if (form.password !== form.passwordConfirm) e.passwordConfirm = "Şifreler eşleşmiyor";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleRegister() {
    if (!validate()) return;
    setLoading(true);
    const supabase = createClient();
    const origin = process.env.NEXT_PUBLIC_APP_URL ?? (typeof window !== "undefined" ? window.location.origin : "");

    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        options: {
          data: { full_name: form.fullName.trim() },
          emailRedirectTo: `${origin}/auth/callback`,
        },
      });

      if (error) throw error;

      const userId = data.user?.id;
      if (!userId) throw new Error("Kullanıcı oluşturulamadı");

      const { error: profErr } = await supabase
        .from("profiles")
        .update({ full_name: form.fullName.trim() })
        .eq("id", userId);
      if (profErr) console.error("[register] profile", profErr);

      const code = form.inviteCode.trim() || searchParams.get("ref")?.trim();
      if (code && data.session) {
        await processInviteCode(supabase, code, userId, t("auth.inviteBonusBoth"));
      }

      toast.success(data.session ? "✅ Kayıt başarılı! Giriş yapılıyor..." : "✅ Kayıt alındı — e-postanızı doğrulayın.");
      if (data.session) {
        router.replace("/dashboard");
        router.refresh();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Kayıt hatası";
      if (msg.includes("already registered") || msg.includes("already been registered")) {
        toast.error("Bu e-posta zaten kayıtlı. Giriş yapmayı deneyin.");
      } else {
        toast.error("Kayıt hatası: " + msg);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleSignIn() {
    const supabase = createClient();
    const base = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
    void supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${base}/auth/callback` },
    });
  }

  const passwordStrength = getPasswordStrength(form.password);

  return (
    <div className="flex min-h-screen flex-col">
      <div className="relative overflow-hidden bg-gradient-to-br from-green-900 via-green-700 to-green-600 px-6 pb-8 pt-12 text-center text-white">
        <div className="absolute end-4 top-4 z-10">
          <LanguageSelectorCompact />
        </div>
        <div className="absolute right-0 top-0 h-40 w-40 translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10" />
        <div className="absolute bottom-0 left-0 h-24 w-24 -translate-x-1/2 translate-y-1/2 rounded-full bg-white/[0.08]" />
        <div className="relative">
          <div className="mb-2 text-5xl">📒</div>
          <h1 className="text-2xl font-black">{t("auth.slogan")}</h1>
          <p className="mt-1 text-sm opacity-80">{t("auth.registerSubtitle")}</p>
        </div>
      </div>

      <div className="flex-1 -mt-4 rounded-t-3xl bg-white px-6 pb-8 pt-8 dark:bg-gray-900">
        <div className="mb-6 flex rounded-2xl bg-gray-100 p-1 dark:bg-gray-800">
          <Link
            href="/login"
            className="flex-1 rounded-xl py-2.5 text-center text-sm font-semibold text-gray-500 dark:text-gray-400"
          >
            {t("auth.login")}
          </Link>
          <div className="flex-1 rounded-xl bg-white py-2.5 text-center text-sm font-bold text-green-700 shadow-sm dark:bg-gray-700 dark:text-green-400">
            {t("auth.register")}
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleGoogleSignIn()}
          className="mb-4 flex w-full items-center justify-center gap-3 rounded-xl border-2 border-gray-200 py-3.5 font-semibold text-gray-700 transition-all hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <GoogleIcon />
          {t("auth.registerWithGoogle")}
        </button>

        <div className="mb-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
          <span className="text-xs text-gray-400">{t("auth.orEmail")}</span>
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
        </div>

        <div className="space-y-3">
          <FormInput
            label={t("auth.fullName")}
            value={form.fullName}
            onChange={(v) => setForm((f) => ({ ...f, fullName: v }))}
            error={errors.fullName}
            placeholder="Tayfun Akyasan"
            autoComplete="name"
          />
          <FormInput
            label={t("auth.email")}
            type="email"
            value={form.email}
            onChange={(v) => setForm((f) => ({ ...f, email: v }))}
            error={errors.email}
            placeholder="ornek@gmail.com"
            autoComplete="email"
          />
          <FormInput
            label={t("auth.password")}
            type="password"
            value={form.password}
            onChange={(v) => setForm((f) => ({ ...f, password: v }))}
            error={errors.password}
            placeholder="En az 8 karakter"
            autoComplete="new-password"
          />

          {form.password ? <PasswordStrengthBar strength={passwordStrength} /> : null}

          <FormInput
            label={t("auth.passwordConfirm")}
            type="password"
            value={form.passwordConfirm}
            onChange={(v) => setForm((f) => ({ ...f, passwordConfirm: v }))}
            error={errors.passwordConfirm}
            placeholder="Şifreyi tekrar girin"
            autoComplete="new-password"
          />

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-400">
              {t("auth.inviteCode")}{" "}
              <span className="font-normal text-gray-400">{t("auth.optionalShort")}</span>
            </label>
            <div className="relative">
              <input
                value={form.inviteCode}
                onChange={(e) => setForm((f) => ({ ...f, inviteCode: e.target.value.toUpperCase() }))}
                placeholder="ABC12345"
                maxLength={8}
                className={`w-full rounded-xl border-2 px-4 py-3 font-mono text-sm tracking-widest uppercase transition-all focus:outline-none focus:border-green-500 ${
                  form.inviteCode
                    ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                    : "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800"
                }`}
              />
              {form.inviteCode ? (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-lg text-green-500">🎁</div>
              ) : null}
            </div>
            {form.inviteCode ? (
              <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                🎁 Davet kodun uygulandı — ikiz de 30 gün premium kazanacak!
              </p>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleRegister()}
          disabled={loading}
          className="mt-5 w-full rounded-xl bg-gradient-to-r from-green-800 to-green-600 py-4 text-base font-bold text-white shadow-lg shadow-green-500/30 transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? t("auth.signingUp") : `${t("auth.createAccount")} →`}
        </button>

        <p className="mt-4 text-center text-xs text-gray-400">
          {t("auth.registerLegalIntro")}{" "}
          <Link href="/profil#ayarlar" className="font-semibold text-green-600">
            {t("profile.terms")}
          </Link>{" "}
          {t("auth.registerLegalMid")}{" "}
          <Link href="/profil#ayarlar" className="font-semibold text-green-600">
            {t("profile.privacy")}
          </Link>
          {t("auth.registerLegalOutro")}
        </p>
      </div>
    </div>
  );
}
