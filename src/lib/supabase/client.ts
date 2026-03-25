import { createBrowserClient } from "@supabase/ssr";

let browserSingleton: ReturnType<typeof createBrowserClient> | null = null;

function getEnvClients() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return { url, key };
}

/** Tarayıcıda tek istemci; sunucuda her çağrıda yeni (RSC / route uyumu). */
export function getSupabaseClient() {
  if (typeof window === "undefined") {
    const { url, key } = getEnvClients();
    return createBrowserClient(url, key);
  }
  if (!browserSingleton) {
    const { url, key } = getEnvClients();
    browserSingleton = createBrowserClient(url, key);
  }
  return browserSingleton;
}

export function createClient() {
  return getSupabaseClient();
}

/** Geriye dönük uyumluluk */
export function getBrowserClientSingleton() {
  return getSupabaseClient();
}
