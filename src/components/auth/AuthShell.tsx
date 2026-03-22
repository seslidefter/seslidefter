import Link from "next/link";
import type { ReactNode } from "react";

interface AuthShellProps {
  children: ReactNode;
  activeTab: "login" | "register";
}

export function AuthShell({ children, activeTab }: AuthShellProps) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--bg-primary)]">
      <div className="sd-gradient flex min-h-[45vh] flex-col items-center justify-center px-6 pb-8 pt-[max(2rem,env(safe-area-inset-top))] text-center text-white">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-4xl backdrop-blur-sm">
          📒
        </div>
        <h1 className="sd-heading text-3xl tracking-tight">SesliDefter</h1>
        <p className="mt-2 max-w-xs text-sm font-semibold text-white/90">Konuş, kaydet.</p>
      </div>

      <div
        className="relative z-10 -mt-6 flex flex-1 flex-col rounded-t-3xl px-5 pb-10 pt-6 shadow-[var(--shadow)]"
        style={{ background: "var(--bg-card)" }}
      >
        <div
          className="mx-auto mb-6 flex w-full max-w-md rounded-full border p-1"
          style={{
            borderColor: "var(--border-color)",
            background: "var(--bg-primary)",
          }}
        >
          <Link
            href="/login"
            className={[
              "flex-1 rounded-full py-3 text-center text-sm font-bold transition-all duration-200",
              activeTab === "login"
                ? "bg-[var(--sd-primary)] text-white shadow-md"
                : "text-[var(--text-secondary)]",
            ].join(" ")}
          >
            Giriş Yap
          </Link>
          <Link
            href="/register"
            className={[
              "flex-1 rounded-full py-3 text-center text-sm font-bold transition-all duration-200",
              activeTab === "register"
                ? "bg-[var(--sd-primary)] text-white shadow-md"
                : "text-[var(--text-secondary)]",
            ].join(" ")}
          >
            Kayıt Ol
          </Link>
        </div>
        <div className="mx-auto w-full max-w-md flex-1">{children}</div>
      </div>
    </div>
  );
}
