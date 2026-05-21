"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface FlapTileProps {
  value: number | null;
  size?: "sm" | "md" | "lg";
  focused?: boolean;
  className?: string;
}

const SIZES: Record<NonNullable<FlapTileProps["size"]>, { w: string; h: string; text: string }> = {
  sm: { w: "w-9", h: "h-11", text: "text-2xl" },
  md: { w: "w-11", h: "h-14", text: "text-3xl" },
  lg: { w: "w-[68px]", h: "h-[86px]", text: "text-6xl" },
};

const label = (v: number | null) => (v === null ? "·" : String(v));

/**
 * Split-flap scoreboard tile. When `value` changes it animates like a real
 * mechanical flip board: the old digit's upper half folds down over the seam
 * and the new digit's lower half unfolds into place.
 */
export function FlapTile({ value, size = "md", focused, className }: FlapTileProps) {
  const [shown, setShown] = useState<number | null>(value);
  const [prev, setPrev] = useState<number | null>(value);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (value === shown) return;
    setPrev(shown);
    setShown(value);
    setAnimating(true);
    const timer = window.setTimeout(() => setAnimating(false), 380);
    return () => window.clearTimeout(timer);
  }, [value, shown]);

  const s = SIZES[size];
  const next = label(shown);
  const old = label(prev);

  return (
    <span
      className={cn(
        "relative inline-block select-none rounded-md [perspective:240px]",
        "shadow-[0_4px_9px_-4px_rgba(0,0,0,0.55)]",
        s.w,
        s.h,
        focused && "ring-2 ring-red",
        className
      )}
    >
      {/* static faces — the resting state */}
      <Half pos="top" digit={next} text={s.text} />
      <Half pos="bottom" digit={animating ? old : next} text={s.text} />

      {/* animated flaps — only mounted during a flip */}
      {animating && (
        <>
          <Half pos="top" digit={old} text={s.text} className="z-10 origin-bottom animate-flap-top" />
          <Half pos="bottom" digit={next} text={s.text} className="z-10 origin-top animate-flap-bottom" />
        </>
      )}

      {/* horizontal seam of the board */}
      <span className="pointer-events-none absolute inset-x-0 top-1/2 z-20 h-[2px] -translate-y-px bg-black/55" />
    </span>
  );
}

function Half({
  pos,
  digit,
  text,
  className,
}: {
  pos: "top" | "bottom";
  digit: string;
  text: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "absolute inset-x-0 h-1/2 overflow-hidden [backface-visibility:hidden]",
        pos === "top"
          ? "top-0 rounded-t-md bg-gradient-to-b from-flap-top to-[#201e18]"
          : "bottom-0 rounded-b-md bg-gradient-to-b from-[#1c1a14] to-flap-bottom",
        className
      )}
    >
      <span
        className={cn(
          "absolute inset-x-0 flex h-[200%] items-center justify-center font-marcador font-bold leading-none",
          digit === "·" ? "text-flap-ink/40" : "text-flap-ink",
          text,
          pos === "top" ? "top-0" : "bottom-0"
        )}
      >
        {digit}
      </span>
    </span>
  );
}
