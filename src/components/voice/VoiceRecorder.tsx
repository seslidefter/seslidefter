"use client";

import { Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { WaveAnimation } from "@/components/voice/WaveAnimation";

interface VoiceRecorderProps {
  active: boolean;
  waveLevels: number[];
  onToggle: () => void;
  disabled?: boolean;
}

export function VoiceRecorder({ active, waveLevels, onToggle, disabled }: VoiceRecorderProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className={cn(
          "flex w-full max-w-xs flex-col items-center justify-center rounded-3xl px-6 py-5 transition-all duration-200",
          active ? "sd-gradient sd-rec-pulse" : "bg-[var(--sd-bg)]"
        )}
      >
        <WaveAnimation levels={waveLevels} active={active} />
      </div>
      <Button
        type="button"
        variant={active ? "danger" : "primary"}
        onClick={onToggle}
        disabled={disabled}
        className={cn(
          "!h-20 !w-20 !min-h-0 !max-h-20 !max-w-20 rounded-full !p-0 shadow-xl transition-all duration-200",
          active && "sd-rec-pulse",
          !active && "border-0 sd-gradient"
        )}
        aria-pressed={active}
      >
        {active ? <Square className="h-8 w-8" /> : <Mic className="h-9 w-9" />}
      </Button>
      <p className="text-center text-sm font-semibold text-black/50">
        {active ? "Dinleniyor — durdurmak için dokun" : "Başlatmak için dokun"}
      </p>
    </div>
  );
}
