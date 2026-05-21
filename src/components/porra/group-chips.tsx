"use client";

import { cn } from "@/lib/utils";

const GROUPS = ["A","B","C","D","E","F","G","H","I","J","K","L"];

interface GroupChipsProps {
  current: string;
  done: string[];
  onSelect: (g: string) => void;
}

export function GroupChips({ current, done, onSelect }: GroupChipsProps) {
  return (
    <div className="flex gap-1.5 overflow-x-auto px-1 py-1">
      {GROUPS.map((g) => {
        const isDone = done.includes(g);
        const isCur = g === current;
        return (
          <button
            key={g}
            type="button"
            onClick={() => onSelect(g)}
            className={cn(
              "relative h-7 w-7 shrink-0 rounded-md border font-marcador text-sm font-bold",
              isCur
                ? "border-ink bg-ink text-cream"
                : isDone
                ? "border-green/40 bg-surface text-green"
                : "border-border bg-surface text-ink-faint"
            )}
          >
            {g}
            {isDone && !isCur && (
              <span className="absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center rounded-full bg-green text-[7px] text-white">
                ✓
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
