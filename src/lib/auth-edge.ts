import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Oturum gerektirmeyen yollar */
const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/recovery-password",
  "/auth/callback",
  "/auth/reset-password",
  "/auth/delete-account",
];

/** Sadece bu önekler korunur; diğerleri (ör. `/`) doğrudan geçer */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/islemler",
  "/alacak-verecek",
  "/odemeler",
  "/rapor",
  "/profil",
  "/takvim",
  "/api/ai",
  "/generate-icons",
];

const AUTH_LANDING = ["/login", "/register"];

function isPublicPath(path: string) {
  return PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
}

function isProtectedPath(path: string) {
  return PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

function isAuthLanding(path: string) {
  return AUTH_LANDING.some((p) => path === p || path.startsWith(`${p}/`));
}

export async function runAuthEdge(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (path.startsWith("/_next") || path.startsWith("/api/health")) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isPublicPath(path)) {
    return supabaseResponse;
  }

  if (isAuthLanding(path)) {
    if (user) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  if (path.startsWith("/api/") && !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isProtectedPath(path) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", path);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const authEdgeMatcher = [
  "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
];
