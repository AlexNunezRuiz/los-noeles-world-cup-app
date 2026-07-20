"use client";

import { useState, useRef, useEffect, useCallback } from "react";

export interface PlayerOption {
  id: number;
  name: string;
  team?: string;
  teamFlag?: string;
}

export interface PlayerComboboxProps {
  options: PlayerOption[];
  value: number | null;
  onChange: (id: number) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function PlayerCombobox({
  options,
  value,
  onChange,
  disabled = false,
  placeholder = "Buscar jugador…",
}: PlayerComboboxProps) {
  const [query, setQuery] = useState(() => {
    return value !== null ? (options.find((o) => o.id === value)?.name ?? "") : "";
  });
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  function normalizeSearch(value: string) {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim()
      .toLowerCase();
  }

  const selectedName = value !== null ? (options.find((o) => o.id === value)?.name ?? "") : "";
  // The outside-click listener registers once, so it reads the selected name
  // through a ref: closing over selectedName directly would freeze the value
  // from the first render and blank out selections made afterwards.
  const selectedNameRef = useRef(selectedName);
  useEffect(() => {
    selectedNameRef.current = selectedName;
  }, [selectedName]);

  // Keep query in sync when external value changes
  useEffect(() => {
    setQuery(selectedNameRef.current);
  }, [value, options]);

  // Close on tap/click outside the container
  useEffect(() => {
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        // Reset query to the currently selected value
        setQuery(selectedNameRef.current);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, []);

  const filtered =
    query.trim() === ""
      ? options
      : options.filter((o) => {
          const q = normalizeSearch(query);
          const haystack = normalizeSearch(`${o.name} ${o.team ?? ""}`);
          return q.split(" ").every((token) => haystack.includes(token));
        });

  const handleSelect = useCallback(
    (option: PlayerOption) => {
      setQuery(option.name);
      setOpen(false);
      onChange(option.id);
    },
    [onChange]
  );

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        className="flex h-11 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      />

      {open && !disabled && filtered.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 w-full overflow-y-auto rounded-md border border-border bg-surface shadow-md"
          style={{ maxHeight: "14rem", WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
        >
          {filtered.map((option) => (
            <li
              key={option.id}
              role="option"
              aria-selected={option.id === value}
              onMouseDown={(e) => {
                // Desktop: prevent input blur before click
                e.preventDefault();
              }}
              onClick={() => handleSelect(option)}
              onTouchStart={(e) => {
                const touch = e.touches[0];
                touchStartRef.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
              }}
              onTouchEnd={(e) => {
                const start = touchStartRef.current;
                touchStartRef.current = null;
                const touch = e.changedTouches[0];
                if (start && touch) {
                  const dx = Math.abs(touch.clientX - start.x);
                  const dy = Math.abs(touch.clientY - start.y);
                  if (dx > 8 || dy > 8) return;
                }
                handleSelect(option);
              }}
              className="cursor-pointer select-none px-3 py-2 text-sm text-ink hover:bg-surface-sunken"
            >
              <span className="font-medium">{option.name}</span>
              {(option.team || option.teamFlag) && (
                <span className="ml-2 text-xs text-ink-muted">
                  {option.teamFlag && <span className="mr-1">{option.teamFlag}</span>}
                  {option.team}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
