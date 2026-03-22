"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import trJson from "@/locales/tr.json";

export type Language = "tr" | "en" | "ar";

type Messages = typeof trJson;

async function loadTranslations(lang: Language): Promise<Messages> {
  switch (lang) {
    case "tr":
      return trJson;
    case "en":
      return (await import("@/locales/en.json")).default as Messages;
    case "ar":
      return (await import("@/locales/ar.json")).default as Messages;
    default:
      return trJson;
  }
}

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  isRTL: boolean;
  dir: "ltr" | "rtl";
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("tr");
  const [translations, setTranslations] = useState<Messages>(trJson);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("sd-language") as Language | null;
    const lang =
      saved && ["tr", "en", "ar"].includes(saved) ? saved : "tr";

    void (async () => {
      const trans = await loadTranslations(lang);
      setTranslations(trans);
      setLanguageState(lang);
      localStorage.setItem("sd-language", lang);
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    })();
  }, []);

  function setLanguage(lang: Language) {
    void (async () => {
      const trans = await loadTranslations(lang);
      setTranslations(trans);
      setLanguageState(lang);
      if (typeof window !== "undefined") {
        localStorage.setItem("sd-language", lang);
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
      }
    })();
  }

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const keys = key.split(".");
      let value: unknown = translations as unknown as Record<string, unknown>;
      for (const k of keys) {
        if (value === null || typeof value !== "object") {
          return key;
        }
        value = (value as Record<string, unknown>)[k];
        if (value === undefined) return key;
      }
      if (typeof value !== "string") return key;
      if (params) {
        return Object.entries(params).reduce(
          (str, [k, v]) => str.replaceAll(`{${k}}`, String(v)),
          value
        );
      }
      return value;
    },
    [translations]
  );

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        isRTL: language === "ar",
        dir: language === "ar" ? "rtl" : "ltr",
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
