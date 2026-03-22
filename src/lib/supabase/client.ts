import { createBrowserClient } from "@supabase/ssr";

let browserSingleton: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return createBrowserClient(url, key);
}

/** Tek tarayıcı istemcisi — profil vb. yerlerde her render’da yeni client oluşturmayı önler. */
export function getBrowserClientSingleton(): ReturnType<typeof createBrowserClient> {
  if (!browserSingleton) {
    browserSingleton = createClient();
  }
  return browserSingleton;
}
