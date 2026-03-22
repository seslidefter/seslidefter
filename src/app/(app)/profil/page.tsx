"use client";

import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { PageShell } from "@/components/layout/PageShell";
import { persistTheme, readStoredTheme } from "@/components/providers/theme-provider";
import { errToast } from "@/lib/sd-toast";
import { getOrCreateInviteCode } from "@/lib/invite-code";
import { getBrowserClientSingleton } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";

type TabType = "hesap" | "plan" | "davet" | "ayarlar";

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
  const router = useRouter();
  const [profile, setProfile] = useState<ProfilProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("hesap");

  useEffect(() => {
    const h = window.location.hash.replace(/^#/, "") as TabType;
    if (h === "plan" || h === "davet" || h === "ayarlar" || h === "hesap") setActiveTab(h);
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

  const onTab = (id: TabType) => {
    setActiveTab(id);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${id}`);
    }
  };

  if (loading || !profile) return <ProfilSkeleton />;

  const isPremium = profile.premium_until
    ? new Date(String(profile.premium_until)) > new Date()
    : profile.plan === "premium";

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: "hesap", label: "Hesap", icon: "👤" },
    { id: "plan", label: "Plan", icon: "⭐" },
    { id: "davet", label: "Davet", icon: "🎁" },
    { id: "ayarlar", label: "Ayarlar", icon: "⚙️" },
  ];

  const displayName = profileDisplayName(profile);
  const initials = profileInitials(displayName);

  return (
    <PageShell title="Profil" contentClassName="pb-28 fade-in" titleClassName="hidden md:block">
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

        <div
          className="mb-4 flex w-full gap-1 rounded-2xl border border-gray-100 bg-white p-1 dark:border-gray-700 dark:bg-gray-800"
          role="tablist"
          aria-label="Profil sekmeleri"
        >
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onTab(tab.id)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2.5 text-xs font-semibold transition-all",
                  active
                    ? "bg-green-700 text-white"
                    : "text-gray-500 dark:text-gray-400"
                )}
              >
                <span className="text-lg" aria-hidden>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="profil-tab-content animate-fadeIn" role="tabpanel">
          {activeTab === "hesap" && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <HesapTab profile={profile} isPremium={isPremium} />
            </div>
          )}
          {activeTab === "plan" && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <PlanTab isPremium={isPremium} />
            </div>
          )}
          {activeTab === "davet" && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <DavetTab profile={profile} />
            </div>
          )}
          {activeTab === "ayarlar" && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <AyarlarTab profile={profile} />
            </div>
          )}
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
  const signOut = useAuthStore((s) => s.signOut);
  const [deleteStep, setDeleteStep] = useState<"idle" | "confirm" | "email_sent">("idle");
  const [deleteLoading, setDeleteLoading] = useState(false);

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
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{joinDate}</span>
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
                <span className="text-right text-sm font-semibold text-gray-900 dark:text-white">
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

        <div className="flex flex-col gap-3.5">
          <div className="overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-700 dark:bg-gray-800">
            <div className="border-b border-red-100 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-900/20">
              <p className="text-xs font-bold uppercase tracking-wide text-red-600 dark:text-red-400">
                ⚠️ Tehlikeli Bölge
              </p>
            </div>

            {deleteStep === "idle" ? (
              <div className="p-4">
                <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                  Hesabınızı silmek tüm verilerinizi kalıcı olarak siler. Bu işlem geri alınamaz.
                </p>
                <button
                  type="button"
                  onClick={() => setDeleteStep("confirm")}
                  className="w-full rounded-xl border-2 border-red-300 py-3 text-sm font-semibold text-red-600 transition-all hover:bg-red-50 dark:border-red-700 dark:hover:bg-red-950/30"
                >
                  Hesabımı Sil
                </button>
              </div>
            ) : null}

            {deleteStep === "confirm" ? (
              <div className="p-4">
                <div className="mb-4 rounded-xl bg-red-50 p-4 dark:bg-red-900/20">
                  <p className="mb-2 text-sm font-bold text-red-700 dark:text-red-400">🚨 Emin misiniz?</p>
                  <ul className="space-y-1 text-xs text-red-600 dark:text-red-400">
                    <li>• Tüm işlem kayıtlarınız silinir</li>
                    <li>• Alacak/verecek verileriniz silinir</li>
                    <li>• Ödeme planlarınız silinir</li>
                    <li>• Bu işlem GERİ ALINAMAZ</li>
                  </ul>
                </div>
                <p className="mb-4 text-center text-sm text-gray-600 dark:text-gray-400">
                  Onaylamak için <strong>{profile.email}</strong> adresine onay bağlantısı göndereceğiz.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDeleteStep("idle")}
                    className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-600 dark:border-gray-600 dark:text-gray-400"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="button"
                    onClick={() => void requestAccountDeletion()}
                    disabled={deleteLoading}
                    className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-bold text-white disabled:opacity-50"
                  >
                    {deleteLoading ? "⏳..." : "📧 Onay Gönder"}
                  </button>
                </div>
              </div>
            ) : null}

            {deleteStep === "email_sent" ? (
              <div className="p-4 text-center">
                <div className="mb-3 text-4xl">📬</div>
                <p className="mb-2 text-sm font-bold text-gray-900 dark:text-white">Onay E-postası Gönderildi</p>
                <p className="mb-4 text-xs text-gray-500">
                  <strong>{profile.email}</strong> adresine gönderilen bağlantıya tıklayarak silme işlemini
                  onaylayın.
                </p>
                <button
                  type="button"
                  onClick={() => setDeleteStep("idle")}
                  className="text-xs font-semibold text-green-600 underline dark:text-green-400"
                >
                  Vazgeç
                </button>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => {
              void (async () => {
                const sb = getBrowserClientSingleton();
                await sb.auth.signOut();
                await signOut();
                window.location.href = "/login";
              })();
            }}
            className="w-full rounded-xl border-2 border-red-400 py-3.5 text-sm font-bold text-red-500 transition-all hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            🚪 Çıkış Yap
          </button>
        </div>
    </div>
  );
});

const PlanTab = memo(function PlanTab({ isPremium }: { isPremium: boolean }) {
  const freeFeatures = [
    { ok: true, text: "Aylık 50 işlem kaydı" },
    { ok: true, text: "10 kişi takibi" },
    { ok: true, text: "3 ödeme planı" },
    { ok: true, text: "Temel raporlar" },
    { ok: true, text: "Sesli kayıt (günlük 5)" },
    { ok: false, text: "Sınırsız işlem" },
    { ok: false, text: "AI Finansal Asistan" },
    { ok: false, text: "Excel / PDF export" },
    { ok: false, text: "Fiş & fatura tarama" },
    { ok: false, text: "WhatsApp hatırlatma" },
    { ok: false, text: "Tekrarlayan işlemler" },
    { ok: false, text: "Akıllı tahminler" },
  ];

  const premiumFeatures = [
    { icon: "♾️", text: "Sınırsız işlem kaydı" },
    { icon: "👥", text: "Sınırsız kişi takibi" },
    { icon: "💳", text: "Sınırsız ödeme planı" },
    { icon: "🤖", text: "AI Finansal Asistan" },
    { icon: "🧠", text: "Akıllı harcama tahminleri" },
    { icon: "📊", text: "Gelişmiş raporlar" },
    { icon: "📥", text: "Excel & PDF export" },
    { icon: "📷", text: "Fiş & fatura tarama (OCR)" },
    { icon: "📱", text: "WhatsApp borç hatırlatma" },
    { icon: "🔄", text: "Tekrarlayan işlemler" },
    { icon: "🎙️", text: "Sınırsız sesli kayıt" },
    { icon: "🔊", text: "Sesli finansal asistan" },
    { icon: "📅", text: "Ödeme bildirimleri" },
    { icon: "🔒", text: "Öncelikli destek" },
  ];

  if (isPremium) {
    return (
      <div className="flex flex-col gap-3.5 md:col-span-2">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-900 via-green-700 to-green-600 p-5 text-white">
          <div className="mb-4 flex items-center gap-3">
            <span className="text-4xl">⭐</span>
            <div>
              <div className="text-xl font-black">Premium Üye</div>
              <div className="mt-0.5 text-sm opacity-80">Tüm özellikler aktif</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-2">
            {premiumFeatures.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 rounded-lg bg-white/15 px-2 py-1.5 text-xs"
              >
                <span>{f.icon}</span>
                <span>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 md:col-span-2">
      <div className="mb-1 overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-gray-100 bg-gray-50 px-4 py-3 text-sm font-bold dark:border-gray-700 dark:bg-gray-700/50">
          🆓 Mevcut Plan: Ücretsiz
        </div>
        <div className="grid grid-cols-2 gap-2 p-4">
          {freeFeatures.map((f, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center gap-2 text-xs",
                !f.ok ? "text-gray-400" : "text-gray-700 dark:text-gray-300"
              )}
            >
              <span>{f.ok ? "✅" : "❌"}</span>
              <span>{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-900 via-green-700 to-green-600 p-5 text-white">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
        <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/[0.08]" />

        <div className="relative">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <div className="text-xl font-black">⭐ Premium&apos;a Geç</div>
              <div className="mt-1 text-sm opacity-80">Tüm özelliklerin kilidini aç</div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-3xl font-black">
                ₺99<span className="text-base font-normal opacity-75">/ay</span>
              </div>
              <div className="mt-1 flex items-center justify-end gap-1 text-xs opacity-70">
                <span className="rounded-lg bg-orange-400 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  %33
                </span>
                ₺799/yıl
              </div>
            </div>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-2">
            {premiumFeatures.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 rounded-lg bg-white/15 px-2 py-1.5 text-xs"
              >
                <span>{f.icon}</span>
                <span>{f.text}</span>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="mb-2 w-full rounded-xl bg-white py-4 text-base font-black text-green-800 shadow-lg"
            onClick={() => toast("Ödeme entegrasyonu yakında — bizi takip edin.", { icon: "⭐" })}
          >
            ₺799/yıl ile Başla — En İyi Değer 🏆
          </button>
          <button
            type="button"
            className="mb-3 w-full rounded-xl border border-white/30 bg-white/15 py-3 text-sm font-bold text-white"
            onClick={() => toast("Ödeme entegrasyonu yakında — bizi takip edin.", { icon: "⭐" })}
          >
            ₺99/ay ile Başla
          </button>
          <p className="mb-2 text-center text-xs opacity-60">🔒 İstediğin zaman iptal et • Güvenli ödeme</p>
          <div className="rounded-xl bg-white/10 p-3 text-xs leading-relaxed">
            💡 <strong>Ücretsiz dene:</strong> Davet kodunu paylaş, her davet için 30 gün kazan!
          </div>
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
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [legalModal, setLegalModal] = useState<string | null>(null);

  useEffect(() => {
    setTheme(readStoredTheme());
  }, []);

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

  const legalBody = (() => {
    if (legalModal?.includes("KVKK")) return KVKK_TEXT;
    if (legalModal?.includes("Gizlilik")) return PRIVACY_TEXT;
    return TERMS_TEXT;
  })();

  return (
    <div className="flex flex-col gap-4 md:col-span-2">
      <div className="mb-1 overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-gray-100 bg-gray-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:bg-gray-700/50 dark:text-gray-400">
          🎨 Tema
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
            ☀️ Açık
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
            🌙 Koyu
          </button>
        </div>
      </div>

      <div className="mb-1 overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-gray-100 bg-gray-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:bg-gray-700/50 dark:text-gray-400">
          📊 Verilerim
        </div>
        <button
          type="button"
          onClick={() => void exportExcel()}
          className="flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3.5 text-left text-sm text-gray-700 transition-all last:border-0 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700/50"
        >
          <span>📥</span>
          <span className="flex-1">Excel olarak indir</span>
          <span className="text-gray-400">›</span>
        </button>
      </div>

      <div className="mb-1 overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-gray-100 bg-gray-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:bg-gray-700/50 dark:text-gray-400">
          🍎 Siri Kısayolları
        </div>
        <div className="px-4 py-2.5">
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

      <div className="mb-1 overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-gray-100 bg-gray-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:bg-gray-700/50 dark:text-gray-400">
          ⚖️ Yasal
        </div>
        {["Gizlilik Politikası", "KVKK Aydınlatma Metni", "Kullanım Koşulları"].map((item, i, arr) => (
          <button
            key={item}
            type="button"
            onClick={() => setLegalModal(item)}
            className={cn(
              "flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3.5 text-left text-sm text-gray-700 transition-all hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700/50",
              i === arr.length - 1 && "border-b-0"
            )}
          >
            <span>📄</span>
            <span className="flex-1">{item}</span>
            <span className="text-gray-400">›</span>
          </button>
        ))}
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
              <h3 className="m-0 text-base font-bold text-gray-900 dark:text-white">{legalModal}</h3>
              <button
                type="button"
                className="text-xl text-gray-500 dark:text-gray-400"
                onClick={() => setLegalModal(null)}
                aria-label="Kapat"
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
  return (
    <PageShell title="Profil" contentClassName="pb-28 fade-in" titleClassName="hidden md:block">
      <div className="mx-auto max-w-xl px-4 py-5">
        <div className="mb-4 h-[100px] animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-700" />
        <div className="mb-4 h-[52px] animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
        <div className="h-[300px] animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-700" />
      </div>
    </PageShell>
  );
}
