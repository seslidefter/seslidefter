"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED_QUESTIONS = [
  "Bu ay neden çok harcadım?",
  "En çok neye para harcıyorum?",
  "Tasarruf önerilerin neler?",
  "Alacaklarımın durumu nedir?",
  "Kasa bakiyem ne kadar?",
];

export function AIAssistant() {
  const { checkAccess } = useFeatureAccess();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "👋 Merhaba! Ben SesliDefter yerel asistanıyım. Verilerinize göre özet ve öneriler sunarım (ücretli dış AI kullanılmaz).",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    const t = text.trim();
    if (!t || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: t }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: t }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.error ?? "Bir hata oluştu." },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.reply ?? "Yanıt alınamadı." },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "❌ Bağlantı hatası. Lütfen tekrar deneyin." },
      ]);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  function startVoiceInput() {
    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) return;

    const r = new SR();
    r.lang = "tr-TR";
    r.interimResults = false;
    r.onresult = (e: SpeechRecognitionEvent) => {
      const text = e.results[0]?.[0]?.transcript ?? "";
      if (text) void sendMessage(text);
    };
    r.onerror = () => setIsListening(false);
    r.onend = () => setIsListening(false);
    r.start();
    setIsListening(true);
    recognitionRef.current = r;
  }

  function speakResponse(text: string) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "tr-TR";
    utterance.rate = 0.9;
    const voices = window.speechSynthesis.getVoices();
    const tr = voices.find((v) => v.lang.startsWith("tr"));
    if (tr) utterance.voice = tr;
    window.speechSynthesis.speak(utterance);
  }

  useEffect(() => {
    const loadVoices = () => window.speechSynthesis.getVoices();
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (!checkAccess("aiAssistant")) return;
          setIsOpen(true);
        }}
        className="ai-fab"
        title="AI Asistan"
        aria-label="AI Asistan"
      >
        🤖
      </button>

      {isOpen ? (
        <div className="ai-panel" role="dialog" aria-label="AI Asistan">
          <div className="ai-header">
            <div className="ai-header-info">
              <span className="ai-avatar" aria-hidden>
                🤖
              </span>
              <div>
                <div className="ai-name">Yerel asistan</div>
                <div className="ai-status">● Verilerinize göre</div>
              </div>
            </div>
            <button type="button" onClick={() => setIsOpen(false)} className="ai-close" aria-label="Kapat">
              ✕
            </button>
          </div>

          {messages.length === 1 ? (
            <div className="ai-suggestions">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button key={q} type="button" onClick={() => void sendMessage(q)} className="ai-suggestion">
                  {q}
                </button>
              ))}
            </div>
          ) : null}

          <div className="ai-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`ai-msg ${msg.role}`}>
                <div className="ai-msg-bubble">
                  <span className="whitespace-pre-wrap">{msg.content}</span>
                  {msg.role === "assistant" ? (
                    <button
                      type="button"
                      onClick={() => speakResponse(msg.content)}
                      className="ai-speak-btn"
                      title="Sesli oku"
                    >
                      🔊
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
            {loading ? (
              <div className="ai-msg assistant">
                <div className="ai-msg-bubble ai-typing" aria-hidden>
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            ) : null}
            <div ref={messagesEndRef} />
          </div>

          <div className="ai-input-area">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void sendMessage(input)}
              placeholder="Sorunuzu yazın veya sesle sorun..."
              className="ai-input"
            />
            <button
              type="button"
              onClick={startVoiceInput}
              className={`ai-voice-btn ${isListening ? "listening" : ""}`}
              aria-label="Sesle sor"
            >
              🎙️
            </button>
            <button
              type="button"
              onClick={() => void sendMessage(input)}
              disabled={loading || !input.trim()}
              className="ai-send-btn"
              aria-label="Gönder"
            >
              ➤
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
