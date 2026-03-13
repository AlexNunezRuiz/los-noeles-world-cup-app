"use client";

import { cn } from "@/lib/utils";

// Convert flag emoji to Twemoji URL
// Flag emojis are composed of two regional indicator symbols
// Each regional indicator is U+1F1E6 to U+1F1FF (A to Z)
function emojiToTwemojiUrl(emoji: string): string | null {
  const codePoints: string[] = [];
  for (let i = 0; i < emoji.length; i++) {
    const codePoint = emoji.codePointAt(i);
    if (codePoint === undefined) continue;
    codePoints.push(codePoint.toString(16));
    // Skip surrogate pair
    if (codePoint > 0xffff) i++;
  }
  if (codePoints.length === 0) return null;
  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${codePoints.join("-")}.svg`;
}

interface FlagProps {
  emoji: string;
  className?: string;
  size?: number;
}

export function Flag({ emoji, className, size = 24 }: FlagProps) {
  if (!emoji) return null;

  const url = emojiToTwemojiUrl(emoji);
  if (!url) return <span>{emoji}</span>;

  return (
    <img
      src={url}
      alt={emoji}
      width={size}
      height={size}
      className={cn("inline-block", className)}
      loading="lazy"
    />
  );
}
