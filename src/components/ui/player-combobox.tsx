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
  const selectedOption = value !== null ? options.find((o) => o.id === value) ?? null : null;

  const [query, setQuery] = useState(selectedOption?.name ?? "");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep input text in sync when the external value changes
  useEffect(() => {
    const name = value !== null ? (options.find((o) => o.id === value)?.name ?? "") : "";
    setQuery(name);
  }, [value, options]);

  const filtered =
    query.trim() === ""
      ? options
      : options.filter((o) => o.name.toLowerCase().includes(query.toLowerCase()));

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(e.target.value);
      setOpen(true);
    },
    []
  );

  const handleSelect = useCallback(
    (option: PlayerOption) => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      setQuery(option.name);
      setOpen(false);
      onChange(option.id);
    },
    [onChange]
  );

  const handleFocus = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setOpen(true);
  }, []);

  const handleBlur = useCallback(() => {
    // Small delay so that a click on an option fires before we close
    closeTimerRef.current = setTimeout(() => {
      setOpen(false);
      // If the current query doesn't match the selected value, reset it
      const name =
        value !== null ? (options.find((o) => o.id === value)?.name ?? "") : "";
      setQuery(name);
    }, 150);
  }, [value, options]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        className="flex h-11 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      />

      {open && !disabled && filtered.length > 0 && (
        <ul
          ref={listRef}
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
                e.preventDefault();
              }}
              onTouchStart={(e) => {
                e.preventDefault();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                handleSelect(option);
              }}
              onClick={() => handleSelect(option)}
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
