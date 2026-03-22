import { createBrowserClient } from "@supabase/ssr";

let browserSingleton: ReturnType<typeof createBrowserClient> | null = null;

function getOrCreateBrowserClient(): ReturnType<typeof createBrowserClient> {
  if (!browserSingleton) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    }
    browserSingleton = createBrowserClient(url, key);
  }
  return browserSingleton;
}

/** Tek tarayıcı istemcisi (singleton) */
export function getSupabaseClient() {
  return getOrCreateBrowserClient();
}

export function createClient() {
  return getOrCreateBrowserClient();
}

/** Geriye dönük uyumluluk */
export function getBrowserClientSingleton() {
  return getOrCreateBrowserClient();
}
