"use client";

import { useRef, useState } from "react";
import Tesseract from "tesseract.js";

export interface OCRResult {
  amount: number | null;
  date: string;
  description: string;
  category: "gider";
  categoryTag: string;
}

interface Props {
  onResult: (result: OCRResult) => void;
}

function parseReceiptText(text: string): OCRResult {
  const lower = text.toLowerCase();

  const nums: number[] = [];
  for (const m of text.matchAll(/(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/g)) {
    const raw = m[1]!.replace(/\./g, "").replace(",", ".");
    const n = parseFloat(raw);
    if (!Number.isNaN(n) && n > 0 && n < 500_000) nums.push(n);
  }
  const amount = nums.length > 0 ? Math.max(...nums) : null;

  const dateMatch = text.match(/(\d{2})[./](\d{2})[./](\d{4})/);
  const date = dateMatch
    ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`
    : new Date().toISOString().slice(0, 10);

  let categoryTag = "Diğer";
  if (/migros|bim|a101|şok|market|bakkal|carrefour/.test(lower)) categoryTag = "Market";
  else if (/benzin|opet|shell|bp|akaryakıt|petrol/.test(lower)) categoryTag = "Ulaşım";
  else if (/elektrik|doğalgaz|su|internet|fatura/.test(lower)) categoryTag = "Fatura";
  else if (/restoran|kafe|kahve|yemek|burger|pizza/.test(lower)) categoryTag = "Yemek";

  return {
    amount,
    date,
    description: `${categoryTag} — fiş`,
    category: "gider",
    categoryTag,
  };
}

export function ReceiptScanner({ onResult }: Props) {
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setScanning(true);
    setProgress(0);

    const reader = new FileReader();
    reader.onload = (e) => setPreview((e.target?.result as string) ?? null);
    reader.readAsDataURL(file);

    try {
      const result = await Tesseract.recognize(file, "tur", {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setProgress(Math.round((m.progress ?? 0) * 100));
          }
        },
      });

      const parsed = parseReceiptText(result.data.text);
      onResult(parsed);
    } catch (err) {
      console.error("OCR", err);
    } finally {
      setScanning(false);
      setProgress(0);
    }
  }

  return (
    <div className="receipt-scanner">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />

      {!scanning && !preview ? (
        <button type="button" onClick={() => fileRef.current?.click()} className="scan-btn">
          <span className="scan-icon" aria-hidden>
            📷
          </span>
          <span>Fiş / fatura tara</span>
        </button>
      ) : null}

      {scanning ? (
        <div className="scan-progress">
          <div className="scan-spinner" aria-hidden>
            ⏳
          </div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">Okunuyor… %{progress}</p>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : null}

      {preview && !scanning ? (
        <div className="scan-preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Fiş önizleme" className="receipt-img" />
          <button
            type="button"
            onClick={() => {
              setPreview(null);
              if (fileRef.current) fileRef.current.value = "";
            }}
            className="scan-again-btn"
          >
            🔄 Tekrar tara
          </button>
        </div>
      ) : null}
    </div>
  );
}
