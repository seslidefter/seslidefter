"use client";

import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { PageShell } from "@/components/layout/PageShell";
import { persistTheme, readStoredTheme } from "@/components/providers/theme-provider";
import { RaporTab } from "@/components/profil/RaporTab";
import { LanguageSelector } from "@/components/ui/LanguageSelector";
import { useLanguage } from "@/contexts/LanguageContext";
import { errToast } from "@/lib/sd-toast";
import { getOrCreateInviteCode } from "@/lib/invite-code";
import { getBrowserClientSingleton } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";

type TabType = "hesap" | "davet" | "rapor" | "ayarlar";

export type ProfilProfile = Record<string, unknown> & {
  id: string;
  email: string;
  invite_code: string;
  invite_count: number;
  full_name?: string | null;
  premium_until?: string | null;
  plan?: string | null;
  created_at?: string | null;
};

function profileDisplayName(p: ProfilProfile): string {
  const raw = p.full_name;
  const fn = typeof raw === "string" ? raw.trim() : raw != null ? String(raw).trim() : "";
  if (fn) return fn;
  return p.email?.split("@")[0]?.trim() || "Kullanıcı";
}

function profileInitials(displayName: string): string {
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return initials || "U";
}

const KVKK_TEXT = `Veri sorumlusu: SesliDefter (seslidefter@gmail.com), kullanıcı verilerinizi 6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında işler.

Toplanan veriler: hesap bilgileri (ad, e-posta), işlem kayıtları (tutar, kategori, tarih, açıklama), isteğe bağlı kişi rehberi ve cihaz/tarayıcı teknik verileri.

Kullanım amaçları: uygulama hizmetinin sunulması, gelir-gider takibi, güvenlik, yasal yükümlülükler ve kullanıcı desteği.

Saklama süresi: hesabınız aktif olduğu sürece; hesap silindiğinde veya talebiniz üzerinde makul süre içinde silinir veya anonimleştirilir.

Haklarınız: veriye erişim, düzeltme, silme, işlemeyi kısıtlama veya itiraz; şikayet için Kişisel Verileri Koruma Kurulu'na başvurabilirsiniz.

İletişim: seslidefter@gmail.com`;

const PRIVACY_TEXT = `SesliDefter, finansal verilerinizi yalnızca size hizmet vermek için işler. Verileriniz üçüncü taraflara satılmaz; yalnızca barındırma ve kimlik doğrulama için güvenilir altyapı sağlayıcıları (ör. Supabase) kullanılabilir.

Çerezler ve yerel depolama: oturum ve tema tercihi gibi işlevler için tarayıcıda minimal veri saklanabilir.

Güvenlik: iletim ve depolama için sektör standardı önlemler uygulanır; mutlak güvenlik garanti edilemez.

Politika güncellemeleri: önemli değişiklikler uygulama içi duyuru ile bildirilebilir.

İletişim: seslidefter@gmail.com`;

const TERMS_TEXT = `SesliDefter uygulamasını kullanarak bu koşulları kabul etmiş olursunuz. Hizmet “olduğu gibi” sunulur; finansal kararlarınızın sorumluluğu size aittir.

Hesabınızın güvenliği ve şifre gizliliği sizin sorumluluğunuzdadır. Hizmeti kötüye kullanmak, yasalara aykırı içerik veya zararlı faaliyet yasaktır.

İletişim: seslidefter@gmail.com`;

export default function ProfilPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfilProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [openSection, setOpenSection] = useState<TabType | null>("hesap");

  useEffect(() => {
    const h = window.location.hash.replace(/^#/, "") as TabType;
    if (h === "davet" || h === "ayarlar" || h === "hesap" || h === "rapor") setOpenSection(h);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = getBrowserClientSingleton();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        if (!cancelled) {
          setLoading(false);
          router.replace("/login");
        }
        return;
      }

      const userId = session.user.id;

      const [profileRes, inviteRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("invited_by", userId),
      ]);

      if (cancelled) return;

      const row = profileRes.data as Record<string, unknown> | null;
      let inviteCode = (row?.invite_code as string | null | undefined)?.trim() ?? "";
      if (!inviteCode) {
        inviteCode = await getOrCreateInviteCode(userId);
      }

      const metaName = (session.user.user_metadata?.full_name as string | undefined)?.trim();
      const mergedFullName =
        (row?.full_name as string | null | undefined)?.trim() || metaName || null;

      setProfile({
        ...(row ?? {}),
        id: userId,
        full_name: mergedFullName,
        email: session.user.email ?? "",
        invite_code: inviteCode,
        invite_count: !inviteRes.error ? (inviteRes.count ?? 0) : 0,
      } as ProfilProfile);
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const onSectionToggle = (id: TabType) => {
    setOpenSection((prev) => {
      const next = prev === id ? null : id;
      if (typeof window !== "undefined" && next) {
        window.history.replaceState(null, "", `#${next}`);
      } else if (typeof window !== "undefined" && !next) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
      return next;
    });
  };

  if (loading || !profile) return <ProfilSkeleton />;

  const isPremium = profile.premium_until
    ? new Date(String(profile.premium_until)) > new Date()
    : profile.plan === "premium";

  const sections: { id: TabType; label: string; icon: string }[] = useMemo(
    () => [
      { id: "hesap", label: t("profile.accountInfo"), icon: "👤" },
      { id: "davet", label: t("profile.inviteEarn"), icon: "🎁" },
      { id: "rapor", label: t("report.title"), icon: "📊" },
      { id: "ayarlar", label: t("profile.settings"), icon: "⚙️" },
    ],
    [t]
  );

  const displayName = profileDisplayName(profile);
  const initials = profileInitials(displayName);

  return (
    <PageShell title={t("profile.title")} contentClassName="pb-28 fade-in" titleClassName="hidden md:block">
      <div className="mx-auto w-full max-w-6xl px-4 py-5 md:px-6">
        <div className="mb-4 flex w-full flex-col items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 md:flex-row md:items-start md:p-6">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-green-800 to-green-500 text-2xl font-bold text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="mb-0.5 truncate text-lg font-bold text-gray-900 dark:text-white">{displayName}</h2>
            <p className="mb-1.5 truncate text-sm text-gray-500 dark:text-gray-400">{profile.email}</p>
            <span
              className={cn(
                "inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold",
                isPremium
                  ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                  : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
              )}
            >
              {isPremium ? "⭐ Premium" : "🆓 Ücretsiz"}
            </span>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {sections.map((section) => (
            <div
              key={section.id}
              className="overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-gray-700 dark:bg-gray-800"
            >
              <button
                type="button"
                aria-expanded={openSection === section.id}
                onClick={() => onSectionToggle(section.id)}
                className="flex w-full items-center justify-between px-4 py-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/40"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl" aria-hidden>
                    {section.icon}
                  </span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {section.label}
                  </span>
                </div>
                <span
                  className={cn(
                    "text-gray-400 transition-transform duration-200",
                    openSection === section.id ? "rotate-180" : ""
                  )}
                  aria-hidden
                >
                  ▼
                </span>
              </button>
              {openSection === section.id ? (
                <div
                  className="animate-fadeIn border-t border-gray-100 p-4 dark:border-gray-700"
                  role="region"
                  aria-label={section.label}
                >
                  {section.id === "hesap" && (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <HesapTab profile={profile} isPremium={isPremium} />
                    </div>
                  )}
                  {section.id === "rapor" && (
                    <div className="md:col-span-2">
                      <RaporTab />
                    </div>
                  )}
                  {section.id === "davet" && (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <DavetTab profile={profile} />
                    </div>
                  )}
                  {section.id === "ayarlar" && (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <AyarlarTab profile={profile} />
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-700">
          <button
            type="button"
            onClick={() => {
              void (async () => {
                const sb = getBrowserClientSingleton();
                await sb.auth.signOut();
                await useAuthStore.getState().signOut();
                window.location.href = "/login";
              })();
            }}
            className="w-full rounded-2xl border-2 border-red-200 py-3.5 text-sm font-bold text-red-500 transition-all hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
          >
            🚪 Çıkış Yap
          </button>
        </div>
      </div>
    </PageShell>
  );
}

const HesapTab = memo(function HesapTab({
  profile,
  isPremium,
}: {
  profile: ProfilProfile;
  isPremium: boolean;
}) {
  const joinDate = profile.created_at
    ? new Date(String(profile.created_at)).toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "—";

  const premiumUntil = profile.premium_until
    ? new Date(String(profile.premium_until)).toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const daysRemaining = profile.premium_until
    ? Math.ceil((new Date(String(profile.premium_until)).getTime() - Date.now()) / 86400000)
    : null;

  const adSoyad =
    profile.full_name?.toString().trim() || profile.email?.split("@")[0]?.trim() || "—";

  return (
    <div className="grid grid-cols-1 items-start gap-4 md:col-span-2 md:grid-cols-2">
        <div className="flex flex-col gap-3.5">
          <div className="mb-1 overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3.5 last:border-0 dark:border-gray-700">
              <span className="text-sm text-gray-500 dark:text-gray-400">Ad Soyad</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{adSoyad}</span>
            </div>
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3.5 last:border-0 dark:border-gray-700">
              <span className="text-sm text-gray-500 dark:text-gray-400">E-posta</span>
              <span className="max-w-[55%] truncate text-sm font-semibold text-gray-900 dark:text-white">
                {profile.email}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3.5 last:border-0 dark:border-gray-700">
              <span className="text-sm text-gray-500 dark:text-gray-400">Üyelik Tarihi</span>
              <span
                suppressHydrationWarning
                className="text-sm font-semibold text-gray-900 dark:text-white"
              >
                {joinDate}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3.5 last:border-0 dark:border-gray-700">
              <span className="text-sm text-gray-500 dark:text-gray-400">Plan</span>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-bold",
                  isPremium
                    ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                )}
              >
                {isPremium ? "⭐ Premium" : "🆓 Ücretsiz"}
              </span>
            </div>
            {isPremium && premiumUntil ? (
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3.5">
                <span className="text-sm text-gray-500 dark:text-gray-400">Premium Bitiş</span>
                <span
                  suppressHydrationWarning
                  className="text-right text-sm font-semibold text-gray-900 dark:text-white"
                >
                  {premiumUntil}
                  {daysRemaining !== null ? (
                    <span className="ml-1.5 inline-block rounded-lg bg-green-50 px-1.5 py-0.5 text-[10px] font-bold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      {Math.max(0, daysRemaining)} gün kaldı
                    </span>
                  ) : null}
                </span>
              </div>
            ) : null}
          </div>
        </div>
    </div>
  );
});

const DavetTab = memo(function DavetTab({ profile }: { profile: ProfilProfile }) {
  const [copied, setCopied] = useState(false);
  const code = profile.invite_code?.trim() || "--------";
  const inviteUrl = `https://seslidefter.vercel.app/register?ref=${encodeURIComponent(code)}`;
  const inviteCount = profile.invite_count ?? 0;

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const el = document.createElement("input");
      el.value = code;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    toast.success("Kod kopyalandı!");
    setTimeout(() => setCopied(false), 2500);
  }

  function shareWhatsApp() {
    const msg = encodeURIComponent(
      `📒 SesliDefter ile sesle gelir-gider takibi yapıyorum!\n\n` +
        `Benim davet kodumla kayıt olursan ikimiz de 30 gün premium kazanıyoruz 🎁\n\n` +
        `Davet Kodum: *${code}*\n` +
        `👉 ${inviteUrl}`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  }

  async function shareNative() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "SesliDefter Daveti",
          text: `Davet kodum: ${code}`,
          url: inviteUrl,
        });
        return;
      } catch {
        /* iptal */
      }
    }
    shareWhatsApp();
  }

  return (
    <div className="flex flex-col gap-4 md:col-span-2">
      <div className="rounded-xl bg-green-50 p-3 text-center dark:bg-green-900/20">
        <div className="text-2xl font-black text-green-700 dark:text-green-400">{inviteCount}</div>
        <div className="text-xs text-green-600 dark:text-green-500">Davet ettiğin kullanıcı</div>
      </div>

      <div className="mb-1 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-5 flex items-center gap-3.5">
          <span className="text-4xl">🎁</span>
          <div>
            <div className="text-lg font-extrabold text-gray-900 dark:text-white">Arkadaşını Davet Et</div>
            <div className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              Her davet için 30 gün premium kazan
            </div>
          </div>
        </div>

        <div className="mb-4 rounded-2xl border-2 border-dashed border-green-300 bg-green-50 p-4 text-center dark:border-green-700 dark:bg-green-900/20">
          <div className="mb-1 text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400">
            Davet Kodun
          </div>
          <div className="font-mono text-4xl font-black tracking-[8px] text-green-700 dark:text-green-400">
            {code}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => void copyCode()}
            className={cn(
              "col-span-2 mb-0.5 w-full rounded-xl py-3.5 text-base font-bold text-white transition-all",
              copied ? "bg-green-800" : "bg-green-700"
            )}
          >
            {copied ? "✅ Kopyalandı!" : "📋 Kodu Kopyala"}
          </button>
          <button
            type="button"
            onClick={shareWhatsApp}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 text-sm font-bold text-white"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            WhatsApp
          </button>
          <button
            type="button"
            onClick={() => void shareNative()}
            className="rounded-xl bg-gray-100 py-3 text-sm font-bold text-gray-700 dark:bg-gray-700 dark:text-white"
          >
            ↗️ Paylaş
          </button>
        </div>
      </div>

      <div className="mb-4 flex items-center rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex-1 text-center">
          <div className="text-3xl font-black text-green-700 dark:text-green-400">{inviteCount}</div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">Davet Ettiğin</div>
        </div>
        <div className="h-10 w-px bg-gray-200 dark:bg-gray-600" />
        <div className="flex-1 text-center">
          <div className="text-3xl font-black text-green-700 dark:text-green-400">{inviteCount * 30}</div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">Kazanılan Gün</div>
        </div>
        <div className="h-10 w-px bg-gray-200 dark:bg-gray-600" />
        <div className="flex-1 text-center">
          <div className="text-3xl font-black text-green-700 dark:text-green-400">30</div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">Gün / Davet</div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-3 text-sm font-bold text-gray-900 dark:text-white">Nasıl Çalışır?</div>
        {[
          { step: "1", text: "Davet kodunu arkadaşınla paylaş" },
          { step: "2", text: "Arkadaşın kod ile kayıt olsun" },
          { step: "3", text: "İkiniz de 30 gün premium kazan!" },
        ].map((s) => (
          <div
            key={s.step}
            className="flex items-center gap-3 border-b border-gray-100 py-2.5 last:border-0 dark:border-gray-700"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-700 text-xs font-black text-white">
              {s.step}
            </div>
            <span className="text-sm text-gray-700 dark:text-gray-300">{s.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
});

const AyarlarTab = memo(function AyarlarTab({ profile }: { profile: ProfilProfile }) {
  const { t } = useLanguage();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [legalModal, setLegalModal] = useState<string | null>(null);
  const [deleteStep, setDeleteStep] = useState<"idle" | "confirm" | "email_sent">("idle");
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    setTheme(readStoredTheme());
  }, []);

  async function requestAccountDeletion() {
    setDeleteLoading(true);
    try {
      const supabase = getBrowserClientSingleton();
      const { error } = await supabase.auth.signInWithOtp({
        email: profile.email,
        options: {
          emailRedirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/auth/delete-account?confirm=true`,
          shouldCreateUser: false,
        },
      });
      if (error) throw error;
      setDeleteStep("email_sent");
      toast.success("Onay bağlantısı e-postanıza gönderildi.");
    } catch (err: unknown) {
      toast.error("Hata: " + (err instanceof Error ? err.message : "Bilinmeyen"));
    } finally {
      setDeleteLoading(false);
    }
  }

  function toggleTheme(t: "light" | "dark") {
    setTheme(t);
    persistTheme(t);
  }

  const exportExcel = useCallback(async () => {
    const uid = profile.id;
    toast.loading("Excel hazırlanıyor…", { id: "xlsx" });
    try {
      const XLSX = await import("xlsx");
      const supabase = getBrowserClientSingleton();
      const { data, error } = await supabase
        .from("transactions")
        .select("*, contacts(name)")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });
      if (error) {
        errToast(error.message);
        toast.dismiss("xlsx");
        return;
      }
      const rows = (data ?? []).map((t: Record<string, unknown>) => {
        const contacts = t.contacts as { name?: string } | null | undefined;
        return {
          Tarih: t.date ? new Date(String(t.date) + "T12:00:00").toLocaleDateString("tr-TR") : "",
          Kategori: String(t.category ?? ""),
          "Alt Kategori": String(t.category_tag ?? ""),
          Açıklama: String(t.description ?? ""),
          Kişi: contacts?.name ?? "",
          Tutar: t.amount,
          "Kasa Bakiyesi": t.balance_after ?? "",
          Oluşturulma: t.created_at
            ? new Date(String(t.created_at)).toLocaleString("tr-TR")
            : "",
        };
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "İşlemler");
      XLSX.writeFile(wb, `seslidefter_${new Date().toISOString().split("T")[0]}.xlsx`);
      toast.success("Excel indirildi", { id: "xlsx" });
    } catch (e) {
      console.error(e);
      errToast("Dışa aktarma başarısız");
      toast.dismiss("xlsx");
    }
  }, [profile.id]);

  const legalBody =
    legalModal === "kvkk"
      ? KVKK_TEXT
      : legalModal === "privacy"
        ? PRIVACY_TEXT
        : legalModal === "terms"
          ? TERMS_TEXT
          : "";

  const legalTitle =
    legalModal === "kvkk"
      ? t("profile.kvkk")
      : legalModal === "privacy"
        ? t("profile.privacy")
        : legalModal === "terms"
          ? t("profile.terms")
          : "";

  return (
    <div className="flex flex-col gap-4 md:col-span-2">
      <div className="mb-1 overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-gray-100 bg-gray-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:bg-gray-700/50 dark:text-gray-400">
          🎨 {t("profile.theme")}
        </div>
        <div className="flex gap-2 p-4">
          <button
            type="button"
            onClick={() => toggleTheme("light")}
            className={cn(
              "flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all",
              theme === "light"
                ? "bg-green-700 text-white"
                : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-white"
            )}
          >
            {t("profile.light")}
          </button>
          <button
            type="button"
            onClick={() => toggleTheme("dark")}
            className={cn(
              "flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all",
              theme === "dark"
                ? "bg-green-700 text-white"
                : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-white"
            )}
          >
            {t("profile.dark")}
          </button>
        </div>
      </div>

      <div className="mb-1 overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-gray-100 bg-gray-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:bg-gray-700/50 dark:text-gray-400">
          🌍 {t("profile.language")}
        </div>
        <div className="p-4">
          <LanguageSelector />
        </div>
      </div>

      <div className="mb-1 overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-gray-100 bg-gray-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:bg-gray-700/50 dark:text-gray-400">
          🔒 {t("profile.securityPrivacy")}
        </div>
        <button
          type="button"
          onClick={() => setLegalModal("kvkk")}
          className="flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3.5 text-start text-sm text-gray-700 transition-all hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700/50"
        >
          <span>📄</span>
          <span className="flex-1">{t("profile.kvkk")}</span>
          <span className="text-gray-400">›</span>
        </button>
        <button
          type="button"
          onClick={() => setLegalModal("privacy")}
          className="flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3.5 text-start text-sm text-gray-700 transition-all hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700/50"
        >
          <span>🔐</span>
          <span className="flex-1">{t("profile.privacy")}</span>
          <span className="text-gray-400">›</span>
        </button>
        <button
          type="button"
          onClick={() => setLegalModal("terms")}
          className="flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3.5 text-start text-sm text-gray-700 transition-all hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700/50"
        >
          <span>📋</span>
          <span className="flex-1">{t("profile.terms")}</span>
          <span className="text-gray-400">›</span>
        </button>
        <button
          type="button"
          onClick={() => setDeleteStep("confirm")}
          className="flex w-full items-center gap-3 px-4 py-4 text-left text-red-500 transition-all hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <span>🗑️</span>
          <span className="flex-1 text-sm font-semibold">{t("profile.deleteAccount")}</span>
          <span className="text-xs text-red-400">{t("profile.deleteWarning")}</span>
        </button>
      </div>

      {deleteStep === "confirm" ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="mb-2 text-sm font-bold text-red-700 dark:text-red-400">🚨 Hesabınızı silmek üzeresiniz</p>
          <p className="mb-3 text-xs text-red-600 dark:text-red-400">
            Tüm verileriniz kalıcı olarak silinecek. Bu işlem geri alınamaz.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDeleteStep("idle")}
              className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 dark:border-gray-600"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={() => void requestAccountDeletion()}
              disabled={deleteLoading}
              className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {deleteLoading ? "⏳..." : "📧 Onay Gönder"}
            </button>
          </div>
        </div>
      ) : null}

      {deleteStep === "email_sent" ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-center dark:border-green-800 dark:bg-green-900/20">
          <p className="text-sm font-bold text-gray-900 dark:text-white">📬 Onay e-postası gönderildi</p>
          <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
            <strong>{profile.email}</strong> adresindeki bağlantıyı kullanın.
          </p>
          <button
            type="button"
            onClick={() => setDeleteStep("idle")}
            className="mt-3 text-xs font-semibold text-green-700 underline dark:text-green-400"
          >
            Kapat
          </button>
        </div>
      ) : null}

      <div className="mb-1 overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-gray-100 bg-gray-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:bg-gray-700/50 dark:text-gray-400">
          📊 {t("profile.myData")}
        </div>
        <button
          type="button"
          onClick={() => void exportExcel()}
          className="flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3.5 text-start text-sm text-gray-700 transition-all last:border-0 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700/50"
        >
          <span>📥</span>
          <span className="flex-1">{t("profile.downloadExcel")}</span>
          <span className="text-gray-400">›</span>
        </button>
      </div>

      <div className="mb-1 overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-gray-100 bg-gray-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:bg-gray-700/50 dark:text-gray-400">
          🍎 {t("profile.siriTitle")}
        </div>
        <div className="px-4 py-2.5">
          <p className="text-xs text-gray-600 dark:text-gray-400">{t("profile.siriDesc")}</p>
          {['"Hey Siri, SesliDefter aç"', '"Hey Siri, gider ekle"'].map((cmd) => (
            <div key={cmd} className="py-1 text-xs italic text-gray-500 dark:text-gray-400">
              {cmd}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => window.open("https://support.apple.com/tr-tr/guide/shortcuts/welcome/ios", "_blank")}
          className="flex w-full items-center gap-3 border-t border-gray-100 px-4 py-3.5 text-left text-sm text-gray-700 transition-all hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700/50"
        >
          <span>📱</span>
          <span className="flex-1">Siri Kısayolu Ekle</span>
          <span className="text-gray-400">›</span>
        </button>
      </div>

      {legalModal ? (
        <div
          className="fixed inset-0 z-[130] flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          onClick={() => setLegalModal(null)}
        >
          <div
            className="max-h-[80vh] w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-700">
              <h3 className="m-0 text-base font-bold text-gray-900 dark:text-white">{legalTitle}</h3>
              <button
                type="button"
                className="text-xl text-gray-500 dark:text-gray-400"
                onClick={() => setLegalModal(null)}
                aria-label={t("common.close")}
              >
                ✕
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-4">
              <p className="m-0 whitespace-pre-wrap text-sm leading-relaxed text-gray-800 dark:text-gray-200">
                {legalBody}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
});

function ProfilSkeleton() {
  const { t } = useLanguage();
  return (
    <PageShell title={t("profile.title")} contentClassName="pb-28 fade-in" titleClassName="hidden md:block">
      <div className="mx-auto max-w-xl px-4 py-5">
        <div className="mb-4 h-[100px] animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-700" />
        <div className="mb-4 h-[52px] animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
        <div className="h-[300px] animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-700" />
      </div>
    </PageShell>
  );
}
