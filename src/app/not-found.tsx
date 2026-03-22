import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-4xl">🔍</p>
      <h1 className="sd-heading text-xl">Sayfa bulunamadı</h1>
      <Link
        href="/dashboard"
        className="sd-btn-primary inline-flex min-h-[52px] items-center justify-center rounded-xl px-8 text-sm font-bold"
      >
        Panele dön
      </Link>
    </div>
  );
}
