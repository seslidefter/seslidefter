"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { analyzeVoiceTranscript } from "@/lib/voice-transcript";
import { cn } from "@/lib/utils";
import type { ContactRow, TransactionCategory } from "@/types/database";
import { useDashboardVoiceFabStore } from "@/store/dashboardVoiceFabStore";
import { useTransactionStore } from "@/store/transactionStore";

const CAT_TOAST: Record<TransactionCategory, string> = {
  gelir: "Gelir",
  gider: "Gider",
  alacak: "Alacak",
  verecek: "Borç",
};

function formatAmountTry(n: number) {
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

function resolveContactId(contacts: ContactRow[], name: string | null): string | null {
  if (!name?.trim()) return null;
  const n = name.trim().toLocaleLowerCase("tr-TR");
  const exact = contacts.find((c) => c.name.trim().toLocaleLowerCase("tr-TR") === n);
  if (exact) return exact.id;
  const first = name.trim().split(/\s+/)[0]?.toLocaleLowerCase("tr-TR");
  if (!first) return null;
  const partial = contacts.find((c) =>
    c.name.trim().toLocaleLowerCase("tr-TR").startsWith(first)
  );
  return partial?.id ?? null;
}

export function DashboardVoiceCard() {
  const barRef = useRef<HTMLDivElement>(null);
  const setRegistrar = useDashboardVoiceFabStore((s) => s.setRegistrar);
  const contacts = useTransactionStore((s) => s.contacts);
  const addTransaction = useTransactionStore((s) => s.addTransaction);

  const [isRecording, setIsRecording] = useState(false);
  const [liveLine, setLiveLine] = useState("");
  const [timerSec, setTimerSec] = useState(0);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manualStopRef = useRef(false);
  const finalBufRef = useRef("");

  const clearSilence = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const resetVoice = useCallback(() => {
    setLiveLine("");
    finalBufRef.current = "";
    setTimerSec(0);
  }, []);

  useEffect(() => {
    if (!isRecording) {
      setTimerSec(0);
      return;
    }
    const id = window.setInterval(() => setTimerSec((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [isRecording]);

  const trySaveText = useCallback(
    async (text: string) => {
      const trimmed = text.replace(/\s+/g, " ").trim();
      if (!trimmed) return;

      const parsed = analyzeVoiceTranscript(trimmed);
      console.log("Ses analizi sonucu:", parsed);
      if (parsed.amount == null || parsed.amount <= 0) {
        toast.error('❌ Tutar anlaşılamadı. "500 lira gider" gibi söyleyin.');
        resetVoice();
        return;
      }
      if (parsed.amount > 1_000_000) {
        toast.error("❌ Tutar çok büyük görünüyor. Tekrar deneyin.");
        resetVoice();
        return;
      }

      const category: TransactionCategory = parsed.category ?? "gider";
      const contact_id = resolveContactId(contacts, parsed.contactName);

      const { error } = await addTransaction({
        category,
        amount: parsed.amount,
        description: trimmed,
        transcript: trimmed,
        category_tag: parsed.tag,
        contact_id,
        is_paid: true,
        recurring: "none",
      });

      if (error) {
        console.error("[DashboardVoiceCard] add", error);
        toast.error(`❌ Kayıt hatası: ${error}`);
        resetVoice();
        return;
      }

      toast.success(`✅ ${CAT_TOAST[category]}: ₺${formatAmountTry(parsed.amount)}`);
      resetVoice();
    },
    [addTransaction, contacts, resetVoice]
  );

  const stopInternal = useCallback(() => {
    clearSilence();
    try {
      recognitionRef.current?.stop();
    } catch (e) {
      console.error("[voice] stop", e);
    }
  }, [clearSilence]);

  const onRecognitionEnd = useCallback(async () => {
    recognitionRef.current = null;
    const text = finalBufRef.current.replace(/\s+/g, " ").trim();
    setIsRecording(false);
    setLiveLine("");
    clearSilence();

    if (text) {
      await trySaveText(text);
    }

    finalBufRef.current = "";
    manualStopRef.current = false;
  }, [clearSilence, trySaveText]);

  const startRecognition = useCallback(() => {
    void (async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast.error("Mikrofon izni gerekli. Tarayıcı ayarlarından izin verin.");
      return;
    }

    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) {
      toast.error("Tarayıcınız ses tanımayı desteklemiyor. Chrome veya Safari kullanın.");
      return;
    }

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    manualStopRef.current = false;
    finalBufRef.current = "";
    setLiveLine("");
    setTimerSec(0);
    setIsRecording(true);

    const rec = new Ctor();
    rec.continuous = !isIOS;
    rec.interimResults = true;
    rec.lang = "tr-TR";
    rec.maxAlternatives = 1;
    recognitionRef.current = rec;

    rec.onresult = (event: SpeechRecognitionEvent) => {
      clearSilence();

      let interim = "";
      let finalText = finalBufRef.current;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        const piece = r[0]?.transcript ?? "";
        if (r.isFinal) finalText = `${finalText} ${piece}`.trim();
        else interim = `${interim} ${piece}`.trim();
      }

      finalBufRef.current = finalText;
      const display = [finalText, interim].filter(Boolean).join(" ").trim();
      setLiveLine(display || "…");

      if (!isIOS) {
        silenceTimerRef.current = setTimeout(() => {
          try {
            rec.stop();
          } catch (e) {
            console.error("[voice] silence stop", e);
          }
        }, 2000);
      }
    };

    rec.onerror = (ev: SpeechRecognitionErrorEvent) => {
      console.error("[voice] recognition error", ev.error);
      switch (ev.error) {
        case "no-speech":
          toast.error("Ses algılanamadı. Tekrar deneyin.");
          break;
        case "audio-capture":
          toast.error("Mikrofon erişilemiyor. İzin verin.");
          break;
        case "not-allowed":
          toast.error("Mikrofon izni reddedildi. Ayarlardan izin verin.");
          break;
        case "network":
          toast.error("İnternet bağlantısı gerekli.");
          break;
        case "language-not-supported":
          rec.lang = "en-US";
          try {
            rec.start();
          } catch (e) {
            console.error("[voice] lang fallback start", e);
            toast.error("Ses tanıma başlatılamadı.");
            setIsRecording(false);
          }
          return;
        default:
          toast.error(`Ses hatası: ${ev.error}`);
      }
    };

    rec.onend = () => {
      void onRecognitionEnd();
    };

    try {
      rec.start();
    } catch (e) {
      console.error("[voice] start", e);
      toast.error("Kayıt başlatılamadı. Tekrar deneyin.");
      setIsRecording(false);
    }
    })();
  }, [clearSilence, onRecognitionEnd]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      manualStopRef.current = true;
      stopInternal();
      return;
    }
    startRecognition();
  }, [isRecording, startRecognition, stopInternal]);

  const focusAndStart = useCallback(() => {
    barRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    barRef.current?.classList.add("sd-voice-card-pulse");
    window.setTimeout(() => barRef.current?.classList.remove("sd-voice-card-pulse"), 2000);
    window.setTimeout(() => startRecognition(), 350);
  }, [startRecognition]);

  useEffect(() => {
    setRegistrar({ focusAndStart });
    return () => setRegistrar(null);
  }, [focusAndStart, setRegistrar]);

  const transcript = isRecording ? (liveLine || "Dinleniyor...") : "";

  return (
    <div className="fade-in space-y-3">
      <div
        ref={barRef}
        id="dashboard-voice-card"
        className={cn(
          "voice-bar",
          isRecording && "ring-2 ring-[var(--sd-gider)] ring-offset-2 ring-offset-[var(--bg-primary)]"
        )}
      >
        <button
          type="button"
          className="voice-btn"
          onClick={(e) => {
            e.stopPropagation();
            toggleRecording();
          }}
          aria-label={isRecording ? "Durdur ve kaydet" : "Dinlemeyi başlat"}
        >
          {isRecording ? "🔴" : "🎙️"}
        </button>
        <button
          type="button"
          className="voice-text min-w-0 flex-1 text-left"
          onClick={() => toggleRecording()}
        >
          {isRecording ? transcript : "Sesle kayıt ekle…"}
        </button>
        {isRecording ? (
          <span className="voice-timer shrink-0 tabular-nums text-sm font-bold text-[var(--sd-gider)]">
            {timerSec}s
          </span>
        ) : null}
      </div>
    </div>
  );
}
