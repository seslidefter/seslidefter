import { redirect } from "next/navigation";

/** Eski bağlantılar için yeni şifre sayfasına yönlendir */
export default function RecoveryPasswordPage() {
  redirect("/auth/reset-password");
}
