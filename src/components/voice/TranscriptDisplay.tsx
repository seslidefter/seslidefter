import { cn } from "@/lib/utils";

interface TranscriptDisplayProps {
  finalText: string;
  interimText: string;
  className?: string;
}

export function TranscriptDisplay({
  finalText,
  interimText,
  className,
}: TranscriptDisplayProps) {
  return (
    <div
      className={cn(
        "min-h-[140px] rounded-2xl border border-black/[0.06] bg-[var(--sd-bg)] p-4 font-mono text-base leading-relaxed text-[var(--sd-text)] shadow-inner",
        className
      )}
    >
      {finalText ? <span>{finalText}</span> : null}
      {interimText ? (
        <span className="text-black/45 italic">{interimText}</span>
      ) : null}
      {!finalText && !interimText ? (
        <span className="text-black/40">Konuşmaya başlayın…</span>
      ) : null}
    </div>
  );
}
