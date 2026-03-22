/** Next.js 16+: auth kontrolü `proxy.ts` üzerinden. Matcher statik olmalı (Turbopack). */
import { type NextRequest } from "next/server";
import { runAuthEdge } from "@/lib/auth-edge";

export default async function proxy(request: NextRequest) {
  return runAuthEdge(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
