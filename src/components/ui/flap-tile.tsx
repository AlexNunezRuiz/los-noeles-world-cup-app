"use client";

import { cn } from "@/lib/utils";

interface FlapTileProps {
  value: number | null;
  size?: "sm" | "md" | "lg";
  focused?: boolean;
  className?: string;
}

const SIZES = {
  sm: "w-9 h-11 text-2xl",
  md: "w-11 h-14 text-3xl",
  lg: "w-[68px] h-[86px] text-6xl",
};

export function FlapTile({ value, size = "md", focused, className }: FlapTileProps) {
  return (
    <span
      key={value} /* re-mount on change → flip animation */
      className={cn(
        "relative inline-flex items-center justify-center rounded-md font-marcador font-bold animate-flip",
        "bg-gradient-to-b from-flap-top to-flap-bottom",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_4px_9px_-4px_rgba(0,0,0,0.55)]",
        value === null ? "text-flap-ink/35" : "text-flap-ink",
        focused && "ring-2 ring-red ring-offset-0",
        SIZES[size],
        className
      )}
      style={{ transformStyle: "preserve-3d" }}
    >
      {/* costura horizontal del tablero */}
      <span className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 bg-black/60" />
      {value === null ? "·" : value}
    </span>
  );
}
