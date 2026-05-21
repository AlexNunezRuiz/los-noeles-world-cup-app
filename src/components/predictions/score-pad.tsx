"use client";

import { X } from "lucide-react";

interface ScorePadProps {
  open: boolean;
  teamName: string;
  flag: React.ReactNode;
  onDigit: (n: number) => void;
  onClose: () => void;
}

export function ScorePad({ open, teamName, flag, onDigit, onClose }: ScorePadProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-50">
      <div className="mx-auto max-w-[680px] rounded-t-2xl bg-ink p-3 pb-4 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.6)]">
        <div className="mb-2 flex items-center gap-2">
          <span className="flex items-center">{flag}</span>
          <span className="font-sans text-[11px] font-bold text-cream">
            Goles de <span className="text-red">{teamName}</span>
          </span>
          <button
            onClick={onClose}
            className="ml-auto text-ink-faint hover:text-cream"
            aria-label="Cerrar teclado"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {Array.from({ length: 10 }, (_, n) => (
            <button
              key={n}
              onClick={() => onDigit(n)}
              className="h-9 rounded-md bg-[#2c2b26] font-marcador text-lg font-bold text-cream transition-colors active:bg-red"
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
