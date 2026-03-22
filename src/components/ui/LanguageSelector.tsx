"use client";

import { useLanguage, type Language } from "@/contexts/LanguageContext";

const LANGUAGES: {
  code: Language;
  label: string;
  flag: string;
  nativeLabel: string;
}[] = [
  { code: "tr", label: "Türkçe", flag: "🇹🇷", nativeLabel: "Türkçe" },
  { code: "en", label: "English", flag: "🇬🇧", nativeLabel: "English" },
  { code: "ar", label: "Arapça", flag: "🇸🇦", nativeLabel: "العربية" },
];

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="space-y-2">
      {LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          type="button"
          onClick={() => setLanguage(lang.code)}
          className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3.5 transition-all ${
            language === lang.code
              ? "border-green-600 bg-green-50 dark:bg-green-900/20"
              : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
          }`}
        >
          <span className="text-2xl">{lang.flag}</span>
          <div className="min-w-0 flex-1 text-start">
            <div
              className={`text-sm font-semibold ${
                language === lang.code
                  ? "text-green-700 dark:text-green-400"
                  : "text-gray-700 dark:text-gray-300"
              }`}
            >
              {lang.nativeLabel}
            </div>
            {lang.code !== "tr" ? (
              <div className="text-xs text-gray-400">{lang.label}</div>
            ) : null}
          </div>
          {language === lang.code ? (
            <span className="font-bold text-green-600">✓</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

export function LanguageSelectorCompact() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex gap-1">
      {LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          type="button"
          onClick={() => setLanguage(lang.code)}
          title={lang.nativeLabel}
          className={`h-8 w-8 rounded-lg text-lg transition-all ${
            language === lang.code
              ? "scale-110 bg-white/30 ring-2 ring-white/60"
              : "opacity-60 hover:bg-white/20 hover:opacity-90"
          }`}
        >
          {lang.flag}
        </button>
      ))}
    </div>
  );
}
