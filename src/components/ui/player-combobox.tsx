"use client";

import { useState, useRef, useEffect, useCallback } from "react";

export interface PlayerOption {
  id: number;
  name: string;
  team?: string;
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

  // Keep query in sync when external value changes
  useEffect(() => {
    const name = value !== null ? (options.find((o) => o.id === value)?.name ?? "") : "";
    setQuery(name);
  }, [value, options]);

  // Close on tap/click outside the container
  useEffect(() => {
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        // Reset query to the currently selected value
        const name = value !== null ? (options.find((o) => o.id === value)?.name ?? "") : "";
        setQuery(name);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
    // value/options intentionally omitted: stale closure is acceptable here,
    // the useEffect above keeps query in sync after any external value change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered =
    query.trim() === ""
      ? options
      : options.filter((o) => o.name.toLowerCase().includes(query.toLowerCase()));

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
          style={{ maxHeight: "14rem" }}
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
              onTouchEnd={(e) => {
                // Mobile: handle selection on touchend and prevent synthetic click
                e.preventDefault();
                handleSelect(option);
              }}
              className="cursor-pointer select-none px-3 py-2 text-sm text-ink hover:bg-surface-sunken"
            >
              <span className="font-medium">{option.name}</span>
              {option.team && (
                <span className="ml-2 text-xs text-ink-muted">{option.team}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
