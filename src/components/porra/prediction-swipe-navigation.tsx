"use client";

import { useRef, type PointerEvent, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  getAdjacentPredictionStage,
  getSwipeDirection,
} from "@/lib/predictions/swipe-navigation";

const INTERACTIVE_SELECTOR =
  'a, button, input, textarea, select, [role="button"], [role="combobox"], [data-swipe-ignore="true"]';

function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(INTERACTIVE_SELECTOR) !== null;
}

export function PredictionSwipeNavigation({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const start = useRef<{ x: number; y: number; pointerId: number } | null>(null);

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" || window.innerWidth >= 768) return;
    if (isInteractiveTarget(event.target)) return;

    start.current = {
      x: event.clientX,
      y: event.clientY,
      pointerId: event.pointerId,
    };
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    const swipeStart = start.current;
    start.current = null;

    if (!swipeStart || swipeStart.pointerId !== event.pointerId) return;

    const direction = getSwipeDirection({
      deltaX: event.clientX - swipeStart.x,
      deltaY: event.clientY - swipeStart.y,
    });
    if (!direction) return;

    const href = getAdjacentPredictionStage(pathname, direction);
    if (href) router.push(href);
  }

  function handlePointerCancel() {
    start.current = null;
  }

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      {children}
    </div>
  );
}
