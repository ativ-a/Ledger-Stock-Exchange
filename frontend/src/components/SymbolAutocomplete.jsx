import React, { useEffect, useRef, useState } from "react";
import { api } from "../api";

// Controlled symbol input with a debounced /api/search dropdown. Callers own `value` — this
// component only adds suggestions on top and calls onSelect when one is chosen (click, Enter,
// or Tab). Plain Enter with nothing highlighted just calls onSubmit, same as a normal form.
export default function SymbolAutocomplete({
  value,
  onChange,
  onSelect,
  onSubmit,
  placeholder,
  className,
  autoFocus,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const containerRef = useRef(null);
  const requestId = useRef(0);
  const suppressNextFetch = useRef(false);

  useEffect(() => {
    if (suppressNextFetch.current) {
      // Value just changed because a suggestion was picked, not typed — don't reopen the
      // dropdown with a fresh search for the symbol the user just selected.
      suppressNextFetch.current = false;
      setSuggestions([]);
      setOpen(false);
      return;
    }
    const query = value.trim();
    if (query.length < 1) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    const id = ++requestId.current;
    const timer = setTimeout(() => {
      api
        .search(query)
        .then((results) => {
          if (requestId.current !== id) return; // a newer keystroke already superseded this
          setSuggestions(results.slice(0, 8));
          setOpen(true);
          setHighlight(-1);
        })
        .catch(() => {
          if (requestId.current !== id) return;
          setSuggestions([]);
        });
    }, 200);
    return () => clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function pick(s) {
    setOpen(false);
    setSuggestions([]);
    suppressNextFetch.current = true;
    onSelect(s.symbol);
  }

  function handleKeyDown(e) {
    if (open && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlight((h) => (h + 1) % suggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlight((h) => (h <= 0 ? suggestions.length - 1 : h - 1));
        return;
      }
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key === "Enter" && highlight >= 0) {
        e.preventDefault();
        pick(suggestions[highlight]);
        return;
      }
    }
    if (e.key === "Enter") {
      e.preventDefault();
      setOpen(false);
      onSubmit?.();
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        className={className}
        autoFocus={autoFocus}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full min-w-[240px] bg-panel border border-border rounded-md shadow-lg overflow-hidden">
          {suggestions.map((s, i) => (
            <li key={s.symbol}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(s)}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-left text-sm ${
                  i === highlight ? "bg-panel2 text-ink" : "text-muted hover:bg-panel2 hover:text-ink"
                }`}
              >
                <span className="font-display font-600 mono-num text-ink">{s.symbol}</span>
                <span className="truncate text-xs">{s.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
